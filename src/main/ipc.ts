import { ipcMain, IpcMainInvokeEvent, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
import { IPC_CHANNELS } from '@shared/channels';
import { Project, FileEntry, StatusOption } from '@shared/types';
import { listSkills, listAgents, listMcpServers, mcpListTools } from './claude';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', '.next', '.vite',
  '__pycache__', '.DS_Store', '.cache', '.turbo', 'coverage',
  'ios', 'android', 'build', 'Pods', 'vendor', '.gradle',
  '.idea', '.vscode', 'release', '.svn', 'tmp', 'temp',
]);

const MAX_RECURSIVE_FILES = 5000;

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
import {
  getProjects,
  addProject,
  removeProject,
  getSessionsByProject,
  addSession,
  renameSession as renameSessionStore,
  removeSession as removeSessionStore,
  reorderSessions as reorderSessionsStore,
  getCommandsByProject,
  addCommand,
  updateCommand,
  removeCommand,
  reorderCommands,
  trackRepo,
  untrackRepo,
  getTrackedRepoPaths,
  getStatusOptions,
  setStatusOptions,
  getSessionUserStatus,
  setSessionUserStatus,
  getAllSessionUserStatuses,
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
import {
  createTerminal,
  destroyTerminal,
  attachTerminal,
  detachTerminal,
  terminalInput,
  terminalResize,
} from './terminals';

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
          try {
            respawnSession(sessionId, sessionInfo.projectPath, sessionInfo.name, sessionInfo.claudeSessionId || null);
          } catch (err) {
            console.error(`Failed to respawn session ${sessionId}:`, err);
            return [];
          }
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

  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_REORDER,
    (_event: IpcMainInvokeEvent, projectId: string, orderedIds: string[]) => {
      reorderSessionsStore(projectId, orderedIds);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TRACK_REPO,
    (_event: IpcMainInvokeEvent, projectId: string, dirPath: string) => {
      trackRepo(projectId, dirPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_UNTRACK_REPO,
    (_event: IpcMainInvokeEvent, projectId: string, dirPath: string) => {
      untrackRepo(projectId, dirPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_TRACKED_PATHS,
    (_event: IpcMainInvokeEvent, projectId: string) => {
      return getTrackedRepoPaths(projectId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_BRANCH,
    (_event: IpcMainInvokeEvent, dirPath: string): string | null => {
      try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: dirPath,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
      } catch {
        return null;
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_STATUS,
    async (_event: IpcMainInvokeEvent, dirPath: string) => {
      try {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
          cwd: dirPath,
          encoding: 'utf-8',
          timeout: 10000,
        });
        const lines = stdout.trim().split('\n').filter(Boolean);
        let staged = 0;
        let unstaged = 0;
        let untracked = 0;
        for (const line of lines) {
          const x = line[0];
          const y = line[1];
          if (x === '?') { untracked++; continue; }
          if (x !== ' ' && x !== '?') staged++;
          if (y !== ' ' && y !== '?') unstaged++;
        }
        return { dirty: lines.length > 0, staged, unstaged, untracked };
      } catch {
        return { dirty: false, staged: 0, unstaged: 0, untracked: 0 };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_BRANCHES,
    async (_event: IpcMainInvokeEvent, dirPath: string): Promise<string[]> => {
      try {
        const { stdout } = await execFileAsync('git', ['branch', '--format=%(refname:short)'], {
          cwd: dirPath,
          encoding: 'utf-8',
          timeout: 5000,
        });
        return stdout.trim().split('\n').filter(Boolean);
      } catch {
        return [];
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CHECKOUT,
    async (_event: IpcMainInvokeEvent, dirPath: string, branch: string) => {
      await execFileAsync('git', ['checkout', branch], {
        cwd: dirPath,
        encoding: 'utf-8',
        timeout: 10000,
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_FETCH,
    async (_event: IpcMainInvokeEvent, dirPath: string) => {
      try {
        await execFileAsync('git', ['fetch', '--all'], {
          cwd: dirPath,
          encoding: 'utf-8',
          timeout: 30000,
        });
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PULL,
    async (_event: IpcMainInvokeEvent, dirPath: string) => {
      try {
        const { stdout } = await execFileAsync('git', ['pull'], {
          cwd: dirPath,
          encoding: 'utf-8',
          timeout: 30000,
        });
        return { success: true, output: stdout.trim() };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, output: '', error: message };
      }
    },
  );

  const peonPausedFile = path.join(os.homedir(), '.claude', 'hooks', 'peon-ping', '.paused');

  ipcMain.handle(IPC_CHANNELS.PEON_IS_MUTED, () => {
    return fs.existsSync(peonPausedFile);
  });

  ipcMain.handle(IPC_CHANNELS.PEON_TOGGLE_MUTE, () => {
    if (fs.existsSync(peonPausedFile)) {
      fs.unlinkSync(peonPausedFile);
      return false;
    } else {
      fs.writeFileSync(peonPausedFile, '');
      return true;
    }
  });

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
    IPC_CHANNELS.FS_READDIR_RECURSIVE,
    async (_event: IpcMainInvokeEvent, rootPath: string): Promise<FileEntry[]> => {
      const results: FileEntry[] = [];
      const walk = async (dir: string): Promise<void> => {
        if (results.length >= MAX_RECURSIVE_FILES) return;
        let entries;
        try {
          entries = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (results.length >= MAX_RECURSIVE_FILES) return;
          if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            results.push({
              name: path.relative(rootPath, fullPath),
              path: fullPath,
              isDirectory: false,
            });
          }
        }
      };
      await walk(rootPath);
      results.sort((a, b) => a.name.localeCompare(b.name));
      return results;
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

  ipcMain.handle(
    IPC_CHANNELS.FS_WRITEFILE,
    async (_event: IpcMainInvokeEvent, filePath: string, content: string): Promise<void> => {
      await fs.promises.writeFile(filePath, content, 'utf-8');
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    (_event: IpcMainInvokeEvent, cwd: string, cols?: number, rows?: number) => {
      return createTerminal(cwd, cols, rows);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_DESTROY,
    (_event: IpcMainInvokeEvent, terminalId: string) => {
      destroyTerminal(terminalId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_INPUT,
    (_event: IpcMainInvokeEvent, terminalId: string, data: string) => {
      terminalInput(terminalId, data);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    (_event: IpcMainInvokeEvent, terminalId: string, cols: number, rows: number) => {
      terminalResize(terminalId, cols, rows);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_ATTACH,
    (event: IpcMainInvokeEvent, terminalId: string) => {
      const windowId = event.sender.id;
      return attachTerminal(terminalId, windowId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_DETACH,
    (event: IpcMainInvokeEvent, terminalId: string) => {
      const windowId = event.sender.id;
      detachTerminal(terminalId, windowId);
    },
  );

  // Commands

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_LIST,
    (_event: IpcMainInvokeEvent, projectId: string) => {
      return getCommandsByProject(projectId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_ADD,
    (_event: IpcMainInvokeEvent, projectId: string, name: string, command: string) => {
      return addCommand(projectId, name, command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_UPDATE,
    (_event: IpcMainInvokeEvent, id: string, data: { name?: string; command?: string }) => {
      return updateCommand(id, data);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_REMOVE,
    (_event: IpcMainInvokeEvent, id: string) => {
      removeCommand(id);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMMANDS_REORDER,
    (_event: IpcMainInvokeEvent, projectId: string, orderedIds: string[]) => {
      reorderCommands(projectId, orderedIds);
    },
  );

  // Claude data

  ipcMain.handle(
    IPC_CHANNELS.CLAUDE_SKILLS,
    (_event: IpcMainInvokeEvent, projectPath: string | null) => {
      return listSkills(projectPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CLAUDE_AGENTS,
    (_event: IpcMainInvokeEvent, projectPath: string | null) => {
      return listAgents(projectPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CLAUDE_MCP_SERVERS,
    (_event: IpcMainInvokeEvent, projectPath: string | null) => {
      return listMcpServers(projectPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CLAUDE_MCP_LIST_TOOLS,
    (_event: IpcMainInvokeEvent, command: string, args: string[], env: Record<string, string>) => {
      return mcpListTools(command, args, env);
    },
  );

  // Settings - status options

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_STATUS_OPTIONS, () => {
    return getStatusOptions();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_STATUS_OPTIONS,
    (_event: IpcMainInvokeEvent, options: StatusOption[]) => {
      setStatusOptions(options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET_SESSION_STATUS,
    (_event: IpcMainInvokeEvent, sessionId: string) => {
      return getSessionUserStatus(sessionId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET_SESSION_STATUS,
    (_event: IpcMainInvokeEvent, sessionId: string, statusId: string | null) => {
      setSessionUserStatus(sessionId, statusId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL_SESSION_STATUSES, () => {
    return getAllSessionUserStatuses();
  });
};
