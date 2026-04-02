import dom from './dom.js';
import state from './state.js';

// 记录拖拽后的自定义宽度，以便展开时恢复
let _sidebarCustomWidth = null;

/**
 * 切换面板（如果当前已激活则关闭，否则打开）
 * @param {'explorer'|'outline'} panel
 */
export function togglePanel(panel) {
  if (state.activePanel === panel) {
    // 收起前：保存当前宽度（如果被拖拽过，会有内联 style.width）
    const inlineW = dom.primarySidebar.style.width;
    if (inlineW) {
      _sidebarCustomWidth = inlineW;
    }
    // 清除内联 width，让 .collapsed 的 CSS width:0 能生效
    dom.primarySidebar.style.width = '';
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
  // 恢复拖拽调整过的自定义宽度（如果有）
  if (_sidebarCustomWidth) {
    dom.primarySidebar.style.width = _sidebarCustomWidth;
  }
  dom.primarySidebar.classList.remove('collapsed');
  dom.sidebarSash.classList.remove('hidden');
  setActivityActive(panel);

  dom.panelExplorer.classList.toggle('hidden', panel !== 'explorer');
  dom.panelOutline.classList.toggle('hidden', panel !== 'outline');
}

/**
 * 获取/设置侧边栏自定义宽度（供外部模块使用）
 */
export function getSidebarCustomWidth() {
  return _sidebarCustomWidth;
}

export function setSidebarCustomWidth(w) {
  _sidebarCustomWidth = w;
}

/**
 * 设置 Activity Bar 的高亮状态
 * @param {'explorer'|'outline'|null} panel
 */
export function setActivityActive(panel) {
  dom.activityExplorer.classList.toggle('active', panel === 'explorer');
  dom.activityOutline.classList.toggle('active', panel === 'outline');
}
