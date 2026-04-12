import { useState } from 'react';
import { useAppStore } from '../stores/appStore';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddProjectDialog = ({ isOpen, onClose }: AddProjectDialogProps): JSX.Element | null => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const { addProject } = useAppStore();

  if (!isOpen) {
    return null;
  }

  const handleSelectDirectory = async (): Promise<void> => {
    const selected = await window.api.selectDirectory();
    if (selected) {
      setPath(selected);
      if (!name) {
        const dirName = selected.split('/').pop() ?? selected;
        setName(dirName);
      }
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedName = name.trim();
    const trimmedPath = path.trim();
    if (!trimmedName || !trimmedPath) {
      return;
    }
    await addProject(trimmedName, trimmedPath);
    setName('');
    setPath('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
      <div className="modal-card rounded-2xl max-w-md w-full p-7" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-txt-1 text-base font-semibold">Add Project</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-txt-3 mb-1.5 font-medium uppercase tracking-wider">Name</label>
            <input
              className="w-full text-txt-1 text-sm px-4 py-2.5 rounded-xl input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome project"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] text-txt-3 mb-1.5 font-medium uppercase tracking-wider">Path</label>
            <div className="flex gap-2">
              <input
                className="flex-1 text-txt-1 text-sm px-4 py-2.5 rounded-xl input-field font-mono"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
                readOnly
              />
              <button
                className="bg-surface-3/80 hover:bg-surface-4 border border-border text-txt-2 hover:text-txt-1 text-sm px-4 py-2.5 rounded-xl transition-all font-medium"
                onClick={handleSelectDirectory}
              >
                Browse
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-7">
          <button
            className="bg-surface-3/60 hover:bg-surface-4 border border-border text-txt-2 hover:text-txt-1 text-sm px-5 py-2 rounded-xl transition-all font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary text-white text-sm px-5 py-2 rounded-xl font-semibold transition-all"
            onClick={handleSubmit}
          >
            Add Project
          </button>
        </div>
      </div>
    </div>
  );
};
