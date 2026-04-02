import state from './state.js';
import { togglePanel, showPanel } from './sidebar.js';
import { saveCurrentFile } from './source-mode.js';
import { toggleSearch, isSearchVisible, hideSearch } from './search.js';

/**
 * 注册键盘快捷键
 */
export function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + S → 保存文件
    if (isMod && e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }

    // Cmd/Ctrl + B → 切换侧边栏
    if (isMod && e.key === 'b') {
      e.preventDefault();
      if (state.activePanel) {
        togglePanel(state.activePanel);
      } else {
        showPanel('explorer');
      }
    }

    // Cmd/Ctrl + Shift + E → 资源管理器
    if (isMod && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      togglePanel('explorer');
    }

    // Cmd/Ctrl + F → 页内搜索
    if (isMod && e.key === 'f') {
      e.preventDefault();
      toggleSearch();
    }

    // Esc → 关闭搜索栏（仅在搜索输入框不在焦点时）
    if (e.key === 'Escape' && isSearchVisible()) {
      // 搜索输入框内的 Esc 已在 search.js 中处理
      const active = document.activeElement;
      if (!active || !active.classList.contains('search-input')) {
        hideSearch();
      }
    }
  });
}
