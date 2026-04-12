import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';
import { useCallback } from 'react';
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
  const { closeFile, setActiveFile, closeTerminalTab, setActiveBottomTab, createTerminalTab, splitTerminal, closeTerminalPane, updateFileContent, saveFile } = useAppStore();
  const openFiles = useActiveOpenFiles();
  const activeFilePath = useActiveFilePath();
  const terminals = useActiveTerminals();
  const activeBottomTab = useAppStore((s) => s.activeBottomTab);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const path = useAppStore.getState().activeBottomTab;
        if (path?.type === 'file') {
          saveFile(path.path);
        }
      });
    },
    [saveFile],
  );

  const showFile = activeBottomTab?.type === 'file';
  const showTerminal = activeBottomTab?.type === 'terminal';
  const activeTerminalId = showTerminal ? activeBottomTab.id : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="flex items-center bg-surface-1/80 border-b border-border overflow-x-auto flex-shrink-0">
        {openFiles.map((file) => (
          <div
            key={`file-${file.path}`}
            className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-border-subtle/50 flex-shrink-0 transition-all ${
              showFile && activeFilePath === file.path
                ? 'tab-bottom-active text-txt-1'
                : 'text-txt-3 hover:text-txt-2 hover:bg-surface-2/30'
            }`}
            onClick={() => {
              setActiveFile(file.path);
              setActiveBottomTab({ type: 'file', path: file.path });
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue/70 flex-shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate max-w-[120px] text-[11px] font-medium">
              {file.dirty ? `${file.name} \u2022` : file.name}
            </span>
            <button
              className="opacity-0 group-hover:opacity-100 text-txt-3 hover:text-red-400 ml-0.5 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        {terminals.map((term) => (
          <div
            key={`term-${term.id}`}
            className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-border-subtle/50 flex-shrink-0 transition-all ${
              showTerminal && activeTerminalId === term.id
                ? 'tab-bottom-active text-txt-1'
                : 'text-txt-3 hover:text-txt-2 hover:bg-surface-2/30'
            }`}
            onClick={() => setActiveBottomTab({ type: 'terminal', id: term.id })}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400/70 flex-shrink-0">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="truncate max-w-[120px] text-[11px] font-medium">{term.name}</span>
            <button
              className="opacity-0 group-hover:opacity-100 text-txt-3 hover:text-red-400 ml-0.5 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                closeTerminalTab(term.id);
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
        <button
          className="px-2.5 py-1.5 text-[11px] text-txt-3 hover:text-accent-blue flex-shrink-0 transition-colors flex items-center gap-1"
          onClick={createTerminalTab}
          title="New terminal"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Term
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-surface-0">
        {showFile && activeFile && (
          <Editor
            theme="vs-dark"
            language={getLanguage(activeFile.name)}
            value={activeFile.content}
            path={activeFile.path}
            onChange={(value) => {
              if (value !== undefined) updateFileContent(activeFile.path, value);
            }}
            onMount={handleEditorMount}
            options={{
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
          <div className="flex items-center justify-center h-full text-txt-3 text-sm">
            <span className="opacity-40">No tab selected</span>
          </div>
        )}
      </div>
    </div>
  );
};
