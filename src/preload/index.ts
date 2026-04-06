import { contextBridge, ipcRenderer } from 'electron';
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
  readFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FS_READFILE, filePath),
  onSessionStateUpdate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, info: import('@shared/types').SessionStateInfo): void => {
      callback(sessionId, info);
    };
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_STATE_UPDATE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_STATE_UPDATE, handler);
    };
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
};

contextBridge.exposeInMainWorld('api', api);
