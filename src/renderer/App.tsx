import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, useActiveOpenFiles } from './stores/appStore';
import { Sidebar } from './components/Sidebar';
import { TerminalView } from './components/TerminalView';
import { FileBrowser } from './components/FileBrowser';
import { FileViewer } from './components/FileViewer';

export const App = (): JSX.Element => {
  const { loadProjects, updateSessionStatus, updateSessionState } = useAppStore();
  const fileBrowserOpen = useAppStore((s) => s.fileBrowserOpen);
  const toggleFileBrowser = useAppStore((s) => s.toggleFileBrowser);
  const openFiles = useActiveOpenFiles();

  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();

    const unsubExit = window.api.onSessionExit((sessionId) => {
      updateSessionStatus(sessionId, 'stopped');
      updateSessionState(sessionId, { state: 'stopped', since: Date.now() });
    });

    const unsubState = window.api.onSessionStateUpdate((sessionId, info) => {
      updateSessionState(sessionId, info);
    });

    return () => {
      unsubExit();
      unsubState();
    };
  }, [loadProjects, updateSessionStatus, updateSessionState]);

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

  // Dispatch resize event when split changes so xterm refits
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [splitRatio, openFiles.length]);

  const hasFiles = openFiles.length > 0;

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
        <span className="text-gray-400 text-sm font-medium flex-1 text-center">Orchestrator</span>
        <div className="w-16" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {fileBrowserOpen && <FileBrowser />}
        <div ref={contentRef} className="flex flex-col flex-1 overflow-hidden">
          <div
            className="overflow-hidden"
            style={hasFiles ? { height: `${splitRatio * 100}%` } : { flex: 1 }}
          >
            <TerminalView />
          </div>
          {hasFiles && (
            <>
              <div
                className="h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize flex-shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
              />
              <div className="overflow-hidden flex flex-col" style={{ height: `${(1 - splitRatio) * 100}%` }}>
                <FileViewer />
              </div>
            </>
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
};
