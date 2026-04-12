import { useCallback } from 'react';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';
import { useAppStore, useActiveOpenFiles, useActiveFilePath } from '../stores/appStore';

loader.config({ monaco });

const getLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html',
    yml: 'yaml', yaml: 'yaml', py: 'python', rs: 'rust', go: 'go',
    sh: 'shell', bash: 'shell', zsh: 'shell', sql: 'sql', xml: 'xml',
    toml: 'ini', env: 'ini', gitignore: 'ini', dockerfile: 'dockerfile',
    vue: 'html', svelte: 'html',
  };
  return map[ext] ?? 'plaintext';
};

export const FileViewer = (): JSX.Element => {
  const { closeFile, setActiveFile, updateFileContent, saveFile } = useAppStore();
  const openFiles = useActiveOpenFiles();
  const activeFilePath = useActiveFilePath();
  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const pf = useAppStore.getState().projectFiles;
        const sessions = useAppStore.getState().sessions;
        const activeSessionId = useAppStore.getState().activeSessionId;
        if (!activeSessionId) return;
        for (const [pid, ss] of sessions) {
          if (ss.some((s) => s.id === activeSessionId)) {
            const active = pf.get(pid)?.activeFilePath;
            if (active) saveFile(active);
            return;
          }
        }
      });
    },
    [saveFile],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center bg-surface-1/80 border-b border-border overflow-x-auto flex-shrink-0">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-[11px] cursor-pointer border-r border-border-subtle/50 flex-shrink-0 transition-all ${
              file.path === activeFilePath
                ? 'tab-bottom-active text-txt-1'
                : 'text-txt-3 hover:bg-surface-2/30 hover:text-txt-2'
            }`}
            onClick={() => setActiveFile(file.path)}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue/70 flex-shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate max-w-[150px] font-medium">
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
      </div>
      <div className="flex-1 overflow-hidden bg-surface-0">
        {activeFile ? (
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
        ) : (
          <div className="flex items-center justify-center h-full text-txt-3 text-sm opacity-40">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
};
