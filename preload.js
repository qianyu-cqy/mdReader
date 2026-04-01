const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (filePath) => ipcRenderer.invoke('add-history', filePath),
  removeHistory: (filePath) => ipcRenderer.invoke('remove-history', filePath),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  onOpenFile: (callback) => ipcRenderer.on('open-file', (event, path) => callback(path)),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  platform: process.platform  // 'darwin', 'win32', 'linux'
});
