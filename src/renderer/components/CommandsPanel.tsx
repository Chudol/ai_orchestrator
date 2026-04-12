import { useState, useCallback } from 'react';
import { GLOBAL_PROJECT_ID } from '@shared/types';
import { useCommandsStore, useActiveCommands, useGlobalCommands } from '../stores/commandsStore';
import { useActiveProjectId } from '../stores/appStore';
import { CommandItem } from './CommandItem';

interface CommandSectionProps {
  title: string;
  projectId: string;
  commands: import('@shared/types').Command[];
  defaultOpen?: boolean;
}

const CommandSection = ({ title, projectId, commands, defaultOpen = true }: CommandSectionProps): JSX.Element => {
  const { addCommand, updateCommand, removeCommand, requestExecution } = useCommandsStore();
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCmd, setNewCmd] = useState('');

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !newCmd.trim()) return;
    addCommand(projectId, newName.trim(), newCmd.trim());
    setNewName('');
    setNewCmd('');
    setAdding(false);
  }, [projectId, newName, newCmd, addCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewCmd(''); }
  }, [handleAdd]);

  return (
    <div className="border-b border-border-subtle/50">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-surface-2/30 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            className={`text-txt-3 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
          >
            <path d="M3 1l5 4-5 4V1z" fill="currentColor" />
          </svg>
          <span className="text-[10px] text-txt-3 font-bold uppercase tracking-[0.12em]">{title}</span>
          <span className="text-[9px] font-bold bg-surface-3/60 text-txt-3 px-1.5 py-0.5 rounded-full">{commands.length}</span>
        </div>
        <button
          className="text-txt-3 hover:text-accent-blue transition-colors"
          onClick={(e) => { e.stopPropagation(); setAdding(true); setCollapsed(false); }}
          title="Add command"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <>
          {adding && (
            <div className="px-3 py-2.5 border-t border-border-subtle/30 bg-surface-1/30">
              <input
                className="w-full text-txt-1 text-[11px] px-2.5 py-1.5 rounded-md mb-1.5 input-field"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Command name"
                autoFocus
              />
              <input
                className="w-full text-txt-1 text-[11px] px-2.5 py-1.5 rounded-md mb-2 input-field font-mono"
                value={newCmd}
                onChange={(e) => setNewCmd(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Command to execute"
              />
              <div className="flex gap-1.5">
                <button
                  className="btn-primary text-[10px] px-3 py-1 text-white rounded-md font-medium"
                  onClick={handleAdd}
                >
                  Add
                </button>
                <button
                  className="text-[10px] px-3 py-1 bg-surface-3/60 border border-border text-txt-2 rounded-md hover:bg-surface-4 transition-colors"
                  onClick={() => { setAdding(false); setNewName(''); setNewCmd(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {commands.map((cmd) => (
            <CommandItem
              key={cmd.id}
              command={cmd}
              onRun={(cmd) => requestExecution(cmd, null)}
              onUpdate={(id, data) => updateCommand(projectId, id, data)}
              onRemove={(id) => removeCommand(projectId, id)}
            />
          ))}
          {commands.length === 0 && !adding && (
            <div className="px-3 py-3 text-[10px] text-txt-3 text-center italic">No commands</div>
          )}
        </>
      )}
    </div>
  );
};

export const CommandsPanel = (): JSX.Element => {
  const globalCommands = useGlobalCommands();
  const projectCommands = useActiveCommands();
  const projectId = useActiveProjectId();

  return (
    <div className="w-[240px] panel-bg border-r border-border flex flex-col overflow-hidden flex-shrink-0">
      <div className="flex items-center px-3 py-2.5 border-b border-border">
        <span className="text-[10px] font-bold text-txt-3 uppercase tracking-[0.15em]">Commands</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CommandSection
          title="Global"
          projectId={GLOBAL_PROJECT_ID}
          commands={globalCommands}
        />
        {projectId && (
          <CommandSection
            title="Project"
            projectId={projectId}
            commands={projectCommands}
          />
        )}
      </div>
    </div>
  );
};
