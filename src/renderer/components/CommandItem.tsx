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
      <div className="px-3 py-2 border-b border-gray-800">
        <input
          className="w-full bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1 outline-none focus:ring-1 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name"
          autoFocus
        />
        <input
          className="w-full bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1.5 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Command"
        />
        <div className="flex gap-1">
          <button
            className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-500"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="text-[10px] px-2 py-0.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
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
      className="flex items-center px-3 py-1.5 border-b border-gray-800 hover:bg-gray-800/50 group cursor-grab"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="flex-1 min-w-0 mr-2">
        <div className="text-xs text-gray-200 truncate">{command.name}</div>
        <div className="text-[10px] text-gray-500 truncate font-mono">{command.command}</div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
        <button
          className="text-green-400 hover:text-green-300 text-sm px-1"
          onClick={() => onRun(command.command)}
          title="Run in new terminal"
        >
          &#9655;
        </button>
        <button
          className="text-gray-500 hover:text-gray-300 text-[10px] px-1"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          &#9998;
        </button>
        <button
          className="text-gray-500 hover:text-red-400 text-[10px] px-1"
          onClick={() => onRemove(command.id)}
          title="Delete"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
};
