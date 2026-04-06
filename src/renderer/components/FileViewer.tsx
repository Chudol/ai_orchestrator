import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';
import { useAppStore, useActiveOpenFiles, useActiveFilePath } from '../stores/appStore';

// Use local monaco-editor instead of CDN (required for Electron)
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
  const { closeFile, setActiveFile } = useAppStore();
  const openFiles = useActiveOpenFiles();
  const activeFilePath = useActiveFilePath();
  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center bg-gray-950 overflow-x-auto flex-shrink-0">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-800 flex-shrink-0 ${
              file.path === activeFilePath
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
            onClick={() => setActiveFile(file.path)}
          >
            <span className="truncate max-w-[150px]">{file.name}</span>
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
      </div>
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
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
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
};
