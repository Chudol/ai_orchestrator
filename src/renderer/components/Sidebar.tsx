import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { ProjectItem } from './ProjectItem';
import { AddProjectDialog } from './AddProjectDialog';

export const Sidebar = (): JSX.Element => {
  const [showDialog, setShowDialog] = useState(false);
  const [hideStopped, setHideStopped] = useState(false);
  const { projects, sessions, activeSessionId } = useAppStore();

  return (
    <div className="w-[300px] panel-bg border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[10px] font-bold text-txt-3 uppercase tracking-[0.15em]">Projects</span>
        <button
          className="btn-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
          onClick={() => setShowDialog(true)}
        >
          Add Project
        </button>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-txt-3 select-none">
          <span>Hide stopped</span>
          <button
            role="switch"
            aria-checked={hideStopped}
            onClick={() => setHideStopped(!hideStopped)}
            className={`relative w-8 h-[18px] rounded-full transition-all duration-200 ${
              hideStopped
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_8px_-1px_rgba(88,166,255,0.3)]'
                : 'bg-surface-3'
            }`}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${hideStopped ? 'translate-x-[14px]' : ''}`}
            />
          </button>
        </label>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-txt-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-30 mb-3">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-xs">No projects yet</span>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              sessions={sessions.get(project.id) ?? []}
              activeSessionId={activeSessionId}
              hideStopped={hideStopped}
            />
          ))
        )}
      </div>
      <AddProjectDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  );
};
