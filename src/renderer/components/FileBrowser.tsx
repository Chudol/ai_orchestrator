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
        className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-gray-800 text-sm text-gray-300 whitespace-nowrap"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {entry.isDirectory ? (
          <span className="text-gray-500 w-4 text-center text-xs">
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span className={entry.isDirectory ? 'text-gray-200' : 'text-gray-400'}>
          {entry.name}
        </span>
      </div>
      {expanded && children.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} />
      ))}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
            onClick={() => {
              if (isTracked) {
                untrackRepo(entry.path);
              } else {
                trackRepo(entry.path);
              }
              setContextMenu(null);
            }}
          >
            {isTracked ? 'Untrack' : 'Track this repository'}
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
    <div className="w-[250px] bg-gray-900 border-r border-gray-700 flex flex-col h-full flex-shrink-0">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase">Files</span>
        <button
          className="text-gray-500 hover:text-gray-300 text-xs"
          onClick={loadRoot}
          title="Refresh"
        >
          ↻
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
        {!projectPath ? (
          <div className="text-xs text-gray-500 text-center py-4">No active session</div>
        ) : rootEntries.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">Empty</div>
        ) : (
          rootEntries.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
};
