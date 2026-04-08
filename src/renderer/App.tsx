import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, useActiveOpenFiles, useActiveTerminals } from './stores/appStore';
import { Sidebar } from './components/Sidebar';
import { TerminalView } from './components/TerminalView';
import { FileBrowser } from './components/FileBrowser';
import { CommandsPanel } from './components/CommandsPanel';
import { BottomPanel } from './components/BottomPanel';
import { QuickOpen } from './components/QuickOpen';
import { CommandVariablesModal } from './components/CommandVariablesModal';
import { useCommandsStore } from './stores/commandsStore';
import { useClaudeStore } from './stores/claudeStore';
import { useGitStore } from './stores/gitStore';
import { ClaudePanel } from './components/ClaudePanel';
import { GitPanel } from './components/GitPanel';
import { McpServerModal } from './components/McpServerModal';

export const App = (): JSX.Element => {
  const { loadProjects, updateSessionStatus, updateSessionState, updateSessionClaudeId } = useAppStore();
  const fileBrowserOpen = useAppStore((s) => s.fileBrowserOpen);
  const toggleFileBrowser = useAppStore((s) => s.toggleFileBrowser);
  const createTerminalTab = useAppStore((s) => s.createTerminalTab);
  const commandsPanelOpen = useCommandsStore((s) => s.commandsPanelOpen);
  const toggleCommandsPanel = useCommandsStore((s) => s.toggleCommandsPanel);
  const claudePanelOpen = useClaudeStore((s) => s.claudePanelOpen);
  const toggleClaudePanel = useClaudeStore((s) => s.toggleClaudePanel);
  const gitPanelOpen = useGitStore((s) => s.gitPanelOpen);
  const toggleGitPanel = useGitStore((s) => s.toggleGitPanel);
  const openFiles = useActiveOpenFiles();
  const terminals = useActiveTerminals();

  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [peonMuted, setPeonMuted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
    window.api.peonIsMuted().then(setPeonMuted);

    const unsubExit = window.api.onSessionExit((sessionId) => {
      updateSessionStatus(sessionId, 'stopped');
      updateSessionState(sessionId, { state: 'stopped', since: Date.now() });
    });

    const unsubState = window.api.onSessionStateUpdate((sessionId, info) => {
      updateSessionState(sessionId, info);
    });

    const unsubClaudeId = window.api.onSessionClaudeId((sessionId, claudeId) => {
      updateSessionClaudeId(sessionId, claudeId);
    });

    return () => {
      unsubExit();
      unsubState();
      unsubClaudeId();
    };
  }, [loadProjects, updateSessionStatus, updateSessionState, updateSessionClaudeId]);

  // Cmd+P shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setQuickOpenVisible((v) => !v);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent): void => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const hasBottom = openFiles.length > 0 || terminals.length > 0;

  // Dispatch resize event when split changes so xterm refits
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [splitRatio, hasBottom]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900">
      <div className="titlebar flex items-center h-10 bg-gray-950 border-b border-gray-800 px-4 flex-shrink-0">
        <div className="w-16" />
        <button
          className={`text-sm px-2 py-0.5 rounded ${
            fileBrowserOpen ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={toggleFileBrowser}
          title="Toggle file browser"
        >
          Files
        </button>
        <button
          className={`text-sm px-2 py-0.5 rounded ml-2 ${
            commandsPanelOpen ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={toggleCommandsPanel}
          title="Toggle commands panel"
        >
          Commands
        </button>
        <button
          className="text-sm px-2 py-0.5 rounded text-gray-500 hover:text-gray-300 ml-2"
          onClick={createTerminalTab}
          title="New terminal"
        >
          Terminal
        </button>
        <button
          className={`text-sm px-2 py-0.5 rounded ml-2 ${
            claudePanelOpen ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={toggleClaudePanel}
          title="Toggle Claude panel"
        >
          Claude
        </button>
        <button
          className={`text-sm px-2 py-0.5 rounded ml-2 ${
            gitPanelOpen ? 'text-white bg-gray-700' : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={toggleGitPanel}
          title="Toggle Git panel"
        >
          Git
        </button>
        <span className="text-gray-400 text-sm font-medium flex-1 text-center">Orchestrator</span>
        <button
          className={`text-sm px-2 py-0.5 rounded ${peonMuted ? 'text-red-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={async () => {
            const muted = await window.api.peonToggleMute();
            setPeonMuted(muted);
          }}
          title={peonMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {peonMuted ? '🔇' : '🔊'}
        </button>
        <div className="w-16" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {fileBrowserOpen && !claudePanelOpen && !gitPanelOpen && <FileBrowser />}
        {commandsPanelOpen && !claudePanelOpen && !gitPanelOpen && <CommandsPanel />}
        {claudePanelOpen ? (
          <ClaudePanel />
        ) : gitPanelOpen ? (
          <GitPanel />
        ) : (
          <div ref={contentRef} className="flex flex-col flex-1 overflow-hidden">
            <div
              className="overflow-hidden"
              style={hasBottom ? { height: `${splitRatio * 100}%` } : { flex: 1 }}
            >
              <TerminalView />
            </div>
            {hasBottom && (
              <>
                <div
                  className="h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize flex-shrink-0 transition-colors"
                  onMouseDown={handleMouseDown}
                />
                <div className="overflow-hidden flex flex-col" style={{ height: `${(1 - splitRatio) * 100}%` }}>
                  <BottomPanel />
                </div>
              </>
            )}
          </div>
        )}
        <Sidebar />
      </div>
      {quickOpenVisible && <QuickOpen onClose={() => setQuickOpenVisible(false)} />}
      <CommandVariablesModal />
      <McpServerModal />
    </div>
  );
};
