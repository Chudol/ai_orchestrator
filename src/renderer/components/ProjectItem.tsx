import { useState } from 'react';
import { Project, Session } from '@shared/types';
import { useAppStore } from '../stores/appStore';
import { SessionItem } from './SessionItem';

interface ProjectItemProps {
  project: Project;
  sessions: Session[];
  activeSessionId: string | null;
}

export const ProjectItem = ({ project, sessions, activeSessionId }: ProjectItemProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(true);
  const { createSession, removeProject } = useAppStore();

  const handleNewSession = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const name = `Session ${sessions.length + 1}`;
    await createSession(project.id, name);
  };

  const handleRemove = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    await removeProject(project.id);
  };

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-800 rounded text-sm text-gray-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>
          &#x25B6;
        </span>
        <span className="flex-1 truncate font-medium">{project.name}</span>
        <button
          className="text-gray-500 hover:text-white text-xs"
          onClick={handleNewSession}
          title="New session"
        >
          +
        </button>
        <button
          className="text-gray-500 hover:text-red-400 text-xs"
          onClick={handleRemove}
          title="Remove project"
        >
          &times;
        </button>
      </div>
      {isOpen && (
        <div className="ml-4">
          {sessions.length === 0 ? (
            <div className="text-xs text-gray-500 px-3 py-1">No sessions</div>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
