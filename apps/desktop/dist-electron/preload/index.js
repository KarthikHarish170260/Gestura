import e from "electron";
const { contextBridge: r, ipcRenderer: i } = e, o = {
  getSidecarConfig: () => i.invoke("app:get-sidecar-config")
};
r.exposeInMainWorld("gesturaBridge", o);
