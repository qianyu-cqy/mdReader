const { BrowserWindow } = require('electron');
const path = require('path');
const { createMenu } = require('./menu');
const { registerIpcHandlers } = require('./ipc');

let mainWindow = null;
let ipcRegistered = false;

/**
 * 创建主窗口
 * @returns {BrowserWindow}
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // IPC handlers 只需注册一次
  if (!ipcRegistered) {
    registerIpcHandlers(mainWindow);
    ipcRegistered = true;
  }

  createMenu(mainWindow);

  return mainWindow;
}

/**
 * 获取主窗口实例
 * @returns {BrowserWindow|null}
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  getMainWindow,
};
