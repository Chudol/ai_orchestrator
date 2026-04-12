import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { StatusOption } from '@shared/types';

const STATUS_COLORS = ['gray', 'blue', 'yellow', 'green', 'red', 'purple', 'orange', 'pink', 'cyan'];

const colorClasses: Record<string, { dot: string; text: string }> = {
  gray: { dot: 'bg-gray-400', text: 'text-gray-400' },
  blue: { dot: 'bg-blue-400', text: 'text-blue-400' },
  yellow: { dot: 'bg-yellow-400', text: 'text-yellow-400' },
  green: { dot: 'bg-green-400', text: 'text-green-400' },
  red: { dot: 'bg-red-400', text: 'text-red-400' },
  purple: { dot: 'bg-purple-400', text: 'text-purple-400' },
  orange: { dot: 'bg-orange-400', text: 'text-orange-400' },
  pink: { dot: 'bg-pink-400', text: 'text-pink-400' },
  cyan: { dot: 'bg-cyan-400', text: 'text-cyan-400' },
};

export const SettingsPanel = (): JSX.Element => {
  const { statusOptions, setStatusOptions, loadSettings } = useSettingsStore();
  const [localOptions, setLocalOptions] = useState<StatusOption[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setLocalOptions(statusOptions);
  }, [statusOptions]);

  const save = (options: StatusOption[]): void => {
    setLocalOptions(options);
    setStatusOptions(options);
  };

  const handleAdd = (): void => {
    const newOption: StatusOption = {
      id: `status-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: 'New Status',
      color: 'gray',
    };
    save([...localOptions, newOption]);
  };

  const handleRemove = (id: string): void => {
    save(localOptions.filter((o) => o.id !== id));
  };

  const handleUpdate = (id: string, field: 'label' | 'color', value: string): void => {
    save(localOptions.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const handleDragStart = (idx: number): void => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number): void => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number): void => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...localOptions];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    save(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-lg mx-auto">
        <h2 className="text-sm font-semibold text-txt-1 mb-1">Settings</h2>
        <p className="text-[11px] text-txt-3 mb-6">Configure your Orchestrator preferences.</p>

        {/* Status Options */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-txt-2 uppercase tracking-wider">Session Statuses</h3>
            <button
              className="text-[11px] text-accent-blue hover:text-accent-blue/80 transition-colors"
              onClick={handleAdd}
            >
              + Add status
            </button>
          </div>

          <div className="space-y-1">
            {localOptions.map((option, idx) => (
              <div
                key={option.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-1/50 border transition-all group ${
                  dragOverIdx === idx ? 'border-accent-blue' : 'border-transparent'
                }`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              >
                {/* Drag handle */}
                <span className="text-txt-3/40 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <circle cx="3" cy="2" r="1" /><circle cx="7" cy="2" r="1" />
                    <circle cx="3" cy="5" r="1" /><circle cx="7" cy="5" r="1" />
                    <circle cx="3" cy="8" r="1" /><circle cx="7" cy="8" r="1" />
                  </svg>
                </span>

                {/* Color picker */}
                <div className="relative group/color">
                  <span className={`w-3 h-3 rounded-full block cursor-pointer ${colorClasses[option.color]?.dot ?? 'bg-gray-400'}`} />
                  <div className="absolute left-0 top-full mt-1 hidden group-hover/color:flex gap-1 p-1.5 glass rounded-lg shadow-xl z-50">
                    {STATUS_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-4 h-4 rounded-full ${colorClasses[c]?.dot ?? 'bg-gray-400'} ${
                          option.color === c ? 'ring-2 ring-white/50' : ''
                        } hover:scale-125 transition-transform`}
                        onClick={() => handleUpdate(option.id, 'color', c)}
                      />
                    ))}
                  </div>
                </div>

                {/* Label */}
                <input
                  className="flex-1 bg-transparent text-[12px] text-txt-1 outline-none border-b border-transparent focus:border-accent-blue/50 transition-colors px-1 py-0.5"
                  value={option.label}
                  onChange={(e) => handleUpdate(option.id, 'label', e.target.value)}
                />

                {/* Remove */}
                <button
                  className="text-txt-3/40 hover:text-red-400 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(option.id)}
                  title="Remove status"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {localOptions.length === 0 && (
            <p className="text-[11px] text-txt-3 text-center py-4">No statuses defined. Click &quot;+ Add status&quot; to create one.</p>
          )}
        </div>
      </div>
    </div>
  );
};
