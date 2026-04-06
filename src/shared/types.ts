export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
}

export interface Session {
  id: string;
  projectId: string;
  name: string;
  status: 'running' | 'stopped';
  claudeSessionId: string | null;
  createdAt: number;
}

export type SessionInternalState = 'idle' | 'thinking' | 'working' | 'waiting_for_approval' | 'stopped';

export interface SessionStateInfo {
  state: SessionInternalState;
  since: number; // timestamp when this state started
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
}

export interface StoreSchema {
  projects: Project[];
  sessions: Session[];
}

export interface ElectronApi {
  listProjects: () => Promise<Project[]>;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
  listSessions: (projectId: string) => Promise<Session[]>;
  createSession: (projectId: string, name: string) => Promise<Session>;
  stopSession: (sessionId: string) => Promise<void>;
  attachSession: (sessionId: string) => Promise<string[]>;
  detachSession: (sessionId: string) => Promise<void>;
  sendInput: (sessionId: string, data: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  onSessionOutput: (callback: (sessionId: string, data: string) => void) => () => void;
  onSessionExit: (callback: (sessionId: string) => void) => () => void;
  onSessionStateUpdate: (callback: (sessionId: string, info: SessionStateInfo) => void) => () => void;
  selectDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileEntry[]>;
  readFile: (filePath: string) => Promise<string>;
}
