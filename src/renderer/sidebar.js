import dom from './dom.js';
import state from './state.js';

/**
 * 切换面板（如果当前已激活则关闭，否则打开）
 * @param {'explorer'|'outline'} panel
 */
export function togglePanel(panel) {
  if (state.activePanel === panel) {
    // 关闭侧边栏
    dom.primarySidebar.classList.add('collapsed');
    dom.sidebarSash.classList.add('hidden');
    setActivityActive(null);
    state.activePanel = null;
  } else {
    showPanel(panel);
  }
}

/**
 * 显示指定面板
 * @param {'explorer'|'outline'} panel
 */
export function showPanel(panel) {
  state.activePanel = panel;
  dom.primarySidebar.classList.remove('collapsed');
  dom.sidebarSash.classList.remove('hidden');
  setActivityActive(panel);

  dom.panelExplorer.classList.toggle('hidden', panel !== 'explorer');
  dom.panelOutline.classList.toggle('hidden', panel !== 'outline');
}

/**
 * 设置 Activity Bar 的高亮状态
 * @param {'explorer'|'outline'|null} panel
 */
export function setActivityActive(panel) {
  dom.activityExplorer.classList.toggle('active', panel === 'explorer');
  dom.activityOutline.classList.toggle('active', panel === 'outline');
}
