import { useState, useCallback, useEffect, useRef } from 'react';
import { useCommandsStore, PendingExecution } from '../stores/commandsStore';

const ModalContent = ({ pending }: { pending: PendingExecution }): JSX.Element => {
  const { confirmExecution, cancelExecution } = useCommandsStore();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(pending.variables.map((v) => [v, ''])),
  );
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    confirmExecution(values);
  }, [values, confirmExecution]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') cancelExecution();
  }, [handleSubmit, cancelExecution]);

  const preview = pending.commandTemplate.replace(
    /\{([^}]+)\}/g,
    (_, name) => values[name] || `{${name}}`,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelExecution}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[420px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="text-sm text-white font-medium">Fill in variables</div>
          <div className="text-[10px] text-gray-500 font-mono mt-1 truncate">{pending.commandTemplate}</div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2.5 overflow-y-auto">
          {pending.variables.map((varName, i) => (
            <div key={varName}>
              <label className="text-xs text-gray-400 mb-0.5 block">{varName}</label>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                className="w-full bg-gray-800 text-white text-sm px-3 py-1.5 rounded outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                value={values[varName]}
                onChange={(e) => setValues((v) => ({ ...v, [varName]: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder={varName}
              />
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-800">
          <div className="text-[10px] text-gray-500 font-mono truncate mb-2">{preview}</div>
          <div className="flex justify-end gap-2">
            <button
              className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              onClick={cancelExecution}
            >
              Cancel
            </button>
            <button
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
              onClick={handleSubmit}
            >
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommandVariablesModal = (): JSX.Element | null => {
  const pending = useCommandsStore((s) => s.pendingExecution);
  if (!pending) return null;
  return <ModalContent pending={pending} />;
};
