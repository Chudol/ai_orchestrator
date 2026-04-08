import { useState, useEffect, useCallback, useRef } from 'react';
import { useClaudeStore } from '../stores/claudeStore';
import { useActiveProjectPath } from '../stores/appStore';
import { SkillInfo, AgentInfo, McpServerConfig } from '@shared/types';
import { ClaudeFileViewer } from './ClaudeFileViewer';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, count, defaultOpen = true, children }: CollapsibleSectionProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-800/50 bg-gray-800/30"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}>
            &#9654;
          </span>
          <span className="text-sm text-gray-300 font-medium">{title}</span>
          <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{count}</span>
        </div>
      </div>
      {!collapsed && <div className="border-t border-gray-800">{children}</div>}
    </div>
  );
};

const SkillItem = ({ skill }: { skill: SkillInfo }): JSX.Element => {
  const { openFile } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
      onClick={() => openFile(skill.filePath, skill.name)}
    >
      <span className="text-xs text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded font-mono">skill</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200">{skill.name}</div>
        {skill.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{skill.description}</div>
        )}
      </div>
    </div>
  );
};

const AgentItem = ({ agent }: { agent: AgentInfo }): JSX.Element => {
  const { openFile } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
      onClick={() => openFile(agent.filePath, agent.name)}
    >
      <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded font-mono">agent</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200">{agent.name}</div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {agent.model && <span className="text-gray-400">{agent.model}</span>}
          {agent.model && agent.description && <span> &middot; </span>}
          {agent.description}
        </div>
      </div>
    </div>
  );
};

const McpServerItem = ({ server }: { server: McpServerConfig }): JSX.Element => {
  const { setSelectedMcpServer } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
      onClick={() => setSelectedMcpServer(server)}
    >
      <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded font-mono">mcp</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200">{server.name}</div>
        <div className="text-xs text-gray-500 truncate mt-0.5 font-mono">
          {server.command} {server.args.join(' ')}
        </div>
      </div>
    </div>
  );
};

export const ClaudePanel = (): JSX.Element => {
  const { skills, agents, mcpServers, loading, loadClaudeData, openFiles } = useClaudeStore();
  const projectPath = useActiveProjectPath();
  const contentRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);

  const projectSkills = skills.filter((s) => !s.isGlobal);
  const globalSkills = skills.filter((s) => s.isGlobal);
  const hasFiles = openFiles.length > 0;

  useEffect(() => {
    loadClaudeData(projectPath);
  }, [projectPath, loadClaudeData]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent): void => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
    };
    const handleMouseUp = (): void => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <div ref={contentRef} className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      <div
        className="overflow-y-auto p-6"
        style={hasFiles ? { height: `${splitRatio * 100}%` } : { flex: 1 }}
      >
        {loading ? (
          <div className="text-sm text-gray-500 text-center py-12">Loading...</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 font-medium">Claude Configuration</span>
              <button
                className="text-gray-500 hover:text-gray-300 text-sm px-2 py-0.5 rounded hover:bg-gray-800"
                onClick={() => loadClaudeData(projectPath)}
                title="Refresh"
              >
                &#8635; Refresh
              </button>
            </div>

            <CollapsibleSection title="Project Skills" count={projectSkills.length}>
              {projectSkills.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-600 text-center">No project skills</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {projectSkills.map((s) => <SkillItem key={s.filePath} skill={s} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Global Skills" count={globalSkills.length} defaultOpen={false}>
              {globalSkills.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-600 text-center">No global skills</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {globalSkills.map((s) => <SkillItem key={s.filePath} skill={s} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Agents" count={agents.length}>
              {agents.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-600 text-center">No agents in this project</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {agents.map((a) => <AgentItem key={a.filePath} agent={a} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="MCP Servers" count={mcpServers.length}>
              {mcpServers.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-600 text-center">No MCP servers configured</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {mcpServers.map((s) => <McpServerItem key={s.name} server={s} />)}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
      </div>
      {hasFiles && (
        <>
          <div
            className="h-1 bg-gray-700 hover:bg-blue-500 cursor-row-resize flex-shrink-0 transition-colors"
            onMouseDown={handleMouseDown}
          />
          <div className="overflow-hidden flex flex-col" style={{ height: `${(1 - splitRatio) * 100}%` }}>
            <ClaudeFileViewer />
          </div>
        </>
      )}
    </div>
  );
};
