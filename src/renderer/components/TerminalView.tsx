import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../stores/appStore';

export const TerminalView = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
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
    };

    attach();

    const unsubOutput = window.api.onSessionOutput((sessionId, data) => {
      if (sessionId === activeSessionId && !cancelled) {
        terminal.write(data);
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

  return (
    <div className="w-full h-full overflow-hidden relative bg-[#1a1a2e]">
      <div ref={containerRef} className={`w-full h-full p-2 ${!activeSessionId ? 'hidden' : ''}`} />
      {!activeSessionId && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <p>Select a session to start</p>
        </div>
      )}
    </div>
  );
};
