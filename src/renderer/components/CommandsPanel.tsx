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
    <div className="border-b border-gray-800">
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-gray-800/50"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}>
            &#9654;
          </span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</span>
          <span className="text-[10px] text-gray-600">{commands.length}</span>
        </div>
        <button
          className="text-gray-500 hover:text-gray-300 text-sm"
          onClick={(e) => { e.stopPropagation(); setAdding(true); setCollapsed(false); }}
          title="Add command"
        >
          +
        </button>
      </div>
      {!collapsed && (
        <>
          {adding && (
            <div className="px-3 py-2 border-t border-gray-800/50 bg-gray-800/30">
              <input
                className="w-full bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1 outline-none focus:ring-1 focus:ring-blue-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Name"
                autoFocus
              />
              <input
                className="w-full bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1.5 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                value={newCmd}
                onChange={(e) => setNewCmd(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Command"
              />
              <div className="flex gap-1">
                <button className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-500" onClick={handleAdd}>Add</button>
                <button className="text-[10px] px-2 py-0.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600" onClick={() => { setAdding(false); setNewName(''); setNewCmd(''); }}>Cancel</button>
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
            <div className="px-3 py-2 text-[10px] text-gray-600 text-center">No commands</div>
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
    <div className="w-[250px] bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0">
      <div className="flex items-center px-3 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Commands</span>
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
