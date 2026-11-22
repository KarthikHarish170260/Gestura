import { ipcMain as a, app as n, BrowserWindow as i, session as l } from "electron";
import o from "node:path";
import d from "node:crypto";
const c = d.randomBytes(32).toString("hex");
let e = null;
function t() {
  e = new i({
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
  }), l.defaultSession.webRequest.onHeadersReceived((r, s) => {
    s({
      responseHeaders: {
        ...r.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' blob: data:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; worker-src 'self' blob:;"
        ]
      }
    });
  }), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(o.join(__dirname, "../renderer/index.html")), e.on("closed", () => {
    e = null;
  });
}
a.handle("app:get-sidecar-config", () => ({
  port: 8e3,
  token: c,
  host: "127.0.0.1"
}));
n.whenReady().then(() => {
  t(), n.on("activate", () => {
    i.getAllWindows().length === 0 && t();
  });
});
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
