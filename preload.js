const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (dataStr, filename) => ipcRenderer.invoke('save-data', dataStr, filename)
});
