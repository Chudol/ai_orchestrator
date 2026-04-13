import { app, BrowserWindow, dialog, shell } from 'electron';
import { join } from 'path';
import { execSync } from 'child_process';

// Keep userData in the original "orchestrator" directory to preserve existing config/data
// after the rename to Solmeron. Covers both dev (lowercase from package.json name)
// and packaged (capitalized from productName) paths.
const userDataBase = app.getPath('userData');
if (userDataBase.endsWith('solmeron') || userDataBase.endsWith('Solmeron')) {
  app.setPath('userData', userDataBase.replace(/[Ss]olmeron$/, (m) => m[0] === 'S' ? 'Orchestrator' : 'orchestrator'));
}

if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('userData'), 'dev'));
}

// Packaged Electron apps on macOS get a minimal PATH from launchd.
// Resolve the user's actual shell PATH so spawned processes (claude, npx, etc.) work.
if (app.isPackaged && process.platform === 'darwin') {
  const marker = `__PATH_${Date.now()}__`;
  try {
    const raw = execSync(`/bin/zsh -li -c "echo ${marker}; echo \\$PATH; echo ${marker}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env, HOME: process.env.HOME || execSync('id -P | cut -d: -f9', { encoding: 'utf-8' }).trim() },
    });
    const match = raw.match(new RegExp(`${marker}\\n(.+?)\\n${marker}`));
    if (match?.[1]) {
      process.env.PATH = match[1];
    }
  } catch { /* keep default PATH */ }

  // Ensure common user binary paths are always included
  const home = process.env.HOME || '';
  if (home) {
    const extraPaths = [
      `${home}/.local/bin`,
      `${home}/.cargo/bin`,
      '/opt/homebrew/bin',
      '/usr/local/bin',
    ];
    const currentPath = process.env.PATH || '';
    const missing = extraPaths.filter(p => !currentPath.includes(p));
    if (missing.length) {
      process.env.PATH = `${missing.join(':')}:${currentPath}`;
    }
  }
}

// Dynamic imports — must be after setPath so electron-store reads the correct directory
async function main(): Promise<void> {
  const { registerIpcHandlers } = await import('./ipc');
  const { cleanupAllSessions } = await import('./sessions');
  const { cleanupAllTerminals, getActiveTerminalCount } = await import('./terminals');
  const { resetAllSessionStatuses } = await import('./store');
  const { registerDemoHandlers, cleanupDemo } = await import('./demo');
  const { initAutoUpdater } = await import('./updater');

  const isDemo = process.env.DEMO_MODE === '1';

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
      if (forceQuit || isDemo) return;

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
      mainWindow.loadFile(join(process.resourcesPath, 'renderer/index.html'));
    }
  };

  await app.whenReady();

  if (isDemo) {
    registerDemoHandlers();
  } else {
    resetAllSessionStatuses();
    registerIpcHandlers();
  }
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (isDemo) {
      cleanupDemo();
    } else {
      cleanupAllSessions();
      cleanupAllTerminals();
    }
  });
}

main().catch(console.error);
