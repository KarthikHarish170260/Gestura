import electron from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SidecarSupervisor } from './sidecarSupervisor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { app, BrowserWindow, ipcMain, session } = electron;

// Process security flags
const sidecarToken = crypto.randomBytes(32).toString('hex');
const sidecarPort = 8000;
const sidecarHost = '127.0.0.1';

const supervisor = new SidecarSupervisor({
  host: sidecarHost,
  port: sidecarPort,
  token: sidecarToken,
});

let mainWindow: BrowserWindowType | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#020617',
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, '../preload/index.cjs'))
        ? path.join(__dirname, '../preload/index.cjs')
        : path.join(__dirname, '../preload/index.js'),
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
    const distIndex = path.join(__dirname, '../../dist/index.html');
    if (fs.existsSync(distIndex)) {
      mainWindow.loadFile(distIndex);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC allowlist handler
ipcMain.handle('app:get-sidecar-config', () => {
  return {
    port: sidecarPort,
    token: sidecarToken,
    host: sidecarHost,
  };
});

app.whenReady().then(async () => {
  // Start supervised sidecar process
  await supervisor.start();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  supervisor.stop();
});

process.on('exit', () => {
  supervisor.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
