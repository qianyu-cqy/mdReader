import dom from './dom.js';
import state, { generateTabId, getActiveTab } from './state.js';
import { clearOutline, hideOutlinePanel } from './outline.js';
import { resetStatusBar } from './statusbar.js';
import { resetSourceMode, checkUnsavedChanges, showModeToggle } from './source-mode.js';
import { getFileName, getFileIcon } from './utils.js';

// 延迟导入，避免循环依赖
let _openFile = null;
let _reloadTab = null;

/**
 * 注入文件打开回调（由 index.js 在初始化时调用）
 */
export function setTabCallbacks(openFileFn, reloadTabFn) {
  _openFile = openFileFn;
  _reloadTab = reloadTabFn;
}

/**
 * 创建新标签页并激活
 * @param {string} filePath - 文件路径
 * @param {string} fileType - 文件类型
 * @param {string} [rawContent=''] - 原始内容
 * @returns {Object} 新创建的 tab 数据
 */
export function createTab(filePath, fileType, rawContent = '') {
  const fileName = getFileName(filePath);
  const icon = getFileIcon(fileName);

  const tab = {
    id: generateTabId(),
    filePath,
    fileType,
    fileName,
    icon,
    rawContent,
    viewMode: 'read',
    isDirty: false,
    scrollTop: 0,
  };

  state.tabs.push(tab);
  renderTabBar();
  activateTab(tab.id);
  return tab;
}

/**
 * 激活指定标签页（只更新 state，不渲染内容）
 * @param {string} tabId
 */
export function activateTab(tabId) {
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return;

  state.activeTabId = tabId;
  state.currentPath = tab.filePath;
  state.currentFileType = tab.fileType;
  state.rawContent = tab.rawContent;
  state.viewMode = tab.viewMode;
  state.isDirty = tab.isDirty;

  // 更新标签栏高亮
  updateTabBarHighlight();

  // 更新标题栏和面包屑
  dom.titlebarTitle.textContent = tab.fileName + ' — MD Reader';
  dom.currentPathDisplay.textContent = tab.filePath;
}

/**
 * 保存当前 tab 的状态快照（切换 tab 前调用）
 */
export function snapshotCurrentTab() {
  const tab = getActiveTab();
  if (!tab) return;

  // 保存滚动位置
  tab.scrollTop = dom.content.scrollTop;

  // 对 txt 文件，textarea 有自己的滚动条，需要额外保存
  const editor = document.getElementById('sourceEditor');
  if (editor && state.currentFileType === 'txt') {
    tab.editorScrollTop = editor.scrollTop;
  }

  // 同步 state → tab
  tab.rawContent = state.rawContent;
  tab.viewMode = state.viewMode;
  tab.isDirty = state.isDirty;
  tab.fileType = state.currentFileType;

  // 如果有编辑器，保存编辑器内容
  if (editor) {
    tab.rawContent = editor.value;
    state.rawContent = editor.value;
  }
}

/**
 * 关闭标签页
 * @param {string} tabId
 * @param {boolean} [force=false] - 是否强制关闭（不检查未保存修改）
 * @returns {Promise<boolean>} 是否关闭成功
 */
export async function closeTab(tabId, force = false) {
  const tabIndex = state.tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return false;

  const tab = state.tabs[tabIndex];

  // 如果关闭的是当前激活的标签页，先同步 state → tab
  if (tabId === state.activeTabId) {
    // 同步编辑器内容和脏标记
    const editor = document.getElementById('sourceEditor');
    if (editor) {
      tab.rawContent = editor.value;
    }
    tab.isDirty = state.isDirty;
    tab.viewMode = state.viewMode;
  }

  // 如果要关闭的标签有未保存修改
  if (!force && tab.isDirty) {
    // 先激活这个 tab
    if (state.activeTabId !== tabId) {
      await switchToTab(tabId);
    }
    const canClose = await checkUnsavedChanges();
    if (!canClose) return false;
    // checkUnsavedChanges 可能已经重置了 isDirty，同步到 tab
    tab.isDirty = state.isDirty;
  }

  // 移除 tab
  state.tabs.splice(tabIndex, 1);

  // 停止监听该文件的外部修改（如果没有其他标签页还在用它）
  const stillOpen = state.tabs.some(t => t.filePath === tab.filePath);
  if (!stillOpen) {
    window.electronAPI.unwatchFile(tab.filePath);
  }

  if (state.tabs.length === 0) {
    // 没有标签页了，显示欢迎页
    state.activeTabId = null;
    showWelcome();
  } else if (state.activeTabId === tabId) {
    // 关闭的是当前标签页，切换到相邻的
    const newIndex = Math.min(tabIndex, state.tabs.length - 1);
    await switchToTab(state.tabs[newIndex].id);
  } else {
    // 关闭的不是当前标签页，只需要刷新标签栏
    renderTabBar();
  }

  return true;
}

/**
 * 切换到指定标签页（保存当前 tab 快照，激活目标 tab 并重新渲染）
 * @param {string} tabId
 */
export async function switchToTab(tabId) {
  if (state.activeTabId === tabId) return;

  const targetTab = state.tabs.find(t => t.id === tabId);
  if (!targetTab) return;

  // 保存当前 tab 状态
  snapshotCurrentTab();

  // 激活目标 tab
  activateTab(tabId);

  // 重新渲染目标 tab 的内容
  if (_reloadTab) {
    await _reloadTab(targetTab);
  }

  // 恢复滚动位置（瞬间跳转，不使用平滑滚动）
  requestAnimationFrame(() => {
    dom.content.style.scrollBehavior = 'auto';
    dom.content.scrollTop = targetTab.scrollTop;

    // 对 txt 文件，还需要恢复 textarea 的滚动位置
    if (targetTab.fileType === 'txt' && targetTab.editorScrollTop != null) {
      const editor = document.getElementById('sourceEditor');
      if (editor) {
        editor.scrollTop = targetTab.editorScrollTop;
      }
    }

    // 下一帧恢复平滑滚动（供目录跳转等场景使用）
    requestAnimationFrame(() => {
      dom.content.style.scrollBehavior = '';
    });
  });

  // 更新历史列表高亮
  updateHistoryHighlight();
}

/**
 * 更新编辑器标签（兼容旧接口，供渲染器调用）
 * @param {string} fileName - 文件名
 * @param {string} [icon] - 图标 emoji
 */
export function updateEditorTab(fileName, icon) {
  const tab = getActiveTab();
  if (tab) {
    tab.fileName = fileName;
    if (icon) tab.icon = icon;
    renderTabBar();
  }
}

/**
 * 更新指定 tab 的脏标记
 * @param {string} [tabId] - 不传则更新当前 tab
 */
export function updateTabDirtyState(tabId) {
  const id = tabId || state.activeTabId;
  if (!id) return;

  const tab = state.tabs.find(t => t.id === id);
  if (!tab) return;

  // 同步 state → tab
  if (id === state.activeTabId) {
    tab.isDirty = state.isDirty;
  }

  // 更新 DOM
  const tabEl = document.querySelector(`.editor-tab[data-tab-id="${id}"]`);
  if (!tabEl) return;

  const labelEl = tabEl.querySelector('.editor-tab-label');
  if (labelEl) {
    labelEl.textContent = tab.isDirty ? '● ' + tab.fileName : tab.fileName;
  }
  tabEl.classList.toggle('dirty', tab.isDirty);
}

/**
 * 渲染整个标签栏
 */
function renderTabBar() {
  const scroll = dom.editorTabs.querySelector('.editor-tabs-scroll');
  if (!scroll) return;

  scroll.innerHTML = '';

  if (state.tabs.length === 0) {
    // 显示欢迎 tab
    scroll.innerHTML = `
      <div class="editor-tab active" data-tab-id="welcome">
        <span class="editor-tab-icon">📖</span>
        <span class="editor-tab-label">Welcome</span>
      </div>
    `;
    return;
  }

  state.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'editor-tab';
    el.setAttribute('data-tab-id', tab.id);
    if (tab.id === state.activeTabId) {
      el.classList.add('active');
    }
    if (tab.isDirty) {
      el.classList.add('dirty');
    }
    el.title = tab.filePath;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'editor-tab-icon';
    iconSpan.textContent = tab.icon;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'editor-tab-label';
    labelSpan.textContent = tab.isDirty ? '● ' + tab.fileName : tab.fileName;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'editor-tab-close';
    closeBtn.title = '关闭';
    closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;

    // 点击标签切换
    el.addEventListener('click', (e) => {
      if (e.target.closest('.editor-tab-close')) return;
      switchToTab(tab.id);
    });

    // 点击关闭
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    // 中键关闭
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tab.id);
      }
    });

    // 右键菜单
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTabContextMenu(e.clientX, e.clientY, tab.id);
    });

    el.appendChild(iconSpan);
    el.appendChild(labelSpan);
    el.appendChild(closeBtn);
    scroll.appendChild(el);
  });

  // 确保激活的 tab 可见
  scrollActiveTabIntoView();
}

/**
 * 更新标签栏高亮
 */
function updateTabBarHighlight() {
  const tabs = document.querySelectorAll('.editor-tab');
  tabs.forEach(el => {
    const id = el.getAttribute('data-tab-id');
    el.classList.toggle('active', id === state.activeTabId);
  });
}

/**
 * 确保激活的 tab 滚动到可见区域
 */
function scrollActiveTabIntoView() {
  requestAnimationFrame(() => {
    const activeEl = document.querySelector(`.editor-tab[data-tab-id="${state.activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
}

/**
 * 更新侧边栏历史列表高亮（与当前激活的标签页同步）
 */
function updateHistoryHighlight() {
  document.querySelectorAll('.history-item').forEach(el => {
    const path = el.getAttribute('data-path');
    el.classList.toggle('active', path === state.currentPath);
  });
}

/**
 * 关闭当前标签页
 */
export async function closeCurrentTab() {
  if (state.activeTabId) {
    await closeTab(state.activeTabId);
  }
}

/**
 * 显示欢迎页
 */
function showWelcome() {
  resetSourceMode();
  state.currentPath = '';
  state.currentFileType = '';
  state.activeTabId = null;

  // 移除 PDF 缩放工具栏
  const zoomToolbar = document.getElementById('pdfZoomToolbar');
  if (zoomToolbar) zoomToolbar.remove();

  dom.titlebarTitle.textContent = 'MD Reader';
  dom.currentPathDisplay.textContent = 'MD Reader';

  const isMac = window.electronAPI.platform === 'darwin';
  const mod = isMac ? '⌘' : 'Ctrl+';
  const shift = isMac ? '⇧ ' : 'Shift+';

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
          <kbd>${mod}O</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">保存文件</span>
          <kbd>${mod}S</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">切换侧栏</span>
          <kbd>${mod}B</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">资源管理器</span>
          <kbd>${mod}${shift}E</kbd>
        </div>
      </div>
      <p class="welcome-hint">拖拽 .md / .txt / .pdf 文件到窗口即可打开</p>
    </div>
  `;

  const welcomeBtn = document.getElementById('welcomeOpenBtn');
  if (welcomeBtn && _openFile) {
    welcomeBtn.addEventListener('click', _openFile);
  }

  clearOutline('打开文件后显示大纲');
  hideOutlinePanel();
  showModeToggle(false);
  resetStatusBar();
  renderTabBar();
  updateHistoryHighlight();
}

/**
 * 关闭其他标签页（保留指定的标签页）
 * @param {string} keepTabId - 要保留的标签页 ID
 */
async function closeOtherTabs(keepTabId) {
  // 先同步当前标签状态
  snapshotCurrentTab();

  // 只对有未保存修改的标签逐个确认
  const tabsToClose = state.tabs.filter(t => t.id !== keepTabId);
  for (const tab of tabsToClose) {
    if (tab.isDirty) {
      const fileName = getFileName(tab.filePath);
      const response = await window.electronAPI.showUnsavedDialog(fileName);
      if (response === 0) {
        // 保存
        if (tab.fileType === 'markdown' || tab.fileType === 'txt') {
          const result = await window.electronAPI.writeFile(tab.filePath, tab.rawContent);
          if (!result.success) return; // 保存失败，中止
        }
      } else if (response === 2) {
        return; // 取消，中止
      }
      // 放弃修改，继续
    }
    // 停止文件监听
    const stillNeeded = tab.filePath === state.tabs.find(t => t.id === keepTabId)?.filePath;
    if (!stillNeeded) {
      window.electronAPI.unwatchFile(tab.filePath);
    }
  }

  // 批量移除，只保留指定标签
  state.tabs = state.tabs.filter(t => t.id === keepTabId);

  // 如果保留的不是当前激活的，切换过去
  if (state.activeTabId !== keepTabId) {
    await switchToTab(keepTabId);
  } else {
    renderTabBar();
  }
}

/**
 * 关闭所有标签页
 */
async function closeAllTabs() {
  // 先同步当前标签状态
  snapshotCurrentTab();

  // 只对有未保存修改的标签逐个确认
  for (const tab of [...state.tabs]) {
    if (tab.isDirty) {
      const fileName = getFileName(tab.filePath);
      const response = await window.electronAPI.showUnsavedDialog(fileName);
      if (response === 0) {
        // 保存
        if (tab.fileType === 'markdown' || tab.fileType === 'txt') {
          const result = await window.electronAPI.writeFile(tab.filePath, tab.rawContent);
          if (!result.success) return; // 保存失败，中止
        }
      } else if (response === 2) {
        return; // 取消，中止
      }
    }
    // 停止文件监听
    window.electronAPI.unwatchFile(tab.filePath);
  }

  // 批量清空所有标签
  state.tabs = [];
  state.activeTabId = null;
  showWelcome();
}

/**
 * 显示标签页右键菜单
 * @param {number} x - 鼠标 x 坐标
 * @param {number} y - 鼠标 y 坐标
 * @param {string} tabId - 右键点击的标签页 ID
 */
function showTabContextMenu(x, y, tabId) {
  // 移除已有的右键菜单
  removeTabContextMenu();

  const menu = document.createElement('div');
  menu.className = 'tab-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const items = [
    { label: '关闭', action: () => closeTab(tabId) },
    { label: '关闭其他标签页', action: () => closeOtherTabs(tabId), disabled: state.tabs.length <= 1 },
    { label: '关闭所有标签页', action: () => closeAllTabs() },
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'tab-context-menu-item';
    if (item.disabled) el.classList.add('disabled');
    el.textContent = item.label;
    if (!item.disabled) {
      el.addEventListener('click', () => {
        removeTabContextMenu();
        item.action();
      });
    }
    menu.appendChild(el);
  });

  document.body.appendChild(menu);

  // 确保菜单不超出视窗
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (window.innerHeight - rect.height - 4) + 'px';
    }
  });

  // 点击其他位置关闭菜单
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      removeTabContextMenu();
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler, { once: true }), 0);
}

/**
 * 移除右键菜单
 */
function removeTabContextMenu() {
  const existing = document.querySelector('.tab-context-menu');
  if (existing) existing.remove();
}

/**
 * 初始化标签栏（应用启动时调用）
 */
export function initTabBar() {
  renderTabBar();
}
