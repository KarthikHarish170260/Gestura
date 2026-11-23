#!/usr/bin/env node
/**
 * Cross-platform desktop launcher for GESTURA.
 * Cleans any inherited ELECTRON_RUN_AS_NODE environment variables
 * and boots the Electron shell connected to the supervised Python sidecar.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const appDir = path.resolve(__dirname, '../apps/desktop');
const args = [appDir, ...process.argv.slice(2)];

console.log('[GESTURA] Starting GESTURA Desktop Application...');

const child = spawn(electron, args, {
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[GESTURA] Failed to launch Electron:', err);
  process.exit(1);
});
