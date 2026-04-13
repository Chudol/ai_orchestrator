import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TrackedRepoInfo, GitStatusResult } from '@shared/types';
import { useAppStore, useActiveTrackedRepos } from '../stores/appStore';

interface RepoRowProps {
  repo: TrackedRepoInfo;
}

const RepoRow = ({ repo }: RepoRowProps): JSX.Element => {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const refreshBranches = useAppStore((s) => s.refreshTrackedRepoBranches);

  useEffect(() => {
    if (!branchesOpen) return;
    const close = (e: MouseEvent): void => {
      if ((e.target as HTMLElement).closest('.branch-dropdown')) return;
      setBranchesOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [branchesOpen]);

  const handleCheckStatus = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    setStatusLoading(true);
    try {
      const result = await window.api.getGitStatus(repo.path);
      setStatus(result);
      setTimeout(() => setStatus(null), 5000);
    } catch {
      setStatus({ dirty: false, staged: 0, unstaged: 0, untracked: 0 });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenBranches = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (branchesOpen) {
      setBranchesOpen(false);
      return;
    }
    const list = await window.api.getGitBranches(repo.path);
    setBranches(list);
    setBranchesOpen(true);
  };

  const handleCheckout = async (branch: string): Promise<void> => {
    try {
      await window.api.gitCheckout(repo.path, branch);
      setBranchesOpen(false);
      refreshBranches();
    } catch {
      // checkout failed
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 text-[10px]">
        <button
          className="text-txt-3 hover:text-yellow-400 transition-colors p-0.5 rounded"
          onClick={handleCheckStatus}
          title="Check changes"
        >
          {statusLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </button>
        <button
          className="text-txt-3 hover:text-accent-blue transition-colors p-0.5 rounded branch-dropdown"
          onClick={handleOpenBranches}
          title="Switch branch"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
          </svg>
        </button>
        <span className="text-txt-3/70">{repo.folderName}</span>
        <span className="text-accent-blue font-mono font-medium">{repo.branch ?? '???'}</span>
        {status && (
          <span className={`font-mono ${status.dirty ? 'text-yellow-400' : 'text-green-400'}`}>
            {status.dirty
              ? `${status.staged}S ${status.unstaged}M ${status.untracked}U`
              : 'clean'}
          </span>
        )}
      </div>
      {branchesOpen && branches && (
        <div className="branch-dropdown absolute left-0 top-full mt-1 glass rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto min-w-[140px]">
          {branches.map((b) => (
            <button
              key={b}
              className={`block w-full text-left px-3 py-1.5 text-[10px] hover:bg-surface-2/50 transition-colors ${
                b === repo.branch ? 'text-accent-blue font-medium' : 'text-txt-2'
              }`}
              onClick={() => handleCheckout(b)}
            >
              {b === repo.branch ? `* ${b}` : b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TerminalView = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const claudeId = useAppStore((s) => activeSessionId ? s.sessionClaudeIds.get(activeSessionId) ?? null : null);
  const trackedRepos = useActiveTrackedRepos();
  const refreshBranches = useAppStore((s) => s.refreshTrackedRepoBranches);
  const [reposVisible, setReposVisible] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const prevSessionIdRef = useRef<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files') && activeSessionId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, [activeSessionId]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const sessionId = prevSessionIdRef.current;
    if (!sessionId || !e.dataTransfer.files.length) return;

    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as File & { path: string }).path)
      .filter(Boolean)
      .map((p) => (p.includes(' ') ? `"${p}"` : p));

    if (paths.length > 0) {
      window.api.sendInput(sessionId, paths.join(' '));
    }
  }, []);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#080c16',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        cursorAccent: '#080c16',
        selectionBackground: 'rgba(88, 166, 255, 0.18)',
        selectionForeground: '#ffffff',
        black: '#1c2333',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#e6edf3',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (containerRef.current) {
      terminal.open(containerRef.current);
      requestAnimationFrame(() => fitAddon.fit());
    }

    let customKeyHandled = false;

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const sessionId = prevSessionIdRef.current;
      if (!sessionId) return true;

      if (event.key === 'Enter' && event.shiftKey) {
        customKeyHandled = true;
        window.api.sendInput(sessionId, '\x1b\r');
        return false;
      }

      if (event.key === 'Backspace' && event.metaKey) {
        customKeyHandled = true;
        window.api.sendInput(sessionId, '\x15');
        return false;
      }

      return true;
    });

    terminal.onData((data) => {
      if (customKeyHandled) {
        customKeyHandled = false;
        return;
      }
      const sessionId = prevSessionIdRef.current;
      if (sessionId) {
        window.api.sendInput(sessionId, data);
      }
    });

    const handleResize = (): void => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const prev = prevSessionIdRef.current;

    if (prev && prev !== activeSessionId) {
      window.api.detachSession(prev);
    }

    prevSessionIdRef.current = activeSessionId;

    if (!activeSessionId) {
      terminal.clear();
      return;
    }

    terminal.clear();
    terminal.reset();

    let cancelled = false;

    const attach = async (): Promise<void> => {
      const buffer = await window.api.attachSession(activeSessionId);
      if (cancelled) return;
      for (const chunk of buffer) {
        terminal.write(chunk);
      }
      fitAddonRef.current?.fit();
      terminal.scrollToBottom();
      requestAnimationFrame(() => {
        terminal.scrollToBottom();
        terminal.focus();
        setTimeout(() => terminal.scrollToBottom(), 100);
      });
    };

    attach();

    const unsubOutput = window.api.onSessionOutput((sessionId, data) => {
      if (sessionId === activeSessionId && !cancelled) {
        const isNearBottom = terminal.buffer.active.baseY + terminal.rows >= terminal.buffer.active.length - 5;
        terminal.write(data);
        if (isNearBottom) {
          terminal.scrollToBottom();
        }
      }
    });

    const unsubExit = window.api.onSessionExit((sessionId) => {
      if (sessionId === activeSessionId && !cancelled) {
        terminal.write('\r\n\x1b[90m--- Session ended ---\x1b[0m\r\n');
      }
    });

    return () => {
      cancelled = true;
      unsubOutput();
      unsubExit();
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || trackedRepos.length === 0) return;
    const interval = setInterval(() => refreshBranches(), 30000);
    return () => clearInterval(interval);
  }, [activeSessionId, trackedRepos.length, refreshBranches]);

  return (
    <div
      className="w-full h-full overflow-hidden relative bg-[#080c16]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div ref={containerRef} className={`w-full h-full p-2 ${!activeSessionId ? 'hidden' : ''}`} />
      {isDragOver && (
        <div className="absolute inset-0 bg-accent-blue/10 border-2 border-dashed border-accent-blue/40 rounded-lg flex items-center justify-center z-20 pointer-events-none">
          <span className="text-accent-blue text-sm font-medium">Drop file to paste path</span>
        </div>
      )}
      {activeSessionId && (
        <div className="absolute top-2 right-3 text-[10px] font-mono z-10 flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1">
            {trackedRepos.length > 0 && (
              <button
                className="glass px-1.5 py-0.5 rounded text-txt-3 hover:text-txt-2 transition-colors"
                onClick={() => setReposVisible(!reposVisible)}
                title={reposVisible ? 'Hide repos' : 'Show repos'}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" className={`transition-transform ${reposVisible ? 'rotate-90' : ''}`}>
                  <path d="M3 1l5 4-5 4V1z" fill="currentColor" />
                </svg>
              </button>
            )}
            <div className="glass select-all px-2 py-0.5 rounded-md text-txt-3">
              {claudeId ?? 'detecting...'}
            </div>
          </div>
          {reposVisible && trackedRepos.length > 0 && (
            <div className="glass px-2.5 py-2 rounded-lg space-y-1.5">
              {trackedRepos.map((repo) => (
                <RepoRow key={repo.path} repo={repo} />
              ))}
            </div>
          )}
        </div>
      )}
      {!activeSessionId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-txt-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="opacity-10 mb-4">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <p className="text-sm opacity-40">Select a session to start</p>
        </div>
      )}
    </div>
  );
};
