import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalPane } from '@shared/types';
import { useCommandsStore } from '../stores/commandsStore';

interface TerminalPaneViewProps {
  paneId: string;
  onSplit: () => void;
  onClose: () => void;
  showClose: boolean;
}

const TerminalPaneView = ({ paneId, onSplit, onClose, showClose }: TerminalPaneViewProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#080c16',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: 'rgba(88, 166, 255, 0.2)',
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
      requestAnimationFrame(() => {
        fitAddon.fit();
        window.api.terminalResize(paneId, terminal.cols, terminal.rows);
      });
    }

    terminal.onData((data) => {
      window.api.terminalInput(paneId, data);
    });

    const handleResize = (): void => {
      fitAddon.fit();
      window.api.terminalResize(paneId, terminal.cols, terminal.rows);
    };
    window.addEventListener('resize', handleResize);

    // Observe container size changes with debounce
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddon.fit();
        window.api.terminalResize(paneId, terminal.cols, terminal.rows);
      }, 50);
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    let cancelled = false;

    const attach = async (): Promise<void> => {
      const buffer = await window.api.attachTerminal(paneId);
      if (cancelled) return;
      for (const chunk of buffer) {
        terminal.write(chunk);
      }
      fitAddon.fit();
      window.api.terminalResize(paneId, terminal.cols, terminal.rows);
    };
    attach();

    const unsubOutput = window.api.onTerminalOutput((id, data) => {
      if (id === paneId && !cancelled) {
        terminal.write(data);
      }
    });

    const unsubExit = window.api.onTerminalExit((id) => {
      if (id === paneId && !cancelled) {
        terminal.write('\r\n\x1b[90m--- Terminal exited ---\x1b[0m\r\n');
      }
    });

    return () => {
      cancelled = true;
      if (resizeTimeout) clearTimeout(resizeTimeout);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.api.detachTerminal(paneId);
      unsubOutput();
      unsubExit();
      terminal.dispose();
    };
  }, [paneId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (): void => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-command')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const command = e.dataTransfer.getData('application/x-command');
    if (command) {
      useCommandsStore.getState().requestExecution(command, paneId);
    }
  }, [paneId]);

  return (
    <div
      className="flex-1 relative min-w-0 h-full"
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div ref={containerRef} className="w-full h-full" />
      {isDragOver && (
        <div className="absolute inset-0 bg-accent-blue/10 border-2 border-accent-blue/50 rounded pointer-events-none z-10 flex items-center justify-center">
          <span className="text-accent-blue text-xs font-medium">Drop command here</span>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed glass rounded-xl shadow-xl py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
            onClick={() => {
              onSplit();
              setContextMenu(null);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            Split Right
          </button>
          {showClose && (
            <button
              className="w-full px-4 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
              onClick={() => {
                onClose();
                setContextMenu(null);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close Pane
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface PaneDividerProps {
  onDrag: (deltaX: number) => void;
}

const PaneDivider = ({ onDrag }: PaneDividerProps): JSX.Element => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    let lastX = e.clientX;

    const handleMouseMove = (ev: MouseEvent): void => {
      const delta = ev.clientX - lastX;
      lastX = ev.clientX;
      onDrag(delta);
    };

    const handleMouseUp = (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [onDrag]);

  return (
    <div
      className="w-[3px] bg-border cursor-col-resize flex-shrink-0 transition-all divider-v"
      onMouseDown={handleMouseDown}
    />
  );
};

interface TerminalTabProps {
  terminalTabId: string;
  panes: TerminalPane[];
  onSplit: () => void;
  onClosePane: (paneId: string) => void;
}

export const TerminalTab = ({ terminalTabId, panes, onSplit, onClosePane }: TerminalTabProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<number[]>([]);

  // Initialize equal widths when panes change
  useEffect(() => {
    setWidths(panes.map(() => 1 / panes.length));
  }, [panes.length]);

  const handleDrag = useCallback((index: number, deltaX: number) => {
    if (!containerRef.current) return;
    const totalWidth = containerRef.current.offsetWidth;
    const deltaPct = deltaX / totalWidth;

    setWidths((prev) => {
      const next = [...prev];
      const minWidth = 0.1;
      next[index] = Math.max(minWidth, next[index] + deltaPct);
      next[index + 1] = Math.max(minWidth, next[index + 1] - deltaPct);
      return next;
    });
  }, []);

  if (widths.length !== panes.length) return <div className="w-full h-full" />;

  return (
    <div ref={containerRef} className="flex w-full h-full">
      {panes.map((pane, i) => (
        <div key={pane.id} className="flex h-full" style={{ width: `${widths[i] * 100}%` }}>
          {i > 0 && <PaneDivider onDrag={(delta) => handleDrag(i - 1, delta)} />}
          <TerminalPaneView
            paneId={pane.id}
            onSplit={onSplit}
            onClose={() => onClosePane(pane.id)}
            showClose={panes.length > 1}
          />
        </div>
      ))}
    </div>
  );
};
