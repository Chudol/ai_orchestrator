import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';
import { useAppStore, useActiveOpenFiles, useActiveFilePath, useActiveTerminals } from '../stores/appStore';
import { TerminalTab } from './TerminalTab';

loader.config({ monaco });

const getLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html',
    yml: 'yaml', yaml: 'yaml', py: 'python', rs: 'rust', go: 'go',
    sh: 'shell', bash: 'shell', zsh: 'shell', sql: 'sql', xml: 'xml',
    toml: 'ini', env: 'ini', gitignore: 'ini', dockerfile: 'dockerfile',
  };
  return map[ext] ?? 'plaintext';
};

export const BottomPanel = (): JSX.Element => {
  const { closeFile, setActiveFile, closeTerminalTab, setActiveBottomTab, createTerminalTab, splitTerminal, closeTerminalPane } = useAppStore();
  const openFiles = useActiveOpenFiles();
  const activeFilePath = useActiveFilePath();
  const terminals = useActiveTerminals();
  const activeBottomTab = useAppStore((s) => s.activeBottomTab);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const showFile = activeBottomTab?.type === 'file';
  const showTerminal = activeBottomTab?.type === 'terminal';
  const activeTerminalId = showTerminal ? activeBottomTab.id : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center bg-gray-950 overflow-x-auto flex-shrink-0">
        {openFiles.map((file) => (
          <div
            key={`file-${file.path}`}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-800 flex-shrink-0 ${
              showFile && activeFilePath === file.path
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
            onClick={() => {
              setActiveFile(file.path);
              setActiveBottomTab({ type: 'file', path: file.path });
            }}
          >
            <span className="text-blue-400 text-[10px]">F</span>
            <span className="truncate max-w-[120px]">{file.name}</span>
            <button
              className="text-gray-500 hover:text-red-400 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
            >
              &#x2715;
            </button>
          </div>
        ))}
        {terminals.map((term) => (
          <div
            key={`term-${term.id}`}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-800 flex-shrink-0 ${
              showTerminal && activeTerminalId === term.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
            onClick={() => setActiveBottomTab({ type: 'terminal', id: term.id })}
          >
            <span className="text-green-400 text-[10px]">T</span>
            <span className="truncate max-w-[120px]">{term.name}</span>
            <button
              className="text-gray-500 hover:text-red-400 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                closeTerminalTab(term.id);
              }}
            >
              &#x2715;
            </button>
          </div>
        ))}
        <button
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 flex-shrink-0"
          onClick={createTerminalTab}
          title="New terminal"
        >
          + Term
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {showFile && activeFile && (
          <Editor
            theme="vs-dark"
            language={getLanguage(activeFile.name)}
            value={activeFile.content}
            path={activeFile.path}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              contextmenu: false,
            }}
          />
        )}
        {showTerminal && activeTerminalId && (() => {
          const term = terminals.find((t) => t.id === activeTerminalId);
          if (!term) return null;
          return (
            <TerminalTab
              key={activeTerminalId}
              terminalTabId={activeTerminalId}
              panes={term.panes}
              onSplit={() => splitTerminal(activeTerminalId)}
              onClosePane={(paneId) => closeTerminalPane(activeTerminalId, paneId)}
            />
          );
        })()}
        {!showFile && !showTerminal && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No tab selected
          </div>
        )}
      </div>
    </div>
  );
};
