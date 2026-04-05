import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('flightTrackerDesktop', {
  platform: process.platform,
  desktop: true,
  getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
})
