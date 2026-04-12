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
import { SettingsPanel } from './components/SettingsPanel';
import { useSettingsStore } from './stores/settingsStore';

const tabs = [
  { key: 'files', label: 'Files', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { key: 'commands', label: 'Commands', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'terminal', label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', action: true },
  { key: 'claude', label: 'Claude', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { key: 'git', label: 'Git', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { key: 'settings', label: 'Settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
] as const;

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
  const settingsPanelOpen = useSettingsStore((s) => s.settingsPanelOpen);
  const toggleSettingsPanel = useSettingsStore((s) => s.toggleSettingsPanel);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const openFiles = useActiveOpenFiles();
  const terminals = useActiveTerminals();

  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [peonMuted, setPeonMuted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
    loadSettings();
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
  }, [loadProjects, loadSettings, updateSessionStatus, updateSessionState, updateSessionClaudeId]);

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

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [splitRatio, hasBottom]);

  const isTabActive = (key: string): boolean => {
    switch (key) {
      case 'files': return fileBrowserOpen;
      case 'commands': return commandsPanelOpen;
      case 'claude': return claudePanelOpen;
      case 'git': return gitPanelOpen;
      case 'settings': return settingsPanelOpen;
      default: return false;
    }
  };

  const handleTabClick = (key: string): void => {
    switch (key) {
      case 'files': toggleFileBrowser(); break;
      case 'commands': toggleCommandsPanel(); break;
      case 'terminal': createTerminalTab(); break;
      case 'claude': toggleClaudePanel(); break;
      case 'git': toggleGitPanel(); break;
      case 'settings': toggleSettingsPanel(); break;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-0">
      {/* Titlebar */}
      <div className="titlebar flex items-center h-11 bg-surface-0 border-b border-border px-4 flex-shrink-0">
        <div className="w-[72px]" />

        {/* Tab buttons */}
        <div className="flex items-center gap-0.5 bg-surface-1 rounded-lg p-0.5 border border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all duration-150 ${
                isTabActive(tab.key)
                  ? 'tab-active text-txt-1'
                  : 'text-txt-3 hover:text-txt-2 hover:bg-surface-2/50'
              }`}
              onClick={() => handleTabClick(tab.key)}
              title={tab.key === 'terminal' ? 'New terminal' : `Toggle ${tab.label}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <span className="gradient-text text-xs font-bold tracking-wider uppercase flex-1 text-center">
          Orchestrator
        </span>

        {/* Sound toggle */}
        <button
          className={`text-xs px-2 py-1 rounded-md transition-all ${
            peonMuted
              ? 'text-red-400 bg-red-500/10 border border-red-500/20'
              : 'text-txt-3 hover:text-txt-2 hover:bg-surface-2/50'
          }`}
          onClick={async () => {
            const muted = await window.api.peonToggleMute();
            setPeonMuted(muted);
          }}
          title={peonMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {peonMuted ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </>
            )}
          </svg>
        </button>
        <div className="w-4" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {fileBrowserOpen && !claudePanelOpen && !gitPanelOpen && !settingsPanelOpen && <FileBrowser />}
        {commandsPanelOpen && !claudePanelOpen && !gitPanelOpen && !settingsPanelOpen && <CommandsPanel />}
        {settingsPanelOpen ? (
          <SettingsPanel />
        ) : claudePanelOpen ? (
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
                  className="h-[3px] divider-h cursor-row-resize flex-shrink-0 transition-all"
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
