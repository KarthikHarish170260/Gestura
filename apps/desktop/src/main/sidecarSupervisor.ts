/**
 * Electron Main Process Sidecar Supervisor.
 * Spawns, monitors, health-checks, and gracefully terminates the Python FastAPI sidecar.
 */

import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

export interface SidecarConfig {
  host: string;
  port: number;
  token: string;
}

export class SidecarSupervisor {
  private process: ChildProcess | null = null;
  private config: SidecarConfig;
  private isShuttingDown = false;

  constructor(config: SidecarConfig) {
    this.config = config;
  }

  private resolveRepoRoot(): string {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'services', 'sidecar'))) {
      return cwd;
    }
    const upOne = path.resolve(cwd, '..');
    if (fs.existsSync(path.join(upOne, 'services', 'sidecar'))) {
      return upOne;
    }
    const fromDirname = path.resolve(__dirname, '../../..');
    if (fs.existsSync(path.join(fromDirname, 'services', 'sidecar'))) {
      return fromDirname;
    }
    return cwd;
  }

  private resolvePythonExe(repoRoot: string): string {
    const isWindows = process.platform === 'win32';
    const subpath = isWindows ? path.join('.venv', 'Scripts', 'python.exe') : path.join('.venv', 'bin', 'python');
    const candidates = [
      path.join(repoRoot, subpath),
      path.join(process.cwd(), subpath),
      path.resolve(repoRoot, '..', subpath),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return isWindows ? 'python' : 'python3';
  }

  public async start(): Promise<boolean> {
    // If sidecar is already alive (e.g. running in terminal or docker), verify health directly
    const alreadyHealthy = await this.checkHealth();
    if (alreadyHealthy) {
      console.log(`[Supervisor] Sidecar is already running and healthy at ${this.config.host}:${this.config.port}`);
      return true;
    }

    const repoRoot = this.resolveRepoRoot();
    const pythonExe = this.resolvePythonExe(repoRoot);

    const env = {
      ...process.env,
      GESTURA_HOST: this.config.host,
      GESTURA_PORT: String(this.config.port),
      GESTURA_AUTH_TOKEN: this.config.token,
    };

    console.log(`[Supervisor] Spawning Python sidecar using "${pythonExe}" in "${repoRoot}"...`);

    try {
      this.process = spawn(
        pythonExe,
        ['-m', 'uvicorn', 'gestura_sidecar.main:app', '--host', this.config.host, '--port', String(this.config.port)],
        {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: repoRoot,
        }
      );

      this.process.stdout?.on('data', (chunk: Buffer) => {
        console.log(`[Sidecar] ${chunk.toString().trim()}`);
      });

      this.process.stderr?.on('data', (chunk: Buffer) => {
        console.error(`[Sidecar:stderr] ${chunk.toString().trim()}`);
      });

      this.process.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          console.warn(`[Supervisor] Sidecar exited unexpectedly with code ${code}, signal ${signal}`);
        }
        this.process = null;
      });

      // Wait for health check to pass
      return await this.waitForHealthCheck(15000);
    } catch (err) {
      console.error('[Supervisor] Failed to spawn sidecar:', err);
      return false;
    }
  }

  public async waitForHealthCheck(timeoutMs = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const isHealthy = await this.checkHealth();
      if (isHealthy) {
        console.log('[Supervisor] Sidecar is healthy and accepting connections.');
        return true;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.warn('[Supervisor] Sidecar health check timed out.');
    return false;
  }

  public checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.config.host}:${this.config.port}/health`,
        { timeout: 800 },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public stop(): void {
    if (!this.process) return;
    this.isShuttingDown = true;
    console.log('[Supervisor] Gracefully terminating Python sidecar...');

    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t']);
      } catch {
        this.process.kill();
      }
    } else {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process) this.process.kill('SIGKILL');
      }, 2000);
    }
    this.process = null;
  }
}
