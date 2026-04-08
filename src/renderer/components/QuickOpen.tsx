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

  // Load all files on mount
  useEffect(() => {
    if (!projectPath) return;
    setLoading(true);
    window.api.readDirectoryRecursive(projectPath).then((entries) => {
      setFiles(entries);
      setFiltered(entries.slice(0, 50));
      setLoading(false);
    });
  }, [projectPath]);

  // Filter on query change with debounce
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

  // Scroll selected item into view
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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  const backdropRef = useRef<HTMLDivElement>(null);
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex justify-center pt-[15%]"
      onClick={handleBackdropClick}
    >
      <div className="w-[600px] max-h-[400px] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-700">
          <input
            ref={inputRef}
            className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-500"
            placeholder="Search files by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-gray-500 text-sm text-center">Loading files...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-gray-500 text-sm text-center">No files found</div>
          ) : (
            filtered.map((file, i) => {
              const parts = file.name.split('/');
              const fileName = parts.pop() ?? '';
              const dirPath = parts.join('/');
              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm ${
                    i === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => handleSelect(file)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="text-white flex-shrink-0">{fileName}</span>
                  {dirPath && (
                    <span className={`text-xs truncate ${i === selectedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                      {dirPath}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
