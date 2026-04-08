import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import { v4 as uuidv4 } from 'uuid';

const MAX_BUFFER_LINES = 10000;

interface ManagedTerminal {
  ptyProcess: pty.IPty;
  buffer: string[];
  attachedWindows: Set<number>;
}

const activeTerminals = new Map<string, ManagedTerminal>();

export const createTerminal = (cwd: string, cols: number = 80, rows: number = 24): string => {
  const id = uuidv4();
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
  const shellArgs = process.platform === 'win32' ? [] : ['-l'];
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>,
  });

  const managed: ManagedTerminal = {
    ptyProcess,
    buffer: [],
    attachedWindows: new Set(),
  };

  ptyProcess.onData((data: string) => {
    managed.buffer.push(data);
    if (managed.buffer.length > MAX_BUFFER_LINES) {
      managed.buffer.splice(0, managed.buffer.length - MAX_BUFFER_LINES);
    }

    for (const winId of managed.attachedWindows) {
      const win = BrowserWindow.fromId(winId);
      if (win) {
        win.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data);
      }
    }
  });

  ptyProcess.onExit(() => {
    activeTerminals.delete(id);
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id);
    }
  });

  activeTerminals.set(id, managed);
  return id;
};

export const destroyTerminal = (id: string): void => {
  const managed = activeTerminals.get(id);
  if (managed) {
    managed.ptyProcess.kill();
    activeTerminals.delete(id);
  }
};

export const attachTerminal = (id: string, windowId: number): string[] => {
  const managed = activeTerminals.get(id);
  if (!managed) return [];
  managed.attachedWindows.add(windowId);
  return managed.buffer;
};

export const detachTerminal = (id: string, windowId: number): void => {
  const managed = activeTerminals.get(id);
  if (managed) {
    managed.attachedWindows.delete(windowId);
  }
};

export const terminalResize = (id: string, cols: number, rows: number): void => {
  const managed = activeTerminals.get(id);
  if (managed) {
    managed.ptyProcess.resize(cols, rows);
  }
};

export const terminalInput = (id: string, data: string): void => {
  const managed = activeTerminals.get(id);
  if (managed) {
    managed.ptyProcess.write(data);
  }
};

export const getActiveTerminalCount = (): number => {
  return activeTerminals.size;
};

export const cleanupAllTerminals = (): void => {
  for (const [, managed] of activeTerminals) {
    managed.ptyProcess.kill();
  }
  activeTerminals.clear();
};
