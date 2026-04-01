const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { readHistory, writeHistory } = require('./history');

/**
 * 注册所有 IPC handlers
 * @param {BrowserWindow} mainWindow - 主窗口引用（用于 dialog 的 parent）
 */
function registerIpcHandlers(mainWindow) {
  // 读取文本文件
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 检查文件是否存在
  ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
  });

  // 获取历史记录
  ipcMain.handle('get-history', async () => {
    return readHistory();
  });

  // 添加历史记录
  ipcMain.handle('add-history', async (event, filePath) => {
    const history = readHistory();
    const existingIndex = history.findIndex(item => item.path === filePath);

    if (existingIndex === -1) {
      history.unshift({
        path: filePath,
        name: path.basename(filePath),
        openedAt: Date.now()
      });
      const trimmed = history.slice(0, 100);
      writeHistory(trimmed);
      return trimmed;
    }

    return history;
  });

  // 移除历史记录
  ipcMain.handle('remove-history', async (event, filePath) => {
    const history = readHistory();
    const filtered = history.filter(item => item.path !== filePath);
    writeHistory(filtered);
    return filtered;
  });

  // 打开文件对话框
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: '所有支持的文件', extensions: ['md', 'markdown', 'txt', 'pdf'] },
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'PDF 文件', extensions: ['pdf'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 读取 PDF 文件二进制数据
  ipcMain.handle('read-file-binary', async (event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return { success: true, data: buffer.buffer, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };
