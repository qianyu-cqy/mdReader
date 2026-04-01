import dom from './dom.js';
import state from './state.js';
import { initTheme, toggleTheme } from './theme.js';
import { togglePanel, showPanel } from './sidebar.js';
import { setupSashResize } from './sash.js';
import { onContentScroll } from './outline.js';
import { refreshHistory, clearAllHistory, setLoadFileCallback } from './history.js';
import { openFile, loadFile } from './file-loader.js';
import { closeCurrentTab } from './tab.js';
import { setupKeyboard } from './keyboard.js';
import { setupDragDrop } from './dragdrop.js';
import { initMarked } from './renderers/markdown.js';
import { toggleMode, checkUnsavedChanges, saveCurrentFile } from './source-mode.js';

// ===== 初始化 =====
async function init() {
  // 初始化 marked
  initMarked();

  // 注入 loadFile 回调到 history 模块（解决循环依赖）
  setLoadFileCallback(loadFile);

  // 根据平台调整 UI
  const isWindows = window.electronAPI.platform === 'win32';
  if (isWindows) {
    if (dom.titlebar) dom.titlebar.style.display = 'none';
    if (dom.breadcrumbBar) dom.breadcrumbBar.style.display = 'none';
  }

  // 文件打开按钮
  dom.openFileBtn.addEventListener('click', openFile);
  dom.welcomeOpenBtn.addEventListener('click', openFile);

  // 模式切换按钮
  dom.modeToggleBtn.addEventListener('click', toggleMode);

  // Activity bar 面板切换
  dom.activityExplorer.addEventListener('click', () => togglePanel('explorer'));
  dom.activityOutline.addEventListener('click', () => togglePanel('outline'));

  // 清空历史
  dom.clearHistoryBtn.addEventListener('click', clearAllHistory);

  // 折叠区域
  dom.recentFilesToggle.addEventListener('click', () => {
    dom.recentFilesToggle.classList.toggle('collapsed');
    const body = dom.recentFilesToggle.nextElementSibling;
    body.classList.toggle('collapsed');
  });

  // 主题
  initTheme();
  dom.toggleThemeBtn.addEventListener('click', toggleTheme);

  // 大纲关闭
  dom.closeOutlineBtn.addEventListener('click', () => {
    dom.outlinePanel.classList.add('hidden');
    dom.outlineSash.classList.add('hidden');
    dom.activityOutline.classList.remove('active');
  });

  // 标签页关闭
  const tabCloseBtn = dom.welcomeTab.querySelector('.editor-tab-close');
  tabCloseBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const canClose = await checkUnsavedChanges();
    if (canClose) {
      closeCurrentTab();
    }
  });

  // Sash 拖拽
  setupSashResize(dom.sidebarSash, dom.primarySidebar, 'left', 150, 450);
  setupSashResize(dom.outlineSash, dom.outlinePanel, 'right', 130, 400);

  // 滚动同步大纲
  dom.content.addEventListener('scroll', onContentScroll);

  // 菜单打开文件
  window.electronAPI.onOpenFile(async (filePath) => {
    await loadFile(filePath);
  });

  // 菜单保存文件
  window.electronAPI.onSaveFile(async () => {
    await saveCurrentFile();
  });

  // 窗口关闭前检查未保存修改
  window.addEventListener('beforeunload', (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // 拖放
  setupDragDrop();

  // 键盘快捷键
  setupKeyboard();

  // 加载历史
  await refreshHistory();

  // 默认显示侧边栏
  showPanel('explorer');
  dom.sidebarSash.classList.remove('hidden');
}

// 启动
init();
