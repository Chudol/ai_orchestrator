import { useState, useEffect, useCallback } from 'react';
import { FileEntry } from '@shared/types';
import { useAppStore, useActiveProjectPath } from '../stores/appStore';

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
}

const TreeNode = ({ entry, depth }: TreeNodeProps): JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { openFile, trackRepo, untrackRepo } = useAppStore();
  const isTracked = useAppStore((s) => {
    if (!s.activeSessionId) return false;
    const repos = s.trackedRepos.get(s.activeSessionId);
    return repos?.some((r) => r.path === entry.path) ?? false;
  });

  useEffect(() => {
    if (!contextMenu) return;
    const close = (): void => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const handleClick = async (): Promise<void> => {
    if (entry.isDirectory) {
      if (!loaded) {
        const entries = await window.api.readDirectory(entry.path);
        setChildren(entries);
        setLoaded(true);
      }
      setExpanded(!expanded);
    } else {
      openFile(entry.path, entry.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent): void => {
    if (!entry.isDirectory) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-[3px] cursor-pointer hover:bg-surface-2/30 transition-colors text-[12px] whitespace-nowrap rounded-sm ${
          isTracked ? 'text-accent-blue' : ''
        }`}
        style={{ paddingLeft: `${depth * 14 + 10}px`, paddingRight: '8px' }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {entry.isDirectory ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`text-txt-3 transition-transform duration-100 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3 1l5 4-5 4V1z" fill="currentColor" />
          </svg>
        ) : (
          <span className="w-[10px]" />
        )}
        {entry.isDirectory ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-3/60 flex-shrink-0">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-3/40 flex-shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        )}
        <span className={`truncate ${entry.isDirectory ? 'text-txt-2 font-medium' : 'text-txt-2/80'}`}>
          {entry.name}
        </span>
      </div>
      {expanded && children.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} />
      ))}
      {contextMenu && (
        <div
          className="fixed glass rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
            onClick={() => {
              if (isTracked) {
                untrackRepo(entry.path);
              } else {
                trackRepo(entry.path);
              }
              setContextMenu(null);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
              <circle cx="12" cy="12" r="3" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
            </svg>
            {isTracked ? 'Untrack repository' : 'Track as git repo'}
          </button>
        </div>
      )}
    </>
  );
};

export const FileBrowser = (): JSX.Element => {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const projectPath = useActiveProjectPath();

  const loadRoot = useCallback(async () => {
    if (!projectPath) {
      setRootEntries([]);
      return;
    }
    const entries = await window.api.readDirectory(projectPath);
    setRootEntries(entries);
  }, [projectPath]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  return (
    <div className="w-[240px] panel-bg border-r border-border flex flex-col h-full flex-shrink-0">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-bold text-txt-3 uppercase tracking-[0.15em]">Files</span>
        <button
          className="text-txt-3 hover:text-accent-blue p-0.5 rounded transition-colors"
          onClick={loadRoot}
          title="Refresh"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 105.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {!projectPath ? (
          <div className="flex flex-col items-center py-8 text-txt-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20 mb-2">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-[10px]">No active session</span>
          </div>
        ) : rootEntries.length === 0 ? (
          <div className="text-[10px] text-txt-3 text-center py-6">Empty directory</div>
        ) : (
          rootEntries.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
};
