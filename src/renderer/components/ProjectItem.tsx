import { useState, useRef, useCallback } from 'react';
import { Project, Session } from '@shared/types';
import { useAppStore } from '../stores/appStore';
import { SessionItem } from './SessionItem';

interface ProjectItemProps {
  project: Project;
  sessions: Session[];
  activeSessionId: string | null;
  hideStopped: boolean;
}

export const ProjectItem = ({ project, sessions, activeSessionId, hideStopped }: ProjectItemProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(true);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);
  const { createSession, removeProject, reorderSessions } = useAppStore();
  const filteredSessions = hideStopped ? sessions.filter((s) => s.status !== 'stopped') : sessions;

  const handleNewSession = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const name = `Session ${sessions.length + 1}`;
    await createSession(project.id, name);
  };

  const handleRemove = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    await removeProject(project.id);
  };

  const handleDragStart = useCallback((idx: number) => {
    dragIdx.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((targetIdx: number) => {
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === targetIdx) {
      setDragOverIdx(null);
      dragIdx.current = null;
      return;
    }
    const reordered = [...filteredSessions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    reorderSessions(project.id, reordered.map((s) => s.id));
    setDragOverIdx(null);
    dragIdx.current = null;
  }, [filteredSessions, project.id, reorderSessions]);

  const handleDragEnd = useCallback(() => {
    setDragOverIdx(null);
    dragIdx.current = null;
  }, []);

  const runningCount = sessions.filter((s) => s.status === 'running').length;

  return (
    <div className="mb-1">
      <div
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer rounded-lg hover:bg-surface-2/40 text-sm transition-all group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-txt-3 transition-transform duration-150 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
        >
          <path d="M3 1l5 4-5 4V1z" fill="currentColor" />
        </svg>
        <span className="flex-1 truncate font-medium text-txt-1 text-[13px]">{project.name}</span>
        {runningCount > 0 && (
          <span className="text-[9px] font-bold text-accent-blue bg-blue-500/10 px-1.5 py-0.5 rounded-md">
            {runningCount}
          </span>
        )}
        <button
          className="text-txt-3 hover:text-accent-blue text-sm opacity-0 group-hover:opacity-100 transition-all"
          onClick={handleNewSession}
          title="New session"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className="text-txt-3 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-all"
          onClick={handleRemove}
          title="Remove project"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {isOpen && (
        <div className="ml-3 pl-2">
          {filteredSessions.length === 0 ? (
            <div className="text-[11px] text-txt-3 px-3 py-2 italic">No sessions</div>
          ) : (
            filteredSessions.map((session, idx) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isDragOver={dragOverIdx === idx}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
