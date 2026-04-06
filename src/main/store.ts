import Store from 'electron-store';
import { Project, Session, StoreSchema } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

const store = new Store<StoreSchema>({
  defaults: {
    projects: [],
    sessions: [],
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

export const removeSession = (id: string): void => {
  const sessions = getSessions().filter((s) => s.id !== id);
  store.set('sessions', sessions);
};

export const resetAllSessionStatuses = (): void => {
  const sessions = getSessions().map((s) => ({ ...s, status: 'stopped' as const }));
  store.set('sessions', sessions);
};

export const removeSessionsByProject = (projectId: string): void => {
  const sessions = getSessions().filter((s) => s.projectId !== projectId);
  store.set('sessions', sessions);
};
