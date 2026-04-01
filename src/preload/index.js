const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readFileBinary: (filePath) => ipcRenderer.invoke('read-file-binary', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (filePath) => ipcRenderer.invoke('add-history', filePath),
  removeHistory: (filePath) => ipcRenderer.invoke('remove-history', filePath),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  onOpenFile: (callback) => ipcRenderer.on('open-file', (event, path) => callback(path)),
  onSaveFile: (callback) => ipcRenderer.on('save-file', () => callback()),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', () => callback()),
  onBeforeClose: (callback) => ipcRenderer.on('before-close', () => callback()),
  confirmClose: () => ipcRenderer.send('close-confirmed'),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  showUnsavedDialog: (fileName) => ipcRenderer.invoke('show-unsaved-dialog', fileName),
  platform: process.platform  // 'darwin', 'win32', 'linux'
});
