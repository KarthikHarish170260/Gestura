import electron from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SidecarSupervisor } from './sidecarSupervisor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { app, BrowserWindow, ipcMain, session, protocol } = electron;

// Allow file: protocol to fetch local WASM binaries and model files offline without CORS blocks
if (protocol && protocol.registerSchemesAsPrivileged) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'file',
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

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
    width: 1480,
    height: 940,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#FAFAF7',
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, '../preload/index.cjs'))
        ? path.join(__dirname, '../preload/index.cjs')
        : path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Ensures local offline file:// fetches of wasm and task models succeed
    },
    title: 'GESTURA - Offline Sign Language Assistant',
    autoHideMenuBar: true,
  });

  // Maximize window by default for expansive viewports
  mainWindow.maximize();

  // Strict CSP allowing local wasm evaluation and offline models
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: file:; " +
          "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:* file: https://cdn.jsdelivr.net https://storage.googleapis.com blob: data:; " +
          "img-src 'self' data: blob: file:; " +
          "media-src 'self' blob: mediastream: file:; " +
          "worker-src 'self' blob: file:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: file: https://cdn.jsdelivr.net;"
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
