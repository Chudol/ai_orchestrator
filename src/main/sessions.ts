import * as pty from 'node-pty';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import { SessionInternalState, SessionStateInfo } from '@shared/types';
import { updateSessionStatus, updateSessionClaudeId } from './store';

// Debug: log raw PTY output to file per session
const DEBUG_PTY = true;
const debugLogDir = path.join(app.getPath('userData'), 'debug-logs');

const getDebugLogPath = (sessionName: string): string => {
  const safeName = sessionName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(debugLogDir, `${safeName}.log`);
};

const deleteDebugLog = (sessionName: string): void => {
  try {
    fs.unlinkSync(getDebugLogPath(sessionName));
  } catch { /* ignore if doesn't exist */ }
};

import * as os from 'os';

const CLAUDE_SESSIONS_DIR = path.join(os.homedir(), '.claude', 'sessions');

// Regex to detect "claude --resume {ID}" in terminal output (UUID or slug)
const RESUME_ID_REGEX = /claude --resume ([\w-]+)/;

// Try to find claude session ID by name from ~/.claude/sessions/
const findClaudeSessionByName = (name: string, cwd: string): string | null => {
  try {
    const files = fs.readdirSync(CLAUDE_SESSIONS_DIR);
    let best: { id: string; startedAt: number } | null = null;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CLAUDE_SESSIONS_DIR, file), 'utf-8'));
        if (data.name === name && data.cwd === cwd && data.sessionId) {
          if (!best || data.startedAt > best.startedAt) {
            best = { id: data.name || data.sessionId, startedAt: data.startedAt };
          }
        }
      } catch { /* skip */ }
    }
    return best?.id ?? null;
  } catch {
    return null;
  }
};

// Find claude session ID by scanning ~/.claude/sessions/ for newest match by cwd
const findClaudeSessionByCwd = (cwd: string, sessionId: string, startedAfter: number): void => {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    try {
      const files = fs.readdirSync(CLAUDE_SESSIONS_DIR);
      let best: { claudeId: string; startedAt: number } | null = null;
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(CLAUDE_SESSIONS_DIR, file), 'utf-8'));
          if (data.cwd === cwd && data.startedAt >= startedAfter && data.sessionId) {
            if (!best || data.startedAt > best.startedAt) {
              // Use name for resume if available (works as resume ID), otherwise UUID
              const resumeId = data.name || data.sessionId;
              best = { claudeId: resumeId, startedAt: data.startedAt };
            }
          }
        } catch { /* skip */ }
      }
      if (best) {
        updateSessionClaudeId(sessionId, best.claudeId);
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(IPC_CHANNELS.SESSIONS_CLAUDE_ID, sessionId, best.claudeId);
        }
        clearInterval(interval);
      }
    } catch { /* ignore */ }
    if (attempts > 30) clearInterval(interval);
  }, 2000);
};

const MAX_BUFFER_LINES = 10000;

interface ManagedSession {
  ptyProcess: pty.IPty;
  buffer: string[];
  attachedWindows: Set<number>;
  sessionName: string;
  currentState: SessionInternalState;
  stateSince: number;
  windowTitle: string;
  doneAt: number;
  lastDetectedClaudeId: string;
}

const OSC_777_NOTIFY_REGEX = /\x1b\]777;notify;Claude Code;([^\x07\x1b]+)/g;

const activeSessions = new Map<string, ManagedSession>();

const stripAnsi = (str: string): string => {
  return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\x1b\][^\x07]*(\x07|\x1b\\)/g, '');
};

const detectStateFromTitle = (title: string): SessionInternalState => {
  // Claude Code sets window title to indicate state:
  // "project: ready"           -> idle
  // "project: working"         -> working
  // "● project: needs approval" -> waiting_for_approval
  // "● project: done"          -> idle
  // "⠂ task description"       -> thinking (spinner)
  // "⠐ task description"       -> thinking (spinner)
  // "✳ task description"       -> thinking (spinner)

  if (title.includes('needs approval')) {
    return 'waiting_for_approval';
  }
  if (title.includes(': working')) {
    return 'working';
  }
  if (title.includes(': ready') || title.includes(': done')) {
    return 'idle';
  }
  // Spinner characters in title = thinking
  if (/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠂⠐✳✶✻✽✢·]/.test(title)) {
    return 'thinking';
  }
  return 'idle';
};

let _suppressStateBroadcast = false;
export const suppressStateBroadcast = (suppress: boolean): void => {
  _suppressStateBroadcast = suppress;
};

const broadcastState = (sessionId: string, info: SessionStateInfo): void => {
  if (_suppressStateBroadcast) return;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.SESSIONS_STATE_UPDATE, sessionId, info);
  }
};

export const createPtySession = (
  sessionId: string,
  cwd: string,
  sessionName: string = 'unnamed',
  claudeSessionId: string | null = null,
  extraArgs: string | null = null,
): void => {
  if (DEBUG_PTY) {
    if (!fs.existsSync(debugLogDir)) {
      fs.mkdirSync(debugLogDir, { recursive: true });
    }
  }
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
  const suffix = extraArgs ? ` ${extraArgs}` : '';
  const claudeCmd = claudeSessionId
    ? `claude --resume ${claudeSessionId}${suffix} || claude${suffix}`
    : `claude${suffix}`;
  const shellArgs = process.platform === 'win32' ? ['/c', claudeCmd] : ['-l', '-c', claudeCmd];
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: 200,
    rows: 60,
    cwd,
    env: {
      ...process.env as Record<string, string>,
      TERM_PROGRAM: 'ghostty',
      KITTY_WINDOW_ID: '1',
      COLORTERM: 'truecolor',
    },
  });

  const managed: ManagedSession = {
    ptyProcess,
    buffer: [],
    attachedWindows: new Set(),
    sessionName,
    currentState: 'idle',
    stateSince: Date.now(),
    windowTitle: '',
    doneAt: 0,
    lastDetectedClaudeId: claudeSessionId ?? '',
  };

  let outputBuffer = '';

  ptyProcess.onData((data: string) => {
    outputBuffer += data;
    let processed = outputBuffer;
    outputBuffer = '';

    if (processed.includes('\x1b[?u')) {
      ptyProcess.write('\x1b[?1u');
      processed = processed.replace(/\x1b\[\?u/g, '');
    }

    processed = processed.replace(/\x1b\[>[0-9]*u/g, '');
    processed = processed.replace(/\x1b\[<u/g, '');

    if (!processed) return;

    managed.buffer.push(processed);
    if (managed.buffer.length > MAX_BUFFER_LINES) {
      managed.buffer.splice(0, managed.buffer.length - MAX_BUFFER_LINES);
    }

    // OSC 777 notify is the authoritative lifecycle signal in newer Claude Code versions
    // (Claude Code stopped emitting ": ready"/": done"/": working" OSC 0 titles around
    // early May 2026 — only spinner titles remain, so 777 is the only "done" signal).
    // Parse first so its state wins over residual spinner OSC 0 titles emitted right after.
    const notifyMatches = [...processed.matchAll(OSC_777_NOTIFY_REGEX)];
    if (notifyMatches.length > 0) {
      const lastNotify = notifyMatches[notifyMatches.length - 1][1];
      let notifyState: SessionInternalState | null = null;
      if (lastNotify.includes('waiting for your input')) {
        notifyState = 'idle';
        managed.doneAt = Date.now();
      } else if (
        lastNotify.includes('needs your permission') ||
        lastNotify.includes('needs your approval') ||
        lastNotify.includes('needs your attention')
      ) {
        notifyState = 'waiting_for_approval';
      }
      if (notifyState && notifyState !== managed.currentState) {
        managed.currentState = notifyState;
        managed.stateSince = Date.now();
        broadcastState(sessionId, { state: notifyState, since: managed.stateSince });
      }
    }

    // Extract window title from OSC sequences: \x1b]0;title\x07 or \x1b]0;title\x1b\\
    const titleMatches = processed.match(/\x1b\]0;([^\x07\x1b]*)/g);
    if (titleMatches) {
      const lastTitle = titleMatches[titleMatches.length - 1].replace(/\x1b\]0;/, '');
      managed.windowTitle = lastTitle;
      let newState = detectStateFromTitle(lastTitle);

      // After "done" or "ready" (older Claude) OR OSC 777 idle (newer Claude),
      // suppress spinner-based "thinking" for a few seconds. Log analysis shows real
      // new activity always arrives >30s after idle, so 5s is a safe window.
      if (lastTitle.includes(': done') || lastTitle.includes(': ready')) {
        managed.doneAt = Date.now();
      }
      if (newState === 'thinking' && Date.now() - managed.doneAt < 5000) {
        newState = 'idle';
      }
      // "working" resets the suppression (new real work started)
      if (newState === 'working') {
        managed.doneAt = 0;
      }

      // When teammates are running, only working/needs_approval from OSC should override
      if (managed.currentState === 'teammates_running' && newState !== 'working' && newState !== 'waiting_for_approval') {
        newState = 'teammates_running';
      }

      if (newState !== managed.currentState) {
        managed.currentState = newState;
        managed.stateSince = Date.now();
        broadcastState(sessionId, { state: newState, since: managed.stateSince });
      }
    }

    // Detect session change from window title (e.g. after /resume inside Claude Code)
    // Spinner titles like "✳ local-online-game-modes" contain the session name
    if (titleMatches) {
      const lastTitle = titleMatches[titleMatches.length - 1].replace(/\x1b\]0;/, '');
      // Extract potential session name from spinner title (remove spinner prefix)
      const titleClean = lastTitle.replace(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⠂⠐✳✶✻✽✢·●]\s*/, '');
      if (titleClean && titleClean !== 'Claude Code' && !titleClean.includes(': ')) {
        // This might be a session name - check if it differs from current claude ID
        const currentClaudeId = managed.lastDetectedClaudeId;
        if (titleClean !== currentClaudeId) {
          // Verify by checking ~/.claude/sessions/ for a session with this name
          const found = findClaudeSessionByName(titleClean, cwd);
          if (found) {
            managed.lastDetectedClaudeId = found;
            updateSessionClaudeId(sessionId, found);
            for (const win of BrowserWindow.getAllWindows()) {
              win.webContents.send(IPC_CHANNELS.SESSIONS_CLAUDE_ID, sessionId, found);
            }
          }
        }
      }
    }

    // Content-based detection: "teammates running" appears in terminal content, not OSC title
    const stripped = stripAnsi(processed);
    if (stripped.includes('teammates running')) {
      if (managed.currentState !== 'teammates_running') {
        managed.currentState = 'teammates_running';
        managed.stateSince = Date.now();
        broadcastState(sessionId, { state: 'teammates_running', since: managed.stateSince });
      }
    }

    // Parse claude session ID from "claude --resume {ID}" in output
    const resumeMatch = stripAnsi(processed).match(RESUME_ID_REGEX);
    if (resumeMatch) {
      managed.lastDetectedClaudeId = resumeMatch[1];
      updateSessionClaudeId(sessionId, resumeMatch[1]);
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IPC_CHANNELS.SESSIONS_CLAUDE_ID, sessionId, resumeMatch[1]);
      }
    }

    if (DEBUG_PTY) {
      const escaped = processed.replace(/\x1b/g, '\\x1b').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
      fs.appendFileSync(getDebugLogPath(managed.sessionName), `[${new Date().toISOString()}] ${escaped}\n`);
    }

    for (const winId of managed.attachedWindows) {
      const win = BrowserWindow.fromId(winId);
      if (win) {
        win.webContents.send(IPC_CHANNELS.SESSIONS_OUTPUT, sessionId, processed);
      }
    }
  });

  ptyProcess.onExit(() => {
    // If this session was already replaced (restart), ignore the exit
    if (activeSessions.get(sessionId) !== managed) return;

    updateSessionStatus(sessionId, 'stopped');
    activeSessions.delete(sessionId);
    broadcastState(sessionId, { state: 'stopped', since: Date.now() });

    for (const winId of managed.attachedWindows) {
      const win = BrowserWindow.fromId(winId);
      if (win) {
        win.webContents.send(IPC_CHANNELS.SESSIONS_EXIT, sessionId);
      }
    }
  });

  activeSessions.set(sessionId, managed);

  // Detect claude session ID: broadcast known ID or find via cwd scan
  if (claudeSessionId) {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.SESSIONS_CLAUDE_ID, sessionId, claudeSessionId);
    }
  } else {
    findClaudeSessionByCwd(cwd, sessionId, Date.now() - 5000);
  }
};

export const stopSession = (sessionId: string): void => {
  const managed = activeSessions.get(sessionId);
  if (managed) {
    managed.ptyProcess.kill();
    activeSessions.delete(sessionId);
    updateSessionStatus(sessionId, 'stopped');
    updateSessionClaudeId(sessionId, '');
    broadcastState(sessionId, { state: 'stopped', since: Date.now() });
  }
};

export const deleteSessionLogs = (sessionId: string): void => {
  const managed = activeSessions.get(sessionId);
  const name = managed?.sessionName ?? sessionId;
  if (DEBUG_PTY) {
    deleteDebugLog(name);
  }
};

export const attachSession = (sessionId: string, windowId: number): string[] => {
  const managed = activeSessions.get(sessionId);
  if (!managed) {
    return [];
  }
  managed.attachedWindows.add(windowId);
  return managed.buffer;
};

export const detachSession = (sessionId: string, windowId: number): void => {
  const managed = activeSessions.get(sessionId);
  if (managed) {
    managed.attachedWindows.delete(windowId);
  }
};

export const sendInput = (sessionId: string, data: string): void => {
  const managed = activeSessions.get(sessionId);
  if (managed) {
    managed.ptyProcess.write(data);
  }
};

export const resizePtySession = (sessionId: string, cols: number, rows: number): void => {
  const managed = activeSessions.get(sessionId);
  if (!managed) return;
  if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 1 || rows < 1) return;
  try {
    managed.ptyProcess.resize(Math.floor(cols), Math.floor(rows));
  } catch { /* ignore — pty may have just exited */ }
};

export const isSessionRunning = (sessionId: string): boolean => {
  return activeSessions.has(sessionId);
};

export const respawnSession = (
  sessionId: string,
  cwd: string,
  sessionName: string = 'unnamed',
  claudeSessionId: string | null = null,
): void => {
  if (!activeSessions.has(sessionId)) {
    createPtySession(sessionId, cwd, sessionName, claudeSessionId);
    updateSessionStatus(sessionId, 'running');
  }
};

export const restartSession = (
  sessionId: string,
  cwd: string,
  sessionName: string = 'unnamed',
  claudeSessionId: string | null = null,
  extraArgs: string | null = null,
): void => {
  if (activeSessions.has(sessionId)) {
    const managed = activeSessions.get(sessionId)!;
    // Remove from map BEFORE killing so the onExit handler doesn't broadcast 'stopped'
    activeSessions.delete(sessionId);
    managed.ptyProcess.kill();
  }
  createPtySession(sessionId, cwd, sessionName, claudeSessionId, extraArgs);
  updateSessionStatus(sessionId, 'running');
};

export const cleanupAllSessions = (): void => {
  for (const [, managed] of activeSessions) {
    managed.ptyProcess.kill();
  }
  activeSessions.clear();
};
