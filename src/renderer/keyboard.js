import dom from './dom.js';
import state from './state.js';
import { togglePanel, showPanel, setActivityActive } from './sidebar.js';

/**
 * 注册键盘快捷键
 */
export function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + B → 切换侧边栏
    if (isMod && e.key === 'b') {
      e.preventDefault();
      if (state.activePanel) {
        dom.primarySidebar.classList.add('collapsed');
        dom.sidebarSash.classList.add('hidden');
        setActivityActive(null);
        state.activePanel = null;
      } else {
        showPanel('explorer');
      }
    }

    // Cmd/Ctrl + Shift + E → 资源管理器
    if (isMod && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      togglePanel('explorer');
    }
  });
}
