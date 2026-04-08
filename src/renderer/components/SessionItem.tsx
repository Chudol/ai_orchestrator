import { useState, useEffect } from 'react';
import { Session, SessionInternalState } from '@shared/types';
import { useAppStore } from '../stores/appStore';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
}

const stateConfig: Record<SessionInternalState, { label: string; color: string; dot: string }> = {
  idle: { label: 'Idle', color: 'text-gray-400', dot: 'bg-gray-400' },
  thinking: { label: 'Thinking', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  working: { label: 'Working', color: 'text-blue-400', dot: 'bg-blue-400' },
  waiting_for_approval: { label: 'Needs approval', color: 'text-orange-400', dot: 'bg-orange-400 animate-pulse' },
  teammates_running: { label: 'Teammates', color: 'text-purple-400', dot: 'bg-purple-400 animate-pulse' },
  stopped: { label: 'Stopped', color: 'text-red-400', dot: 'bg-red-400' },
};

const formatElapsed = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const SessionItem = ({ session, isActive }: SessionItemProps): JSX.Element => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [elapsed, setElapsed] = useState(0);
  const { setActiveSession, stopSession, deleteSession, renameSession, sessionStates } = useAppStore();

  const stateInfo = sessionStates.get(session.id);
  const internalState = stateInfo?.state ?? (session.status === 'stopped' ? 'stopped' : 'idle');
  const stateSince = stateInfo?.since ?? 0;
  const state = stateConfig[internalState];
  const showTimer = internalState !== 'idle' && internalState !== 'stopped' && stateSince > 0;

  useEffect(() => {
    if (!showTimer) {
      setElapsed(0);
      return;
    }
    setElapsed(Date.now() - stateSince);
    const interval = setInterval(() => {
      setElapsed(Date.now() - stateSince);
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer, stateSince]);

  const handleClick = (): void => {
    setActiveSession(session.id);
  };

  const handleDoubleClick = (): void => {
    setIsEditing(true);
    setEditName(session.name);
  };

  const handleRename = async (): Promise<void> => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== session.name) {
      await renameSession(session.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleStop = (e: React.MouseEvent): void => {
    e.stopPropagation();
    stopSession(session.id);
  };

  return (
    <div
      className={`px-3 py-2 cursor-pointer rounded ${
        isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            className="flex-1 bg-gray-800 text-white text-sm px-1 py-0 border border-gray-600 rounded outline-none"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate text-sm text-gray-200">{session.name}</span>
        )}
        {session.status === 'running' && (
          <button
            className="text-gray-500 hover:text-red-400 text-xs flex-shrink-0"
            onClick={handleStop}
            title="Stop session"
          >
            &#x25A0;
          </button>
        )}
        <button
          className="text-gray-500 hover:text-red-400 text-xs flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            deleteSession(session.id);
          }}
          title="Delete session"
        >
          &#x2715;
        </button>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${state.dot}`} />
        <span className={`text-xs ${state.color}`}>{state.label}</span>
        {showTimer && (
          <span className="text-xs text-gray-500">{formatElapsed(elapsed)}</span>
        )}
      </div>
    </div>
  );
};
