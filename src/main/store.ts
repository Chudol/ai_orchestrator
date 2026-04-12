import Store from 'electron-store';
import { Project, Session, Command, StatusOption, StoreSchema, DEFAULT_STATUS_OPTIONS } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

const store = new Store<StoreSchema>({
  defaults: {
    projects: [],
    sessions: [],
    commands: [],
    trackedRepoPaths: {},
    sessionUserStatuses: {},
    statusOptions: DEFAULT_STATUS_OPTIONS,
  },
});

export const getProjects = (): Project[] => {
  return store.get('projects');
};

export const addProject = (data: Omit<Project, 'id' | 'createdAt'>): Project => {
  const project: Project = {
    id: uuidv4(),
    name: data.name,
    path: data.path,
    createdAt: Date.now(),
  };
  const projects = getProjects();
  projects.push(project);
  store.set('projects', projects);
  return project;
};

export const removeProject = (id: string): void => {
  const projects = getProjects().filter((p) => p.id !== id);
  store.set('projects', projects);
  const sessions = getSessions().filter((s) => s.projectId !== id);
  store.set('sessions', sessions);
  const commands = getCommands().filter((c) => c.projectId !== id);
  store.set('commands', commands);
  const tracked = store.get('trackedRepoPaths') ?? {};
  delete tracked[id];
  store.set('trackedRepoPaths', tracked);
};

export const getSessions = (): Session[] => {
  return store.get('sessions');
};

export const getSessionsByProject = (projectId: string): Session[] => {
  return getSessions().filter((s) => s.projectId === projectId);
};

export const addSession = (projectId: string, name: string): Session => {
  const session: Session = {
    id: uuidv4(),
    projectId,
    name,
    status: 'running',
    claudeSessionId: null,
    createdAt: Date.now(),
  };
  const sessions = getSessions();
  sessions.push(session);
  store.set('sessions', sessions);
  return session;
};

export const updateSessionStatus = (id: string, status: Session['status']): void => {
  const sessions = getSessions().map((s) =>
    s.id === id ? { ...s, status } : s,
  );
  store.set('sessions', sessions);
};

export const renameSession = (id: string, name: string): void => {
  const sessions = getSessions().map((s) =>
    s.id === id ? { ...s, name } : s,
  );
  store.set('sessions', sessions);
};

export const updateSessionClaudeId = (id: string, claudeSessionId: string): void => {
  const sessions = getSessions().map((s) =>
    s.id === id ? { ...s, claudeSessionId } : s,
  );
  store.set('sessions', sessions);
};

export const getTrackedRepoPaths = (projectId: string): string[] => {
  const all = store.get('trackedRepoPaths') ?? {};
  return all[projectId] ?? [];
};

export const trackRepo = (projectId: string, dirPath: string): void => {
  const all = store.get('trackedRepoPaths') ?? {};
  const existing = all[projectId] ?? [];
  if (!existing.includes(dirPath)) {
    store.set('trackedRepoPaths', { ...all, [projectId]: [...existing, dirPath] });
  }
};

export const untrackRepo = (projectId: string, dirPath: string): void => {
  const all = store.get('trackedRepoPaths') ?? {};
  const existing = all[projectId] ?? [];
  store.set('trackedRepoPaths', { ...all, [projectId]: existing.filter((p) => p !== dirPath) });
};

export const removeSession = (id: string): void => {
  const sessions = getSessions().filter((s) => s.id !== id);
  store.set('sessions', sessions);
  const statuses = store.get('sessionUserStatuses') ?? {};
  if (statuses[id]) {
    delete statuses[id];
    store.set('sessionUserStatuses', statuses);
  }
};

export const resetAllSessionStatuses = (): void => {
  const sessions = getSessions().map((s) => ({ ...s, status: 'stopped' as const }));
  store.set('sessions', sessions);
};

export const reorderSessions = (projectId: string, orderedIds: string[]): void => {
  const sessions = getSessions();
  const projectSessions = sessions.filter((s) => s.projectId === projectId);
  const otherSessions = sessions.filter((s) => s.projectId !== projectId);
  projectSessions.sort((a, b) => {
    const idxA = orderedIds.indexOf(a.id);
    const idxB = orderedIds.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
  store.set('sessions', [...otherSessions, ...projectSessions]);
};

export const removeSessionsByProject = (projectId: string): void => {
  const sessions = getSessions().filter((s) => s.projectId !== projectId);
  store.set('sessions', sessions);
};

// Commands CRUD

export const getCommands = (): Command[] => {
  return store.get('commands');
};

export const getCommandsByProject = (projectId: string): Command[] => {
  return getCommands()
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order);
};

export const addCommand = (projectId: string, name: string, command: string): Command => {
  const existing = getCommandsByProject(projectId);
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((c) => c.order)) : -1;
  const cmd: Command = {
    id: uuidv4(),
    projectId,
    name,
    command,
    order: maxOrder + 1,
    createdAt: Date.now(),
  };
  const commands = getCommands();
  commands.push(cmd);
  store.set('commands', commands);
  return cmd;
};

export const updateCommand = (id: string, data: { name?: string; command?: string }): Command => {
  let updated: Command | null = null;
  const commands = getCommands().map((c) => {
    if (c.id === id) {
      updated = { ...c, ...data };
      return updated;
    }
    return c;
  });
  store.set('commands', commands);
  if (!updated) throw new Error(`Command ${id} not found`);
  return updated;
};

export const removeCommand = (id: string): void => {
  const commands = getCommands().filter((c) => c.id !== id);
  store.set('commands', commands);
};

export const reorderCommands = (projectId: string, orderedIds: string[]): void => {
  const commands = getCommands().map((c) => {
    if (c.projectId === projectId) {
      const idx = orderedIds.indexOf(c.id);
      return { ...c, order: idx >= 0 ? idx : c.order };
    }
    return c;
  });
  store.set('commands', commands);
};

// Status options

export const getStatusOptions = (): StatusOption[] => {
  return store.get('statusOptions');
};

export const setStatusOptions = (options: StatusOption[]): void => {
  store.set('statusOptions', options);
};

export const getSessionUserStatus = (sessionId: string): string | null => {
  const all = store.get('sessionUserStatuses') ?? {};
  return all[sessionId] ?? null;
};

export const setSessionUserStatus = (sessionId: string, statusId: string | null): void => {
  const all = store.get('sessionUserStatuses') ?? {};
  if (statusId === null) {
    delete all[sessionId];
  } else {
    all[sessionId] = statusId;
  }
  store.set('sessionUserStatuses', all);
};

export const getAllSessionUserStatuses = (): Record<string, string> => {
  return store.get('sessionUserStatuses') ?? {};
};
