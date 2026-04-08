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
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
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
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-400 rounded pointer-events-none z-10 flex items-center justify-center">
          <span className="text-blue-300 text-sm font-medium">Drop to execute</span>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
            onClick={() => {
              onSplit();
              setContextMenu(null);
            }}
          >
            Split Right
          </button>
          {showClose && (
            <button
              className="w-full px-4 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
              onClick={() => {
                onClose();
                setContextMenu(null);
              }}
            >
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
      className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
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
