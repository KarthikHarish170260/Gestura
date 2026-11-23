var _ = Object.defineProperty;
var k = (o, e, t) => e in o ? _(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var h = (o, e, t) => k(o, typeof e != "symbol" ? e + "" : e, t);
import E from "electron";
import s from "node:path";
import d from "node:fs";
import H from "node:crypto";
import { fileURLToPath as w } from "node:url";
import { spawn as m } from "node:child_process";
import j from "node:http";
const T = w(import.meta.url), P = s.dirname(T);
class $ {
  constructor(e) {
    h(this, "process", null);
    h(this, "config");
    h(this, "isShuttingDown", !1);
    this.config = e;
  }
  resolveRepoRoot() {
    let e = process.cwd();
    for (let t = 0; t < 5; t++) {
      if (d.existsSync(s.join(e, "services", "sidecar")))
        return e;
      e = s.resolve(e, "..");
    }
    e = P;
    for (let t = 0; t < 6; t++) {
      if (d.existsSync(s.join(e, "services", "sidecar")))
        return e;
      e = s.resolve(e, "..");
    }
    return process.cwd();
  }
  resolvePythonExe(e) {
    const t = process.platform === "win32", i = t ? s.join(".venv", "Scripts", "python.exe") : s.join(".venv", "bin", "python"), c = [
      s.join(e, i),
      s.join(process.cwd(), i),
      s.resolve(e, "..", i)
    ];
    for (const a of c)
      if (d.existsSync(a))
        return a;
    return t ? "python" : "python3";
  }
  async start() {
    var a, g;
    if (await this.checkHealth())
      return console.log(`[Supervisor] Sidecar is already running and healthy at ${this.config.host}:${this.config.port}`), !0;
    const t = this.resolveRepoRoot(), i = this.resolvePythonExe(t), c = {
      ...process.env,
      GESTURA_HOST: this.config.host,
      GESTURA_PORT: String(this.config.port),
      GESTURA_AUTH_TOKEN: this.config.token
    };
    console.log(`[Supervisor] Spawning Python sidecar using "${i}" in "${t}"...`);
    try {
      return this.process = m(
        i,
        ["-m", "uvicorn", "gestura_sidecar.main:app", "--host", this.config.host, "--port", String(this.config.port)],
        {
          env: c,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: t
        }
      ), (a = this.process.stdout) == null || a.on("data", (r) => {
        console.log(`[Sidecar] ${r.toString().trim()}`);
      }), (g = this.process.stderr) == null || g.on("data", (r) => {
        console.error(`[Sidecar:stderr] ${r.toString().trim()}`);
      }), this.process.on("exit", (r, R) => {
        this.isShuttingDown || console.warn(`[Supervisor] Sidecar exited unexpectedly with code ${r}, signal ${R}`), this.process = null;
      }), await this.waitForHealthCheck(15e3);
    } catch (r) {
      return console.error("[Supervisor] Failed to spawn sidecar:", r), !1;
    }
  }
  async waitForHealthCheck(e = 1e4) {
    const t = Date.now();
    for (; Date.now() - t < e; ) {
      if (await this.checkHealth())
        return console.log("[Supervisor] Sidecar is healthy and accepting connections."), !0;
      await new Promise((c) => setTimeout(c, 400));
    }
    return console.warn("[Supervisor] Sidecar health check timed out."), !1;
  }
  checkHealth() {
    return new Promise((e) => {
      const t = j.get(
        `http://${this.config.host}:${this.config.port}/health`,
        { timeout: 800 },
        (i) => {
          e(i.statusCode === 200);
        }
      );
      t.on("error", () => e(!1)), t.on("timeout", () => {
        t.destroy(), e(!1);
      });
    });
  }
  stop() {
    if (this.process) {
      if (this.isShuttingDown = !0, console.log("[Supervisor] Gracefully terminating Python sidecar..."), process.platform === "win32")
        try {
          m("taskkill", ["/pid", String(this.process.pid), "/f", "/t"]);
        } catch {
          this.process.kill();
        }
      else
        this.process.kill("SIGTERM"), setTimeout(() => {
          this.process && this.process.kill("SIGKILL");
        }, 2e3);
      this.process = null;
    }
  }
}
const A = w(import.meta.url), l = s.dirname(A), { app: p, BrowserWindow: y, ipcMain: I, session: U, protocol: f } = E;
f && f.registerSchemesAsPrivileged && f.registerSchemesAsPrivileged([
  {
    scheme: "file",
    privileges: {
      standard: !0,
      secure: !0,
      allowServiceWorkers: !0,
      supportFetchAPI: !0,
      corsEnabled: !0
    }
  }
]);
const v = H.randomBytes(32).toString("hex"), x = 8e3, b = "127.0.0.1", u = new $({
  host: b,
  port: x,
  token: v
});
let n = null;
function S() {
  if (n = new y({
    width: 1360,
    height: 840,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#020617",
    webPreferences: {
      preload: d.existsSync(s.join(l, "../preload/index.cjs")) ? s.join(l, "../preload/index.cjs") : s.join(l, "../preload/index.js"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
      // Ensures local offline file:// fetches of wasm and task models succeed
    },
    title: "GESTURA - Offline Sign Language Assistant",
    autoHideMenuBar: !0
  }), U.defaultSession.webRequest.onHeadersReceived((o, e) => {
    e({
      responseHeaders: {
        ...o.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: file:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:* file: https://cdn.jsdelivr.net https://storage.googleapis.com blob: data:; img-src 'self' data: blob: file:; media-src 'self' blob: mediastream: file:; worker-src 'self' blob: file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: file: https://cdn.jsdelivr.net;"
        ]
      }
    });
  }), process.env.VITE_DEV_SERVER_URL)
    n.loadURL(process.env.VITE_DEV_SERVER_URL);
  else {
    const o = s.join(l, "../../dist/index.html");
    d.existsSync(o) ? n.loadFile(o) : n.loadFile(s.join(l, "../renderer/index.html"));
  }
  n.on("closed", () => {
    n = null;
  });
}
I.handle("app:get-sidecar-config", () => ({
  port: x,
  token: v,
  host: b
}));
p.whenReady().then(async () => {
  await u.start(), S(), p.on("activate", () => {
    y.getAllWindows().length === 0 && S();
  });
});
p.on("before-quit", () => {
  u.stop();
});
process.on("exit", () => {
  u.stop();
});
p.on("window-all-closed", () => {
  process.platform !== "darwin" && p.quit();
});
