import { useState } from 'react';
import { useClaudeStore } from '../stores/claudeStore';
import { McpTool } from '@shared/types';

const ToolItem = ({ tool }: { tool: McpTool }): JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const properties = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const propEntries = Object.entries(properties);

  return (
    <div className="border-b border-gray-800/50 last:border-b-0">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`text-[10px] text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        <span className="text-xs text-gray-200 font-mono">{tool.name}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {tool.description && (
            <div className="text-xs text-gray-400">{tool.description}</div>
          )}
          {propEntries.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Parameters</div>
              {propEntries.map(([name, prop]) => (
                <div key={name} className="flex items-start gap-2 pl-2">
                  <span className="text-xs font-mono text-blue-400">{name}</span>
                  <span className="text-[10px] text-gray-600">{prop.type}</span>
                  {required.includes(name) && (
                    <span className="text-[10px] text-red-400">required</span>
                  )}
                  {prop.description && (
                    <span className="text-[10px] text-gray-500 flex-1">{prop.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {propEntries.length === 0 && (
            <div className="text-[10px] text-gray-600">No parameters</div>
          )}
        </div>
      )}
    </div>
  );
};

export const McpServerModal = (): JSX.Element | null => {
  const { selectedMcpServer, setSelectedMcpServer } = useClaudeStore();
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedMcpServer) return null;

  const handleBackdrop = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      setSelectedMcpServer(null);
      setTools(null);
      setError(null);
    }
  };

  const handleClose = (): void => {
    setSelectedMcpServer(null);
    setTools(null);
    setError(null);
  };

  const handleListTools = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setTools(null);
    try {
      const result = await window.api.mcpListTools(
        selectedMcpServer.command,
        selectedMcpServer.args,
        selectedMcpServer.env,
      );
      if (result.length === 0) {
        setError('No tools returned (server may not support tools/list or failed to start)');
      } else {
        setTools(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to MCP server');
    } finally {
      setLoading(false);
    }
  };

  const envEntries = Object.entries(selectedMcpServer.env);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdrop}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[560px] max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm font-mono">mcp</span>
            <span className="text-sm text-white font-medium">{selectedMcpServer.name}</span>
          </div>
          <button
            className="text-gray-500 hover:text-gray-300 text-lg leading-none"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Command</div>
            <div className="bg-gray-800 rounded px-3 py-2 font-mono text-xs text-gray-300 break-all">
              {selectedMcpServer.command} {selectedMcpServer.args.join(' ')}
            </div>
          </div>

          {envEntries.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Environment</div>
              <div className="bg-gray-800 rounded px-3 py-2 space-y-1">
                {envEntries.map(([key, val]) => (
                  <div key={key} className="font-mono text-xs">
                    <span className="text-blue-400">{key}</span>
                    <span className="text-gray-600">=</span>
                    <span className="text-gray-300">{val.length > 40 ? val.slice(0, 40) + '...' : val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                Tools {tools && <span className="text-gray-600">({tools.length})</span>}
              </div>
              <button
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  loading
                    ? 'bg-gray-700 text-gray-400 cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                onClick={handleListTools}
                disabled={loading}
              >
                {loading ? 'Connecting...' : tools ? 'Refresh Tools' : 'List Tools'}
              </button>
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}
            {tools && tools.length > 0 && (
              <div className="bg-gray-800 rounded overflow-hidden">
                {tools.map((tool) => (
                  <ToolItem key={tool.name} tool={tool} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
