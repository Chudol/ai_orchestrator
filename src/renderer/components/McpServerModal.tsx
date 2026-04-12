import { useState } from 'react';
import { useClaudeStore } from '../stores/claudeStore';
import { McpTool } from '@shared/types';

const ToolItem = ({ tool }: { tool: McpTool }): JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const properties = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const propEntries = Object.entries(properties);

  return (
    <div className="section-card overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-surface-2/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          className={`text-txt-3 transition-transform duration-150 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M3 1l5 4-5 4V1z" fill="currentColor" />
        </svg>
        <span className="text-[13px] text-accent-blue font-mono font-medium">{tool.name}</span>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-border-subtle/30">
          {tool.description && (
            <div className="text-[12px] text-txt-3 mt-2.5 leading-relaxed">{tool.description}</div>
          )}
          {propEntries.length > 0 && (
            <div className="space-y-2 mt-2">
              <div className="text-[9px] text-txt-3 uppercase tracking-[0.15em] font-bold">Parameters</div>
              {propEntries.map(([name, prop]) => (
                <div key={name} className="flex items-start gap-2 pl-2 py-0.5">
                  <span className="text-[11px] font-mono text-accent-blue font-medium">{name}</span>
                  <span className="text-[10px] text-txt-3 bg-surface-3/40 px-1.5 py-0.5 rounded">{prop.type}</span>
                  {required.includes(name) && (
                    <span className="text-[9px] text-red-400 font-medium">required</span>
                  )}
                  {prop.description && (
                    <span className="text-[10px] text-txt-3 flex-1">{prop.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {propEntries.length === 0 && (
            <div className="text-[11px] text-txt-3 mt-2 italic">No parameters</div>
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
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={handleBackdrop}
    >
      <div className="modal-card rounded-2xl w-[580px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/15 flex items-center justify-center">
              <span className="text-green-400 text-[10px] font-bold">MCP</span>
            </div>
            <span className="text-txt-1 font-semibold">{selectedMcpServer.name}</span>
          </div>
          <button
            className="text-txt-3 hover:text-txt-1 p-1 rounded-lg hover:bg-surface-3/50 transition-all"
            onClick={handleClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <div className="text-[9px] text-txt-3 uppercase tracking-[0.15em] font-bold mb-2">Command</div>
            <div className="bg-surface-0/50 border border-border-subtle rounded-xl px-4 py-3 font-mono text-[12px] text-txt-2 break-all">
              {selectedMcpServer.command} {selectedMcpServer.args.join(' ')}
            </div>
          </div>

          {envEntries.length > 0 && (
            <div>
              <div className="text-[9px] text-txt-3 uppercase tracking-[0.15em] font-bold mb-2">Environment</div>
              <div className="bg-surface-0/50 border border-border-subtle rounded-xl px-4 py-3 space-y-1.5">
                {envEntries.map(([key, val]) => (
                  <div key={key} className="font-mono text-[11px]">
                    <span className="text-accent-blue">{key}</span>
                    <span className="text-txt-3 mx-1">=</span>
                    <span className="text-txt-2">{val.length > 40 ? val.slice(0, 40) + '...' : val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] text-txt-3 uppercase tracking-[0.15em] font-bold">
                Tools {tools && <span className="text-txt-3/60">({tools.length})</span>}
              </div>
              <button
                className={`text-xs px-4 py-1.5 rounded-lg transition-all font-medium ${
                  loading
                    ? 'bg-surface-3 text-txt-3 cursor-wait'
                    : 'btn-primary text-white'
                }`}
                onClick={handleListTools}
                disabled={loading}
              >
                {loading ? 'Connecting...' : tools ? 'Refresh' : 'List Tools'}
              </button>
            </div>
            {error && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-[12px] text-red-400">
                {error}
              </div>
            )}
            {tools && tools.length > 0 && (
              <div className="space-y-2">
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
