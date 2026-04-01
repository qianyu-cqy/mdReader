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

  // 打开文件对话框（支持多选）
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '所有支持的文件', extensions: ['md', 'markdown', 'txt', 'pdf'] },
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: '文本文件', extensions: ['txt'] },
        { name: 'PDF 文件', extensions: ['pdf'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return null;
  });

  // 写入文件
  ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  // 未保存修改确认弹窗
  ipcMain.handle('show-unsaved-dialog', async (event, fileName) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: '未保存的修改',
      message: `"${fileName}" 有未保存的修改，是否保存？`,
      buttons: ['保存', '放弃', '取消'],
      defaultId: 0,
      cancelId: 2,
    });
    // result.response: 0=保存, 1=放弃, 2=取消
    return result.response;
  });
}

module.exports = { registerIpcHandlers };
