import { contextBridge as e, ipcRenderer as i } from "electron";
const r = {
  getSidecarConfig: () => i.invoke("app:get-sidecar-config")
};
e.exposeInMainWorld("gesturaBridge", r);
