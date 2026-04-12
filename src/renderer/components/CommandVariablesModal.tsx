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
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50" onClick={cancelExecution}>
      <div
        className="modal-card rounded-2xl w-[440px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border">
          <div className="text-sm text-txt-1 font-semibold">Fill in variables</div>
          <div className="text-[10px] text-txt-3 font-mono mt-1.5 truncate bg-surface-0/40 px-2 py-1 rounded">{pending.commandTemplate}</div>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {pending.variables.map((varName, i) => (
            <div key={varName}>
              <label className="text-[11px] text-txt-3 font-medium mb-1.5 block uppercase tracking-wider">{varName}</label>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                className="w-full text-txt-1 text-sm px-4 py-2.5 rounded-xl input-field font-mono"
                value={values[varName]}
                onChange={(e) => setValues((v) => ({ ...v, [varName]: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder={varName}
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <div className="text-[10px] text-txt-3 font-mono truncate mb-3 bg-surface-0/40 px-2 py-1 rounded">{preview}</div>
          <div className="flex justify-end gap-2.5">
            <button
              className="text-sm px-5 py-2 bg-surface-3/60 hover:bg-surface-4 border border-border text-txt-2 hover:text-txt-1 rounded-xl transition-all font-medium"
              onClick={cancelExecution}
            >
              Cancel
            </button>
            <button
              className="btn-primary text-sm px-5 py-2 text-white rounded-xl font-semibold transition-all"
              onClick={handleSubmit}
            >
              Run Command
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
