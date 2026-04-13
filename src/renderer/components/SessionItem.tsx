import { useState, useEffect, useRef, useCallback } from 'react';
import { Session, SessionInternalState } from '@shared/types';
import { useAppStore } from '../stores/appStore';
import { useSettingsStore } from '../stores/settingsStore';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

const stateConfig: Record<SessionInternalState, { label: string; color: string; dot: string; glow: string }> = {
  idle: { label: 'Idle', color: 'text-txt-3', dot: 'bg-gray-500', glow: '' },
  thinking: { label: 'Thinking', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse', glow: 'dot-glow-yellow' },
  working: { label: 'Working', color: 'text-accent-blue', dot: 'bg-accent-blue', glow: 'dot-glow-blue' },
  waiting_for_approval: { label: 'Needs approval', color: 'text-orange-400', dot: 'bg-orange-400 animate-pulse', glow: 'dot-glow-orange' },
  teammates_running: { label: 'Teammates', color: 'text-accent-purple', dot: 'bg-accent-purple animate-pulse', glow: 'dot-glow-purple' },
  stopped: { label: 'Stopped', color: 'text-red-400/60', dot: 'bg-red-400/50', glow: '' },
};

const statusColorClasses: Record<string, { bg: string; text: string; dot: string }> = {
  gray: { bg: 'bg-gray-400/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  blue: { bg: 'bg-blue-400/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  yellow: { bg: 'bg-yellow-400/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  green: { bg: 'bg-green-400/15', text: 'text-green-400', dot: 'bg-green-400' },
  red: { bg: 'bg-red-400/15', text: 'text-red-400', dot: 'bg-red-400' },
  purple: { bg: 'bg-purple-400/15', text: 'text-purple-400', dot: 'bg-purple-400' },
  orange: { bg: 'bg-orange-400/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  pink: { bg: 'bg-pink-400/15', text: 'text-pink-400', dot: 'bg-pink-400' },
  cyan: { bg: 'bg-cyan-400/15', text: 'text-cyan-400', dot: 'bg-cyan-400' },
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

export const SessionItem = ({ session, isActive, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: SessionItemProps): JSX.Element => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const [elapsed, setElapsed] = useState(0);
  const [showRestartInput, setShowRestartInput] = useState(false);
  const [restartArgs, setRestartArgs] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [statusSubmenu, setStatusSubmenu] = useState(false);
  const [submenuPos, setSubmenuPos] = useState<{ left?: number; right?: number; top: number }>({ top: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const { setActiveSession, stopSession, deleteSession, renameSession, restartSession, sessionStates, sessionClaudeIds } = useAppStore();
  const isUnread = useAppStore((s) => s.unreadSessions.has(session.id));
  const { statusOptions, sessionUserStatuses, setSessionUserStatus } = useSettingsStore();

  const userStatusId = sessionUserStatuses.get(session.id);
  const userStatus = userStatusId ? statusOptions.find((o) => o.id === userStatusId) : null;

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

  // Position main menu within viewport
  useEffect(() => {
    if (!contextMenu) return;
    const close = (): void => {
      setContextMenu(null);
      setStatusSubmenu(false);
    };
    document.addEventListener('click', close);

    // Defer so menuRef.current has rendered
    requestAnimationFrame(() => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let { x: left, y: top } = contextMenu;
      if (left + rect.width > vw) left = vw - rect.width - 4;
      if (top + rect.height > vh) top = vh - rect.height - 4;
      if (left < 0) left = 4;
      if (top < 0) top = 4;
      setMenuPos({ left, top });
    });

    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  // Position submenu within viewport
  const positionSubmenu = useCallback(() => {
    const menu = menuRef.current;
    const sub = submenuRef.current;
    if (!menu || !sub) return;
    const menuRect = menu.getBoundingClientRect();
    const subRect = sub.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: prefer right, flip to left if no space
    let pos: { left?: number; right?: number; top: number };
    if (menuRect.right + subRect.width + 4 <= vw) {
      pos = { left: menuRect.width + 4, top: 0 };
    } else {
      pos = { right: menuRect.width + 4, top: 0 };
    }

    // Vertical: shift up if overflowing bottom
    const subTop = menuRect.top + (pos.top ?? 0);
    if (subTop + subRect.height > vh) {
      pos.top = -(subRect.height - menuRect.height);
      if (menuRect.top + pos.top < 0) pos.top = -menuRect.top + 4;
    }

    setSubmenuPos(pos);
  }, []);

  useEffect(() => {
    if (statusSubmenu) {
      requestAnimationFrame(positionSubmenu);
    }
  }, [statusSubmenu, positionSubmenu]);

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

  const claudeId = sessionClaudeIds.get(session.id) ?? null;

  const handleRestartSubmit = (): void => {
    const args = restartArgs.trim();
    restartSession(session.id, args);
    setShowRestartInput(false);
    setRestartArgs('');
  };

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setStatusSubmenu(false);
  };

  const statusColors = userStatus ? statusColorClasses[userStatus.color] ?? statusColorClasses.gray : null;

  return (
    <>
      <div
        className={`px-2.5 py-2 cursor-pointer rounded-lg transition-all duration-150 group ${
          isActive
            ? 'session-active'
            : 'hover:bg-surface-2/30'
        } ${isDragOver ? 'border-t-2 border-accent-blue' : 'border-t-2 border-transparent'}`}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${
            isUnread ? 'bg-green-400 animate-pulse dot-glow-green' : `${state.dot} ${state.glow}`
          }`} />

          {isEditing ? (
            <input
              className="flex-1 bg-surface-0/60 text-txt-1 text-[13px] px-1.5 py-0.5 rounded input-field font-medium"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className="flex-1 truncate text-[13px] font-medium text-txt-1">{session.name}</span>
          )}

          {/* Actions - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {session.status === 'running' && (
              <button
                className="text-txt-3 hover:text-red-400 p-0.5 rounded transition-colors"
                onClick={handleStop}
                title="Stop session"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
                </svg>
              </button>
            )}
            <button
              className="text-txt-3 hover:text-red-400 p-0.5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              title="Delete session"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-1.5 mt-1 ml-[15px]">
          <span className={`text-[11px] ${isUnread ? 'text-green-400' : state.color}`}>{isUnread ? 'Done' : state.label}</span>
          {showTimer && (
            <span className="text-[10px] text-txt-3 font-mono tabular-nums">{formatElapsed(elapsed)}</span>
          )}
          <span className="flex-1" />
          {userStatus && statusColors && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors.bg} ${statusColors.text} font-medium leading-none`}>
              {userStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed glass rounded-xl shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: menuPos.left, top: menuPos.top }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Set status */}
          <div
            className="relative"
            onMouseEnter={() => setStatusSubmenu(true)}
            onMouseLeave={() => setStatusSubmenu(false)}
          >
            <button
              className="w-full px-4 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2 justify-between"
            >
              <span className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                Set status
              </span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-txt-3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Status submenu */}
            {statusSubmenu && (
              <div
                ref={submenuRef}
                className="absolute glass rounded-xl shadow-xl py-1 z-50 min-w-[140px]"
                style={{
                  ...(submenuPos.left !== undefined ? { left: submenuPos.left, paddingLeft: 4, marginLeft: -4 } : {}),
                  ...(submenuPos.right !== undefined ? { right: submenuPos.right, paddingRight: 4, marginRight: -4 } : {}),
                  top: submenuPos.top,
                }}
              >
                {statusOptions.map((opt) => {
                  const colors = statusColorClasses[opt.color] ?? statusColorClasses.gray;
                  return (
                    <button
                      key={opt.id}
                      className={`w-full px-4 py-2 text-left text-[12px] hover:bg-surface-2/50 transition-colors flex items-center gap-2 ${
                        userStatusId === opt.id ? colors.text : 'text-txt-1'
                      }`}
                      onClick={() => {
                        setSessionUserStatus(session.id, userStatusId === opt.id ? null : opt.id);
                        setContextMenu(null);
                      }}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${statusColorClasses[opt.color]?.dot ?? 'bg-gray-400'}`} />
                      {opt.label}
                      {userStatusId === opt.id && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {userStatusId && (
                  <>
                    <div className="border-t border-border-subtle my-1" />
                    <button
                      className="w-full px-4 py-2 text-left text-[12px] text-txt-3 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
                      onClick={() => {
                        setSessionUserStatus(session.id, null);
                        setContextMenu(null);
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Clear status
                    </button>
                  </>
                )}
                {statusOptions.length === 0 && (
                  <span className="px-4 py-2 text-[11px] text-txt-3 block">No statuses defined</span>
                )}
              </div>
            )}
          </div>

          {/* Stop session */}
          {session.status === 'running' && (
            <button
              className="w-full px-4 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
              onClick={() => {
                stopSession(session.id);
                setContextMenu(null);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop session
            </button>
          )}

          {/* Restart with args */}
          <button
            className="w-full px-4 py-2 text-left text-[12px] text-txt-1 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              setRestartArgs('');
              setShowRestartInput(true);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-txt-3">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Restart with args...
          </button>

          <div className="border-t border-border-subtle my-1" />

          {/* Close/delete session */}
          <button
            className="w-full px-4 py-2 text-left text-[12px] text-red-400 hover:bg-surface-2/50 transition-colors flex items-center gap-2"
            onClick={() => {
              deleteSession(session.id);
              setContextMenu(null);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close session
          </button>
        </div>
      )}

      {/* Restart with args modal */}
      {showRestartInput && (
        <div
          className="fixed inset-0 modal-backdrop flex items-center justify-center z-50"
          onClick={() => { setShowRestartInput(false); setRestartArgs(''); }}
        >
          <div
            className="modal-card rounded-2xl w-[480px] p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowRestartInput(false); setRestartArgs(''); }
            }}
          >
            <h3 className="text-sm font-semibold text-txt-1 mb-1">Restart session</h3>
            <p className="text-[11px] text-txt-3 mb-4">{session.name}</p>

            <label className="text-[11px] text-txt-2 mb-1.5 block">Command prefix</label>
            <div className="bg-surface-0/40 rounded-lg px-3 py-2 mb-3 font-mono text-[12px] text-txt-3 select-all truncate">
              claude{claudeId ? ` --resume ${claudeId}` : ''}
            </div>

            <label className="text-[11px] text-txt-2 mb-1.5 block">Extra arguments</label>
            <input
              className="w-full bg-surface-0/60 rounded-lg px-3 py-2.5 mb-4 border border-border-subtle focus:border-accent-blue/50 transition-colors text-[13px] text-txt-1 font-mono outline-none placeholder:text-txt-3/40"
              value={restartArgs}
              onChange={(e) => setRestartArgs(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRestartSubmit();
              }}
              placeholder="--chrome ..."
              autoFocus
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-[12px] text-txt-2 hover:text-txt-1 rounded-lg hover:bg-surface-2/50 transition-colors"
                onClick={() => { setShowRestartInput(false); setRestartArgs(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-[12px] text-white bg-accent-blue hover:bg-accent-blue/80 rounded-lg transition-colors font-medium"
                onClick={handleRestartSubmit}
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
