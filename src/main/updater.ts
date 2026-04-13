import { autoUpdater } from 'electron-updater';
import { app, ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/channels';
import { UpdateStatus } from '@shared/types';

let currentStatus: UpdateStatus = { state: 'up-to-date' };

function broadcast(status: UpdateStatus): void {
  currentStatus = status;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.UPDATER_STATUS_CHANGED, status);
  }
}

export function initAutoUpdater(): void {
  // Register IPC handlers (even in dev, so renderer doesn't break)
  ipcMain.handle(IPC_CHANNELS.UPDATER_GET_STATUS, () => currentStatus);
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, () => {
    if (app.isPackaged) autoUpdater.checkForUpdates();
  });
  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    if (currentStatus.state === 'ready') {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcast({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcast({ state: 'available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    if (currentStatus.state === 'available' || currentStatus.state === 'downloading') {
      broadcast({ state: 'downloading', version: (currentStatus as { version: string }).version, percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-not-available', () => {
    broadcast({ state: 'up-to-date' });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ state: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
    broadcast({ state: 'error', message: err.message });
  });

  // Check on launch, then every 30 minutes
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
}
