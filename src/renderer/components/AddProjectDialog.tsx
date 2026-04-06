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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl" onKeyDown={handleKeyDown}>
        <h2 className="text-white text-lg font-semibold mb-4">Add Project</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Path</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
                readOnly
              />
              <button
                className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-3 py-2 rounded"
                onClick={handleSelectDirectory}
              >
                Browse
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="text-gray-400 hover:text-white text-sm px-4 py-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded"
            onClick={handleSubmit}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
