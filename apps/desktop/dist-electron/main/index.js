var _ = Object.defineProperty;
var k = (s, e, t) => e in s ? _(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var p = (s, e, t) => k(s, typeof e != "symbol" ? e + "" : e, t);
import E from "electron";
import o from "node:path";
import h from "node:fs";
import H from "node:crypto";
import { fileURLToPath as w } from "node:url";
import { spawn as m } from "node:child_process";
import T from "node:http";
const b = w(import.meta.url), j = o.dirname(b);
class $ {
  constructor(e) {
    p(this, "process", null);
    p(this, "config");
    p(this, "isShuttingDown", !1);
    this.config = e;
  }
  resolveRepoRoot() {
    let e = process.cwd();
    for (let t = 0; t < 5; t++) {
      if (h.existsSync(o.join(e, "services", "sidecar")))
        return e;
      e = o.resolve(e, "..");
    }
    e = j;
    for (let t = 0; t < 6; t++) {
      if (h.existsSync(o.join(e, "services", "sidecar")))
        return e;
      e = o.resolve(e, "..");
    }
    return process.cwd();
  }
  resolvePythonExe(e) {
    const t = process.platform === "win32", i = t ? o.join(".venv", "Scripts", "python.exe") : o.join(".venv", "bin", "python"), c = [
      o.join(e, i),
      o.join(process.cwd(), i),
      o.resolve(e, "..", i)
    ];
    for (const a of c)
      if (h.existsSync(a))
        return a;
    return t ? "python" : "python3";
  }
  async start() {
    var a, f;
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
      }), (f = this.process.stderr) == null || f.on("data", (r) => {
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
      const t = T.get(
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
const P = w(import.meta.url), l = o.dirname(P), { app: d, BrowserWindow: S, ipcMain: U, session: I } = E, y = H.randomBytes(32).toString("hex"), v = 8e3, x = "127.0.0.1", u = new $({
  host: x,
  port: v,
  token: y
});
let n = null;
function g() {
  if (n = new S({
    width: 1360,
    height: 840,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#020617",
    webPreferences: {
      preload: h.existsSync(o.join(l, "../preload/index.cjs")) ? o.join(l, "../preload/index.cjs") : o.join(l, "../preload/index.js"),
      sandbox: !0,
      contextIsolation: !0,
      nodeIntegration: !1
    },
    title: "GESTURA - Offline Sign Language Assistant",
    autoHideMenuBar: !0
  }), I.defaultSession.webRequest.onHeadersReceived((s, e) => {
    e({
      responseHeaders: {
        ...s.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' blob: data:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; worker-src 'self' blob:;"
        ]
      }
    });
  }), process.env.VITE_DEV_SERVER_URL)
    n.loadURL(process.env.VITE_DEV_SERVER_URL);
  else {
    const s = o.join(l, "../../dist/index.html");
    h.existsSync(s) ? n.loadFile(s) : n.loadFile(o.join(l, "../renderer/index.html"));
  }
  n.on("closed", () => {
    n = null;
  });
}
U.handle("app:get-sidecar-config", () => ({
  port: v,
  token: y,
  host: x
}));
d.whenReady().then(async () => {
  await u.start(), g(), d.on("activate", () => {
    S.getAllWindows().length === 0 && g();
  });
});
d.on("before-quit", () => {
  u.stop();
});
process.on("exit", () => {
  u.stop();
});
d.on("window-all-closed", () => {
  process.platform !== "darwin" && d.quit();
});
