const { app, dialog, Menu } = require('electron');

/**
 * 创建应用菜单
 * @param {BrowserWindow} mainWindow - 主窗口引用
 */
function createMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS 上第一个菜单是应用名菜单
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: '关于 MD Reader', role: 'about' },
        { type: 'separator' },
        { label: '设置…', accelerator: 'Cmd+,', enabled: false },
        { type: 'separator' },
        { label: '隐藏 MD Reader', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '全部显示', role: 'unhide' },
        { type: 'separator' },
        { label: '退出 MD Reader', role: 'quit' }
      ]
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
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
              mainWindow.webContents.send('open-file', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        ...(isMac ? [
          { label: '关闭窗口', role: 'close' }
        ] : [
          { label: '退出', role: 'quit' }
        ])
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        ...(isMac ? [
          { label: '全选', role: 'selectAll' },
          { type: 'separator' },
          {
            label: '语音',
            submenu: [
              { label: '开始听写', role: 'startSpeaking' },
              { label: '停止听写', role: 'stopSpeaking' }
            ]
          }
        ] : [
          { label: '全选', role: 'selectAll' }
        ])
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        ...(isMac ? [
          { label: '缩放', role: 'zoom' },
          { type: 'separator' },
          { label: '前置全部窗口', role: 'front' }
        ] : [
          { label: '关闭', role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
