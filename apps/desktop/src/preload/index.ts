import electron from 'electron';

const { contextBridge, ipcRenderer } = electron;

export interface SidecarConfig {
  port: number;
  token: string;
  host: string;
}

export interface GesturaBridge {
  getSidecarConfig: () => Promise<SidecarConfig>;
}

const bridge: GesturaBridge = {
  getSidecarConfig: () => ipcRenderer.invoke('app:get-sidecar-config'),
};

contextBridge.exposeInMainWorld('gesturaBridge', bridge);
