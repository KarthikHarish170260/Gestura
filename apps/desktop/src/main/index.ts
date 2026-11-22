import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import crypto from 'node:crypto';

// Process security flags
const sidecarToken = crypto.randomBytes(32).toString('hex');
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'GESTURA - Offline Sign Language Assistant',
    autoHideMenuBar: true,
  });

  // Strict CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' blob: data:; " +
          "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; " +
          "img-src 'self' data: blob:; " +
          "media-src 'self' blob: mediastream:; " +
          "worker-src 'self' blob:;"
        ],
      },
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC allowlist handler
ipcMain.handle('app:get-sidecar-config', () => {
  return {
    port: 8000,
    token: sidecarToken,
    host: '127.0.0.1',
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
