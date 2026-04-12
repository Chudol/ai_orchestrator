import { useState, useCallback } from 'react';
import { Command } from '@shared/types';

interface CommandItemProps {
  command: Command;
  onRun: (command: string) => void;
  onUpdate: (id: string, data: { name?: string; command?: string }) => void;
  onRemove: (id: string) => void;
}

export const CommandItem = ({ command, onRun, onUpdate, onRemove }: CommandItemProps): JSX.Element => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(command.name);
  const [cmd, setCmd] = useState(command.command);

  const handleSave = useCallback(() => {
    if (!name.trim() || !cmd.trim()) return;
    onUpdate(command.id, { name: name.trim(), command: cmd.trim() });
    setEditing(false);
  }, [command.id, name, cmd, onUpdate]);

  const handleCancel = useCallback(() => {
    setName(command.name);
    setCmd(command.command);
    setEditing(false);
  }, [command.name, command.command]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-command', command.command);
    e.dataTransfer.effectAllowed = 'copy';
  }, [command.command]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }, [handleSave, handleCancel]);

  if (editing) {
    return (
      <div className="px-3 py-2.5 border-b border-border-subtle/30 bg-surface-1/30">
        <input
          className="w-full text-txt-1 text-[11px] px-2.5 py-1.5 rounded-md mb-1.5 input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name"
          autoFocus
        />
        <input
          className="w-full text-txt-1 text-[11px] px-2.5 py-1.5 rounded-md mb-2 input-field font-mono"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Command"
        />
        <div className="flex gap-1.5">
          <button
            className="btn-primary text-[10px] px-3 py-1 text-white rounded-md font-medium"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="text-[10px] px-3 py-1 bg-surface-3/60 border border-border text-txt-2 rounded-md hover:bg-surface-4 transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center px-2 py-2 mx-2 my-1 rounded-lg bg-surface-2/30 hover:bg-surface-2/60 border border-border-subtle/30 hover:border-border-subtle/60 group cursor-grab transition-all active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex-1 min-w-0 mr-2">
        <div className="text-[12px] text-txt-1 font-medium truncate">{command.name}</div>
        <div className="text-[10px] text-txt-3 truncate font-mono mt-0.5">{command.command}</div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity">
        <button
          className="text-txt-3 hover:text-accent-blue p-1 rounded transition-colors"
          onClick={() => onRun(command.command)}
          title="Run"
        >
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4V1z" fill="currentColor" /></svg>
        </button>
        <button
          className="text-txt-3 hover:text-txt-1 p-1 rounded transition-colors"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="text-txt-3 hover:text-red-400 p-1 rounded transition-colors"
          onClick={() => onRemove(command.id)}
          title="Delete"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
