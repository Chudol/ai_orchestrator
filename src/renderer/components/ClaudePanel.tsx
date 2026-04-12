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
  icon: React.ReactNode;
}

const CollapsibleSection = ({ title, count, defaultOpen = true, children, icon }: CollapsibleSectionProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className="section-card overflow-hidden transition-all">
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-surface-2/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm text-txt-1 font-semibold">{title}</span>
          <span className="text-[10px] font-bold bg-surface-3/80 text-txt-2 px-2 py-0.5 rounded-full">{count}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-txt-3 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {!collapsed && (
        <div className="border-t border-border-subtle/50">
          {children}
        </div>
      )}
    </div>
  );
};

const SkillItem = ({ skill }: { skill: SkillInfo }): JSX.Element => {
  const { openFile } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
      onClick={() => openFile(skill.filePath, skill.name)}
    >
      <span className="badge-skill text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">skill</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-txt-1 font-medium">{skill.name}</div>
        {skill.description && (
          <div className="text-[11px] text-txt-3 truncate mt-0.5">{skill.description}</div>
        )}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3/50 flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
};

const AgentItem = ({ agent }: { agent: AgentInfo }): JSX.Element => {
  const { openFile } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
      onClick={() => openFile(agent.filePath, agent.name)}
    >
      <span className="badge-agent text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">agent</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-txt-1 font-medium">{agent.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {agent.model && <span className="text-[10px] text-txt-3 font-mono bg-surface-3/50 px-1.5 py-0.5 rounded">{agent.model}</span>}
          {agent.description && <span className="text-[11px] text-txt-3 truncate">{agent.description}</span>}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3/50 flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
};

const McpServerItem = ({ server }: { server: McpServerConfig }): JSX.Element => {
  const { setSelectedMcpServer } = useClaudeStore();

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
      onClick={() => setSelectedMcpServer(server)}
    >
      <span className="badge-mcp text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">mcp</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-txt-1 font-medium">{server.name}</div>
        <div className="text-[11px] text-txt-3 truncate mt-0.5 font-mono">
          {server.command} {server.args.join(' ')}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3/50 flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
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
    <div ref={contentRef} className="flex-1 flex flex-col overflow-hidden bg-surface-0">
      <div
        className="overflow-y-auto p-6"
        style={hasFiles ? { height: `${splitRatio * 100}%` } : { flex: 1 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-txt-3">
            <div className="animate-pulse text-sm">Loading configuration...</div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="gradient-text font-bold text-lg">Claude Configuration</span>
              </div>
              <button
                className="text-txt-3 hover:text-accent-blue text-xs px-3 py-1.5 rounded-lg hover:bg-surface-2/50 transition-all flex items-center gap-1.5"
                onClick={() => loadClaudeData(projectPath)}
                title="Refresh"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 105.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                Refresh
              </button>
            </div>

            <CollapsibleSection
              title="Project Skills"
              count={projectSkills.length}
              icon={<span className="badge-skill text-[9px] font-bold px-1.5 py-0.5 rounded">S</span>}
            >
              {projectSkills.length === 0 ? (
                <div className="px-5 py-4 text-xs text-txt-3 text-center italic">No project skills</div>
              ) : (
                <div className="divide-y divide-border-subtle/30">
                  {projectSkills.map((s) => <SkillItem key={s.filePath} skill={s} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Global Skills"
              count={globalSkills.length}
              defaultOpen={false}
              icon={<span className="badge-skill text-[9px] font-bold px-1.5 py-0.5 rounded">G</span>}
            >
              {globalSkills.length === 0 ? (
                <div className="px-5 py-4 text-xs text-txt-3 text-center italic">No global skills</div>
              ) : (
                <div className="divide-y divide-border-subtle/30">
                  {globalSkills.map((s) => <SkillItem key={s.filePath} skill={s} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Agents"
              count={agents.length}
              icon={<span className="badge-agent text-[9px] font-bold px-1.5 py-0.5 rounded">A</span>}
            >
              {agents.length === 0 ? (
                <div className="px-5 py-4 text-xs text-txt-3 text-center italic">No agents in this project</div>
              ) : (
                <div className="divide-y divide-border-subtle/30">
                  {agents.map((a) => <AgentItem key={a.filePath} agent={a} />)}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="MCP Servers"
              count={mcpServers.length}
              icon={<span className="badge-mcp text-[9px] font-bold px-1.5 py-0.5 rounded">M</span>}
            >
              {mcpServers.length === 0 ? (
                <div className="px-5 py-4 text-xs text-txt-3 text-center italic">No MCP servers configured</div>
              ) : (
                <div className="divide-y divide-border-subtle/30">
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
            className="h-[3px] divider-h cursor-row-resize flex-shrink-0 transition-all"
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
