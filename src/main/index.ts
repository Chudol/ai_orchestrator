import { app, BrowserWindow, dialog, shell } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc';
import { cleanupAllSessions } from './sessions';
import { cleanupAllTerminals, getActiveTerminalCount } from './terminals';
import { resetAllSessionStatuses } from './store';

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  let forceQuit = false;

  mainWindow.on('close', (e) => {
    if (forceQuit) return;

    const terminalCount = getActiveTerminalCount();
    if (terminalCount === 0) return;

    e.preventDefault();

    const plural = terminalCount > 1 ? 'terminals' : 'terminal';
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Quit'],
      defaultId: 0,
      cancelId: 0,
      title: 'Active Terminals',
      message: `You have ${terminalCount} active ${plural} running.`,
      detail: 'All terminal processes will be killed if you quit. Are you sure?',
    }).then(({ response }) => {
      if (response === 1) {
        cleanupAllTerminals();
        forceQuit = true;
        mainWindow.close();
      }
    });
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(() => {
  resetAllSessionStatuses();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanupAllSessions();
  cleanupAllTerminals();
});
