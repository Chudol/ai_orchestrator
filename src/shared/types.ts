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

export interface TrackedRepoInfo {
  path: string;
  folderName: string;
  branch: string | null;
}

export interface GitStatusResult {
  dirty: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface GitFetchResult {
  success: boolean;
  error?: string;
}

export interface GitPullResult {
  success: boolean;
  output: string;
  error?: string;
}

export type SessionInternalState = 'idle' | 'thinking' | 'working' | 'waiting_for_approval' | 'teammates_running' | 'stopped';

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
  dirty?: boolean;
}

export interface TerminalPane {
  id: string; // pty process id
}

export interface OpenTerminal {
  id: string; // tab id
  name: string;
  panes: TerminalPane[];
}

export const GLOBAL_PROJECT_ID = '__global__';

export interface Command {
  id: string;
  projectId: string;
  name: string;
  command: string;
  order: number;
  createdAt: number;
}

export interface SkillInfo {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

export interface AgentInfo {
  name: string;
  description: string;
  model: string;
  filePath: string;
}

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface McpToolInputProperty {
  type: string;
  description?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, McpToolInputProperty>;
    required: string[];
  };
}

export interface StatusOption {
  id: string;
  label: string;
  color: string; // tailwind color name e.g. 'blue', 'yellow', 'green', 'purple'
}

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { id: 'todo', label: 'Todo', color: 'gray' },
  { id: 'in-progress', label: 'In Progress', color: 'blue' },
  { id: 'review', label: 'Review', color: 'yellow' },
  { id: 'done', label: 'Done', color: 'green' },
];

export interface StoreSchema {
  projects: Project[];
  sessions: Session[];
  commands: Command[];
  trackedRepoPaths: Record<string, string[]>; // projectId -> paths
  sessionUserStatuses: Record<string, string>; // sessionId -> statusOptionId
  statusOptions: StatusOption[];
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
  reorderSessions: (projectId: string, orderedIds: string[]) => Promise<void>;
  restartSession: (sessionId: string, extraArgs: string) => Promise<string[]>;
  onSessionOutput: (callback: (sessionId: string, data: string) => void) => () => void;
  onSessionExit: (callback: (sessionId: string) => void) => () => void;
  onSessionStateUpdate: (callback: (sessionId: string, info: SessionStateInfo) => void) => () => void;
  onSessionClaudeId: (callback: (sessionId: string, claudeId: string) => void) => () => void;
  selectDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<FileEntry[]>;
  readDirectoryRecursive: (dirPath: string) => Promise<FileEntry[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  createTerminal: (cwd: string, cols?: number, rows?: number) => Promise<string>;
  destroyTerminal: (terminalId: string) => Promise<void>;
  terminalInput: (terminalId: string, data: string) => Promise<void>;
  terminalResize: (terminalId: string, cols: number, rows: number) => Promise<void>;
  attachTerminal: (terminalId: string) => Promise<string[]>;
  detachTerminal: (terminalId: string) => Promise<void>;
  onTerminalOutput: (callback: (terminalId: string, data: string) => void) => () => void;
  onTerminalExit: (callback: (terminalId: string) => void) => () => void;
  listCommands: (projectId: string) => Promise<Command[]>;
  addCommand: (projectId: string, name: string, command: string) => Promise<Command>;
  updateCommand: (id: string, data: { name?: string; command?: string }) => Promise<Command>;
  removeCommand: (id: string) => Promise<void>;
  reorderCommands: (projectId: string, orderedIds: string[]) => Promise<void>;
  trackRepo: (projectId: string, dirPath: string) => Promise<void>;
  untrackRepo: (projectId: string, dirPath: string) => Promise<void>;
  getTrackedRepoPaths: (projectId: string) => Promise<string[]>;
  getGitBranch: (dirPath: string) => Promise<string | null>;
  getGitStatus: (dirPath: string) => Promise<GitStatusResult>;
  getGitBranches: (dirPath: string) => Promise<string[]>;
  gitCheckout: (dirPath: string, branch: string) => Promise<void>;
  gitFetch: (dirPath: string) => Promise<GitFetchResult>;
  gitPull: (dirPath: string) => Promise<GitPullResult>;
  peonIsMuted: () => Promise<boolean>;
  peonToggleMute: () => Promise<boolean>;
  listSkills: (projectPath: string | null) => Promise<SkillInfo[]>;
  listAgents: (projectPath: string | null) => Promise<AgentInfo[]>;
  listMcpServers: (projectPath: string | null) => Promise<McpServerConfig[]>;
  mcpListTools: (command: string, args: string[], env: Record<string, string>) => Promise<McpTool[]>;
  getStatusOptions: () => Promise<StatusOption[]>;
  setStatusOptions: (options: StatusOption[]) => Promise<void>;
  getSessionUserStatus: (sessionId: string) => Promise<string | null>;
  setSessionUserStatus: (sessionId: string, statusId: string | null) => Promise<void>;
  getAllSessionUserStatuses: () => Promise<Record<string, string>>;
}
