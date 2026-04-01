import dom from './dom.js';
import state from './state.js';
import { clearOutline } from './outline.js';
import { resetStatusBar } from './statusbar.js';
import { openFile } from './file-loader.js';
import { resetSourceMode } from './source-mode.js';

/**
 * 更新编辑器标签页
 * @param {string} fileName - 文件名
 * @param {string} [icon] - 图标 emoji
 */
export function updateEditorTab(fileName, icon) {
  dom.welcomeTab.querySelector('.editor-tab-icon').textContent = icon || '📄';
  dom.welcomeTab.querySelector('.editor-tab-label').textContent = fileName;
  dom.welcomeTab.title = fileName;
}

/**
 * 关闭当前标签页，恢复欢迎页
 */
export function closeCurrentTab() {
  // 重置源码模式
  resetSourceMode();

  // 重置状态
  state.currentPath = '';
  state.currentFileType = '';

  // 恢复标签
  dom.welcomeTab.querySelector('.editor-tab-icon').textContent = '📖';
  dom.welcomeTab.querySelector('.editor-tab-label').textContent = 'Welcome';
  dom.welcomeTab.title = '';

  // 重置标题栏
  dom.titlebarTitle.textContent = 'MD Reader';

  // 重置面包屑
  dom.currentPathDisplay.textContent = 'MD Reader';

  // 恢复欢迎内容
  dom.content.innerHTML = `
    <div class="welcome">
      <h1>MD Reader</h1>
      <div class="welcome-actions">
        <button class="welcome-btn" id="welcomeOpenBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          打开文件
        </button>
      </div>
      <div class="welcome-shortcuts">
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">打开文件</span>
          <kbd>⌘ O</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">保存文件</span>
          <kbd>⌘ S</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">切换侧栏</span>
          <kbd>⌘ B</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">资源管理器</span>
          <kbd>⌘ ⇧ E</kbd>
        </div>
      </div>
      <p class="welcome-hint">拖拽 .md / .txt / .pdf 文件到窗口即可打开</p>
    </div>
  `;

  // 重新绑定欢迎页按钮
  const newWelcomeOpenBtn = document.getElementById('welcomeOpenBtn');
  if (newWelcomeOpenBtn) {
    newWelcomeOpenBtn.addEventListener('click', openFile);
  }

  // 清空大纲
  clearOutline('打开文件后显示大纲');

  // 隐藏大纲面板
  dom.outlinePanel.classList.add('hidden');
  dom.outlineSash.classList.add('hidden');

  // 重置状态栏
  resetStatusBar();

  // 取消历史项高亮
  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
}
