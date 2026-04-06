import * as pty from 'node-pty';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import { SessionInternalState, SessionStateInfo } from '@shared/types';
import { updateSessionStatus, updateSessionClaudeId } from './store';
import * as os from 'os';

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

const CLAUDE_SESSIONS_DIR = path.join(os.homedir(), '.claude', 'sessions');

const findClaudeSessionId = (pid: number, sessionId: string): void => {
  // Claude Code writes session files as ~/.claude/sessions/{PID}.json
  // Poll for it since it takes a moment after spawn
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const sessionFile = path.join(CLAUDE_SESSIONS_DIR, `${pid}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      if (data.sessionId) {
        updateSessionClaudeId(sessionId, data.sessionId);
        clearInterval(interval);
      }
    } catch {
      if (attempts > 30) clearInterval(interval); // give up after 30s
    }
  }, 1000);
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
}

const activeSessions = new Map<string, ManagedSession>();

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

const broadcastState = (sessionId: string, info: SessionStateInfo): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.SESSIONS_STATE_UPDATE, sessionId, info);
  }
};

export const createPtySession = (
  sessionId: string,
  cwd: string,
  sessionName: string = 'unnamed',
  claudeSessionId: string | null = null,
): void => {
  if (DEBUG_PTY) {
    if (!fs.existsSync(debugLogDir)) {
      fs.mkdirSync(debugLogDir, { recursive: true });
    }
  }
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
  const claudeCmd = claudeSessionId ? `claude --resume ${claudeSessionId}` : 'claude';
  const shellArgs = process.platform === 'win32' ? ['/c', claudeCmd] : ['-l', '-c', claudeCmd];
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
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

    // Extract window title from OSC sequences: \x1b]0;title\x07 or \x1b]0;title\x1b\\
    const titleMatches = processed.match(/\x1b\]0;([^\x07\x1b]*)/g);
    if (titleMatches) {
      const lastTitle = titleMatches[titleMatches.length - 1].replace(/\x1b\]0;/, '');
      managed.windowTitle = lastTitle;
      let newState = detectStateFromTitle(lastTitle);

      // After "done" or "ready", suppress spinner-based "thinking"
      // Claude Code sends residual spinner titles after finishing
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

      if (newState !== managed.currentState) {
        managed.currentState = newState;
        managed.stateSince = Date.now();
        broadcastState(sessionId, { state: newState, since: managed.stateSince });
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

  // Discover claude session ID from PID for future resume
  if (!claudeSessionId) {
    findClaudeSessionId(ptyProcess.pid, sessionId);
  }
};

export const stopSession = (sessionId: string): void => {
  const managed = activeSessions.get(sessionId);
  if (managed) {
    managed.ptyProcess.kill();
    activeSessions.delete(sessionId);
    updateSessionStatus(sessionId, 'stopped');
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

export const cleanupAllSessions = (): void => {
  for (const [, managed] of activeSessions) {
    managed.ptyProcess.kill();
  }
  activeSessions.clear();
};
