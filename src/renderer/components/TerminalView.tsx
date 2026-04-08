import { useEffect, useRef, useState } from 'react';
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
      // checkout failed (dirty tree etc.)
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          className="text-gray-500 hover:text-yellow-400 transition-colors"
          onClick={handleCheckStatus}
          title="Check changes"
        >
          {statusLoading ? '...' : '?'}
        </button>
        <button
          className="text-gray-500 hover:text-blue-400 transition-colors branch-dropdown"
          onClick={handleOpenBranches}
          title="Switch branch"
        >
          &#8645;
        </button>
        <span className="text-gray-500">{repo.folderName}:</span>
        <span className="text-gray-400">{repo.branch ?? '???'}</span>
        {status && (
          <span className={status.dirty ? 'text-yellow-400' : 'text-green-400'}>
            {status.dirty
              ? `${status.staged}S ${status.unstaged}M ${status.untracked}U`
              : 'clean'}
          </span>
        )}
      </div>
      {branchesOpen && branches && (
        <div className="branch-dropdown absolute left-0 top-full mt-0.5 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 max-h-48 overflow-y-auto min-w-[140px]">
          {branches.map((b) => (
            <button
              key={b}
              className={`block w-full text-left px-2 py-0.5 text-[10px] hover:bg-gray-700 ${
                b === repo.branch ? 'text-blue-400' : 'text-gray-300'
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
  const prevSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (containerRef.current) {
      terminal.open(containerRef.current);
      // Delay fit to let layout settle
      requestAnimationFrame(() => fitAddon.fit());
    }

    let customKeyHandled = false;

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const sessionId = prevSessionIdRef.current;
      if (!sessionId) return true;

      // Shift+Enter -> newline (same as Option+Enter)
      if (event.key === 'Enter' && event.shiftKey) {
        customKeyHandled = true;
        window.api.sendInput(sessionId, '\x1b\r');
        return false;
      }

      // Cmd+Backspace -> clear line (Ctrl+U)
      if (event.key === 'Backspace' && event.metaKey) {
        customKeyHandled = true;
        window.api.sendInput(sessionId, '\x15');
        return false;
      }

      return true;
    });

    terminal.onData((data) => {
      // Skip if handled by custom key handler above
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
      // Multiple delays to ensure scroll sticks after xterm finishes rendering
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
        // Auto-scroll if user is near bottom (within 5 rows)
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
    <div className="w-full h-full overflow-hidden relative bg-[#1a1a2e]">
      <div ref={containerRef} className={`w-full h-full p-2 ${!activeSessionId ? 'hidden' : ''}`} />
      {activeSessionId && (
        <div className="absolute top-1 right-2 text-[10px] text-gray-500 font-mono z-10 flex flex-col items-end gap-1 pointer-events-auto">
          <div className="flex items-center gap-1">
            {trackedRepos.length > 0 && (
              <button
                className="bg-[#1a1a2e]/90 hover:bg-gray-700 px-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() => setReposVisible(!reposVisible)}
                title={reposVisible ? 'Hide repos' : 'Show repos'}
              >
                {reposVisible ? '▾' : '▸'}
              </button>
            )}
            <div className="select-all bg-[#1a1a2e]/90 px-1 rounded">
              {claudeId ?? 'detecting...'}
            </div>
          </div>
          {reposVisible && trackedRepos.length > 0 && (
            <div className="bg-[#1a1a2e]/90 px-1.5 py-1 rounded">
              {trackedRepos.map((repo) => (
                <RepoRow key={repo.path} repo={repo} />
              ))}
            </div>
          )}
        </div>
      )}
      {!activeSessionId && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <p>Select a session to start</p>
        </div>
      )}
    </div>
  );
};
