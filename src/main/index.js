const { app, BrowserWindow } = require('electron');
const { createWindow, getMainWindow } = require('./window');
const { getFileFromArgs } = require('./file-utils');

let fileToOpenOnReady = null; // 保存启动时传入的文件路径

// macOS: 应用启动前（或已运行时）通过 Finder 打开文件
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('open-file', filePath);
  } else {
    fileToOpenOnReady = filePath;
    if (app.isReady() && (!mainWindow || mainWindow.isDestroyed())) {
      const win = createWindow();
      win.webContents.once('did-finish-load', () => {
        win.webContents.send('open-file', fileToOpenOnReady);
        fileToOpenOnReady = null;
      });
    }
  }
});

// 确保单实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Windows: 第二个实例启动时，把文件路径传给已有窗口
  app.on('second-instance', (event, argv) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const filePath = getFileFromArgs(argv);
      if (filePath) {
        mainWindow.webContents.send('open-file', filePath);
      }
    }
  });

  app.whenReady().then(() => {
    const mainWindow = createWindow();

    mainWindow.webContents.once('did-finish-load', () => {
      // macOS: 处理启动前收到的 open-file 事件
      if (fileToOpenOnReady) {
        mainWindow.webContents.send('open-file', fileToOpenOnReady);
        fileToOpenOnReady = null;
      }

      // Windows: 处理命令行参数中的文件路径
      if (process.platform === 'win32') {
        const filePath = getFileFromArgs(process.argv);
        if (filePath) {
          mainWindow.webContents.send('open-file', filePath);
        }
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
