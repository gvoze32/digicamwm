const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  selectFolder: (purpose) => ipcRenderer.invoke("select-folder", purpose),
  startProcessing: (options) => ipcRenderer.invoke("start-processing", options),
  onProcessStatus: (callback) => {
    ipcRenderer.on("process-status", (event, data) => callback(data));
  },
  onImageProcessed: (callback) => {
    ipcRenderer.on("image-processed", (event, data) => callback(data));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (event, data) => callback(data));
  },
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", url),
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("process-status");
    ipcRenderer.removeAllListeners("image-processed");
    ipcRenderer.removeAllListeners("update-available");
  },
  // New methods for design selection
  getDesigns: () => ipcRenderer.invoke("get-designs"),
  setDesign: (designId) => ipcRenderer.invoke("set-design", designId),
  getCurrentDesign: () => ipcRenderer.invoke("get-current-design"),
});
