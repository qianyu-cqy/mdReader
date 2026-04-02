const { BrowserWindow, ipcMain } = require('electron');
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
    // 禁用 Electron 内置 pinch-to-zoom，改由渲染进程自行处理 PDF 缩放
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  });

  // 将 findInPage 的搜索结果转发给渲染进程
  mainWindow.webContents.on('found-in-page', (event, result) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('found-in-page-result', result);
    }
  });

  // 拦截窗口关闭事件，检查未保存修改
  mainWindow.on('close', (e) => {
    // 如果已经确认关闭，直接放行
    if (mainWindow._forceClose) return;

    e.preventDefault();
    // 向渲染进程询问是否可以关闭
    mainWindow.webContents.send('before-close');
  });

  // IPC handlers 只需注册一次
  if (!ipcRegistered) {
    registerIpcHandlers(mainWindow);

    // 渲染进程回复是否允许关闭
    ipcMain.on('close-confirmed', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow._forceClose = true;
        mainWindow.close();
      }
    });

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
