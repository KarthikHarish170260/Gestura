var R = Object.defineProperty;
var k = (i, e, t) => e in i ? R(i, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : i[e] = t;
var h = (i, e, t) => k(i, typeof e != "symbol" ? e + "" : e, t);
import { ipcMain as x, app as l, BrowserWindow as w, session as E } from "electron";
import o from "node:path";
import H from "node:crypto";
import { spawn as f } from "node:child_process";
import p from "node:fs";
import _ from "node:http";
class b {
  constructor(e) {
    h(this, "process", null);
    h(this, "config");
    h(this, "isShuttingDown", !1);
    this.config = e;
  }
  resolveRepoRoot() {
    const e = process.cwd();
    if (p.existsSync(o.join(e, "services", "sidecar")))
      return e;
    const t = o.resolve(e, "..");
    if (p.existsSync(o.join(t, "services", "sidecar")))
      return t;
    const s = o.resolve(__dirname, "../../..");
    return p.existsSync(o.join(s, "services", "sidecar")) ? s : e;
  }
  resolvePythonExe(e) {
    const t = process.platform === "win32", s = t ? o.join(".venv", "Scripts", "python.exe") : o.join(".venv", "bin", "python"), n = [
      o.join(e, s),
      o.join(process.cwd(), s),
      o.resolve(e, "..", s)
    ];
    for (const c of n)
      if (p.existsSync(c))
        return c;
    return t ? "python" : "python3";
  }
  async start() {
    var c, u;
    if (await this.checkHealth())
      return console.log(`[Supervisor] Sidecar is already running and healthy at ${this.config.host}:${this.config.port}`), !0;
    const t = this.resolveRepoRoot(), s = this.resolvePythonExe(t), n = {
      ...process.env,
      GESTURA_HOST: this.config.host,
      GESTURA_PORT: String(this.config.port),
      GESTURA_AUTH_TOKEN: this.config.token
    };
    console.log(`[Supervisor] Spawning Python sidecar using "${s}" in "${t}"...`);
    try {
      return this.process = f(
        s,
        ["-m", "uvicorn", "gestura_sidecar.main:app", "--host", this.config.host, "--port", String(this.config.port)],
        {
          env: n,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: t
        }
      ), (c = this.process.stdout) == null || c.on("data", (r) => {
        console.log(`[Sidecar] ${r.toString().trim()}`);
      }), (u = this.process.stderr) == null || u.on("data", (r) => {
        console.error(`[Sidecar:stderr] ${r.toString().trim()}`);
      }), this.process.on("exit", (r, v) => {
        this.isShuttingDown || console.warn(`[Supervisor] Sidecar exited unexpectedly with code ${r}, signal ${v}`), this.process = null;
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
      await new Promise((n) => setTimeout(n, 400));
    }
    return console.warn("[Supervisor] Sidecar health check timed out."), !1;
  }
  checkHealth() {
    return new Promise((e) => {
      const t = _.get(
        `http://${this.config.host}:${this.config.port}/health`,
        { timeout: 800 },
        (s) => {
          e(s.statusCode === 200);
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
          f("taskkill", ["/pid", String(this.process.pid), "/f", "/t"]);
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
const m = H.randomBytes(32).toString("hex"), S = 8e3, y = "127.0.0.1", d = new b({
  host: y,
  port: S,
  token: m
});
let a = null;
function g() {
  a = new w({
    width: 1360,
    height: 840,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#020617",
    webPreferences: {
      preload: o.join(__dirname, "../preload/index.js"),
      sandbox: !0,
      contextIsolation: !0,
      nodeIntegration: !1
    },
    title: "GESTURA - Offline Sign Language Assistant",
    autoHideMenuBar: !0
  }), E.defaultSession.webRequest.onHeadersReceived((i, e) => {
    e({
      responseHeaders: {
        ...i.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' blob: data:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; worker-src 'self' blob:;"
        ]
      }
    });
  }), process.env.VITE_DEV_SERVER_URL ? a.loadURL(process.env.VITE_DEV_SERVER_URL) : a.loadFile(o.join(__dirname, "../renderer/index.html")), a.on("closed", () => {
    a = null;
  });
}
x.handle("app:get-sidecar-config", () => ({
  port: S,
  token: m,
  host: y
}));
l.whenReady().then(async () => {
  await d.start(), g(), l.on("activate", () => {
    w.getAllWindows().length === 0 && g();
  });
});
l.on("before-quit", () => {
  d.stop();
});
process.on("exit", () => {
  d.stop();
});
l.on("window-all-closed", () => {
  process.platform !== "darwin" && l.quit();
});
