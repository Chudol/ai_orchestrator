import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ProjectItem } from './ProjectItem';
import { AddProjectDialog } from './AddProjectDialog';

export const Sidebar = (): JSX.Element => {
  const [showDialog, setShowDialog] = useState(false);
  const { projects, sessions, activeSessionId } = useAppStore();

  return (
    <div className="w-[300px] bg-gray-900 border-l border-gray-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700">
        <span className="text-sm font-semibold text-gray-200">Projects</span>
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
          onClick={() => setShowDialog(true)}
        >
          Add Project
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No projects yet
          </div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              sessions={sessions.get(project.id) ?? []}
              activeSessionId={activeSessionId}
            />
          ))
        )}
      </div>
      <AddProjectDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  );
};
