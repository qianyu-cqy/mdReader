const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let fileToOpenOnReady = null; // 保存启动时传入的文件路径

// macOS: 应用启动前（或已运行时）通过 Finder 打开文件
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    // 应用已经启动且窗口可用，直接发送给渲染进程
    mainWindow.webContents.send('open-file', filePath);
  } else {
    // 应用还没启动完或窗口已销毁，先保存路径
    fileToOpenOnReady = filePath;
    // 如果应用已 ready 但窗口被关了（macOS 常见），重新创建窗口
    if (app.isReady() && (!mainWindow || mainWindow.isDestroyed())) {
      createWindow();
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('open-file', fileToOpenOnReady);
        fileToOpenOnReady = null;
      });
    }
  }
});

// 从命令行参数中提取 .md/.markdown 文件路径
function getFileFromArgs(args) {
  for (const arg of args) {
    if (arg && !arg.startsWith('-') && !arg.startsWith('--')) {
      const lower = arg.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
        return arg;
      }
    }
  }
  return null;
}

// 历史记录文件路径
function getHistoryPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

function readHistory() {
  try {
    const data = fs.readFileSync(getHistoryPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeHistory(history) {
  fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('open-file', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 确保单实例（Windows 下双击文件打开时不会创建新窗口）
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Windows: 第二个实例启动时，把文件路径传给已有窗口
  app.on('second-instance', (event, argv) => {
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
    createWindow();

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

// IPC handlers
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('get-history', async () => {
  return readHistory();
});

ipcMain.handle('add-history', async (event, filePath) => {
  const history = readHistory();
  // 检查是否已存在该文件
  const existingIndex = history.findIndex(item => item.path === filePath);
  
  if (existingIndex === -1) {
    // 如果不存在，添加到最前面（首次打开）
    history.unshift({
      path: filePath,
      name: path.basename(filePath),
      openedAt: Date.now()
    });
    // 最多保留 100 条
    const trimmed = history.slice(0, 100);
    writeHistory(trimmed);
    return trimmed;
  }
  
  // 如果已存在，不改变顺序，直接返回
  return history;
});

ipcMain.handle('remove-history', async (event, filePath) => {
  const history = readHistory();
  const filtered = history.filter(item => item.path !== filePath);
  writeHistory(filtered);
  return filtered;
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
