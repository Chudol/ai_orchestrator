import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/channels';
import { Project, FileEntry } from '@shared/types';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', '.next', '.vite',
  '__pycache__', '.DS_Store', '.cache', '.turbo', 'coverage',
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
import {
  getProjects,
  addProject,
  removeProject,
  getSessionsByProject,
  addSession,
  renameSession as renameSessionStore,
  removeSession as removeSessionStore,
} from './store';
import {
  createPtySession,
  stopSession,
  attachSession,
  detachSession,
  sendInput,
  respawnSession,
  isSessionRunning,
  deleteSessionLogs,
} from './sessions';

export const registerIpcHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, () => {
    return getProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_ADD,
    (_event: IpcMainInvokeEvent, data: Omit<Project, 'id' | 'createdAt'>) => {
      return addProject(data);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_REMOVE,
    (_event: IpcMainInvokeEvent, id: string) => {
      removeProject(id);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_LIST,
    (_event: IpcMainInvokeEvent, projectId: string) => {
      return getSessionsByProject(projectId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_CREATE,
    (_event: IpcMainInvokeEvent, projectId: string, name: string) => {
      const projects = getProjects();
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      const session = addSession(projectId, name);
      createPtySession(session.id, project.path, name);
      return session;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_STOP,
    (_event: IpcMainInvokeEvent, sessionId: string) => {
      stopSession(sessionId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_ATTACH,
    (event: IpcMainInvokeEvent, sessionId: string) => {
      if (!isSessionRunning(sessionId)) {
        const allProjects = getProjects();
        const allSessions = allProjects.flatMap((p) =>
          getSessionsByProject(p.id).map((s) => ({ ...s, projectPath: p.path })),
        );
        const sessionInfo = allSessions.find((s) => s.id === sessionId);
        if (sessionInfo) {
          respawnSession(sessionId, sessionInfo.projectPath, sessionInfo.name, sessionInfo.claudeSessionId ?? null);
        }
      }
      const windowId = event.sender.id;
      const buffer = attachSession(sessionId, windowId);
      return buffer;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_DETACH,
    (event: IpcMainInvokeEvent, sessionId: string) => {
      const windowId = event.sender.id;
      detachSession(sessionId, windowId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_INPUT,
    (_event: IpcMainInvokeEvent, sessionId: string, data: string) => {
      sendInput(sessionId, data);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_RENAME,
    (_event: IpcMainInvokeEvent, sessionId: string, name: string) => {
      renameSessionStore(sessionId, name);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_DELETE,
    (_event: IpcMainInvokeEvent, sessionId: string) => {
      deleteSessionLogs(sessionId);
      stopSession(sessionId);
      removeSessionStore(sessionId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return null;
    }
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle(
    IPC_CHANNELS.FS_READDIR,
    async (_event: IpcMainInvokeEvent, dirPath: string): Promise<FileEntry[]> => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const filtered = entries
        .filter((e) => !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          isDirectory: e.isDirectory(),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      return filtered;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.FS_READFILE,
    async (_event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        return '// File too large to display (> 1MB)';
      }
      const buffer = await fs.promises.readFile(filePath);
      const isBinary = buffer.includes(0);
      if (isBinary) {
        return '// Binary file - cannot display';
      }
      return buffer.toString('utf-8');
    },
  );
};
