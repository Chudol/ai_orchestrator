import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import { ElectronApi } from '@shared/types';

const api: ElectronApi = {
  listProjects: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST),
  addProject: (project) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_ADD, project),
  removeProject: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_REMOVE, id),
  listSessions: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LIST, projectId),
  createSession: (projectId, name) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_CREATE, projectId, name),
  stopSession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_STOP, sessionId),
  attachSession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_ATTACH, sessionId),
  detachSession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_DETACH, sessionId),
  sendInput: (sessionId, data) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_INPUT, sessionId, data),
  renameSession: (sessionId, name) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_RENAME, sessionId, name),
  deleteSession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_DELETE, sessionId),
  reorderSessions: (projectId, orderedIds) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_REORDER, projectId, orderedIds),
  restartSession: (sessionId, extraArgs) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_RESTART, sessionId, extraArgs),
  trackRepo: (projectId, dirPath) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_TRACK_REPO, projectId, dirPath),
  untrackRepo: (projectId, dirPath) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_UNTRACK_REPO, projectId, dirPath),
  getTrackedRepoPaths: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_TRACKED_PATHS, projectId),
  getGitBranch: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCH, dirPath),
  peonIsMuted: () => ipcRenderer.invoke(IPC_CHANNELS.PEON_IS_MUTED),
  peonToggleMute: () => ipcRenderer.invoke(IPC_CHANNELS.PEON_TOGGLE_MUTE),
  getGitStatus: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, dirPath),
  getGitBranches: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCHES, dirPath),
  gitCheckout: (dirPath, branch) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, dirPath, branch),
  gitFetch: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_FETCH, dirPath),
  gitPull: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL, dirPath),
  onSessionOutput: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, data: string): void => {
      callback(sessionId, data);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_OUTPUT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_OUTPUT, handler);
    };
  },
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY),
  readDirectory: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.FS_READDIR, dirPath),
  readDirectoryRecursive: (dirPath) => ipcRenderer.invoke(IPC_CHANNELS.FS_READDIR_RECURSIVE, dirPath),
  readFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FS_READFILE, filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke(IPC_CHANNELS.FS_WRITEFILE, filePath, content),
  onSessionStateUpdate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, info: import('@shared/types').SessionStateInfo): void => {
      callback(sessionId, info);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_STATE_UPDATE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_STATE_UPDATE, handler);
    };
  },
  onSessionClaudeId: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, claudeId: string): void => {
      callback(sessionId, claudeId);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_CLAUDE_ID, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_CLAUDE_ID, handler);
  },
  createTerminal: (cwd, cols, rows) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, cwd, cols, rows),
  destroyTerminal: (terminalId) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_DESTROY, terminalId),
  terminalInput: (terminalId, data) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_INPUT, terminalId, data),
  terminalResize: (terminalId, cols, rows) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, terminalId, cols, rows),
  attachTerminal: (terminalId) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_ATTACH, terminalId),
  detachTerminal: (terminalId) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_DETACH, terminalId),
  onTerminalOutput: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, terminalId: string, data: string): void => {
      callback(terminalId, data);
    };
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUTPUT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_OUTPUT, handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, terminalId: string): void => {
      callback(terminalId);
    };
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, handler);
  },
  onSessionExit: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string): void => {
      callback(sessionId);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_EXIT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_EXIT, handler);
    };
  },
  listCommands: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_LIST, projectId),
  addCommand: (projectId, name, command) => ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_ADD, projectId, name, command),
  updateCommand: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_UPDATE, id, data),
  removeCommand: (id) => ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_REMOVE, id),
  reorderCommands: (projectId, orderedIds) => ipcRenderer.invoke(IPC_CHANNELS.COMMANDS_REORDER, projectId, orderedIds),
  listSkills: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_SKILLS, projectPath),
  listAgents: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_AGENTS, projectPath),
  listMcpServers: (projectPath) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_MCP_SERVERS, projectPath),
  mcpListTools: (command, args, env) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_MCP_LIST_TOOLS, command, args, env),
  getStatusOptions: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_STATUS_OPTIONS),
  setStatusOptions: (options) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_STATUS_OPTIONS, options),
  getSessionUserStatus: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SESSION_STATUS, sessionId),
  setSessionUserStatus: (sessionId, statusId) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SESSION_STATUS, sessionId, statusId),
  getAllSessionUserStatuses: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL_SESSION_STATUSES),
  updaterCheck: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
  updaterInstall: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
  updaterGetStatus: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_STATUS),
  onUpdaterStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: import('@shared/types').UpdateStatus): void => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld('api', api);
