import { useState, useEffect, useRef, useCallback } from 'react';
import { FileEntry } from '@shared/types';
import { useAppStore, useActiveProjectPath } from '../stores/appStore';

interface QuickOpenProps {
  onClose: () => void;
}

export const QuickOpen = ({ onClose }: QuickOpenProps): JSX.Element => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filtered, setFiltered] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const projectPath = useActiveProjectPath();
  const { openFile } = useAppStore();

  useEffect(() => {
    if (!projectPath) return;
    setLoading(true);
    window.api.readDirectoryRecursive(projectPath).then((entries) => {
      setFiles(entries);
      setFiltered(entries.slice(0, 50));
      setLoading(false);
    });
  }, [projectPath]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!query.trim()) {
        setFiltered(files.slice(0, 50));
        setSelectedIndex(0);
        return;
      }
      const lower = query.toLowerCase();
      const parts = lower.split(/\s+/);
      const results = files
        .filter((f) => parts.every((p) => f.name.toLowerCase().includes(p)))
        .slice(0, 50);
      setFiltered(results);
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timeout);
  }, [query, files]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((file: FileEntry) => {
    const fileName = file.name.split('/').pop() ?? file.name;
    openFile(file.path, fileName);
    onClose();
  }, [openFile, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex]);
    }
  }, [filtered, selectedIndex, handleSelect, onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const backdropRef = useRef<HTMLDivElement>(null);
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-center pt-[12%] modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="modal-card rounded-2xl w-[520px] overflow-hidden flex flex-col max-h-[420px]">
        {/* Search */}
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3 flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="w-full bg-transparent text-txt-1 text-sm outline-none placeholder-txt-3"
            placeholder="Search files by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="px-5 py-6 text-txt-3 text-sm text-center animate-pulse">Indexing files...</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-6 text-txt-3 text-sm text-center">No files found</div>
          ) : (
            filtered.map((file, i) => {
              const parts = file.name.split('/');
              const fileName = parts.pop() ?? '';
              const dirPath = parts.join('/');
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-2.5 px-5 py-2 cursor-pointer text-[13px] transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600/15 to-purple-600/10 text-txt-1'
                      : 'text-txt-2 hover:bg-surface-2/30'
                  }`}
                  onClick={() => handleSelect(file)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isSelected ? 'text-accent-blue' : 'text-txt-3/40'}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className={`flex-shrink-0 font-medium ${isSelected ? 'text-accent-blue' : ''}`}>{fileName}</span>
                  {dirPath && (
                    <span className={`text-[11px] truncate ${isSelected ? 'text-txt-3' : 'text-txt-3/60'}`}>
                      {dirPath}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2 border-t border-border-subtle/50 flex items-center gap-3 text-[10px] text-txt-3/60">
          <span><kbd className="bg-surface-3/50 px-1 py-0.5 rounded text-[9px]">↑↓</kbd> navigate</span>
          <span><kbd className="bg-surface-3/50 px-1 py-0.5 rounded text-[9px]">↵</kbd> open</span>
          <span><kbd className="bg-surface-3/50 px-1 py-0.5 rounded text-[9px]">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
