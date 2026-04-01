import dom from './dom.js';
import state from './state.js';
import { escapeHtml, getFileIcon } from './utils.js';
import { findTabByPath } from './state.js';

// 延迟导入，避免循环依赖
let _loadFile = null;
let _closeTab = null;

/**
 * 设置关闭标签回调（由 index.js 在初始化时调用，解决循环依赖）
 * @param {Function} closeTabFn
 */
export function setCloseTabCallback(closeTabFn) {
  _closeTab = closeTabFn;
}

/**
 * 设置文件加载回调（由 file-loader 在初始化时调用，解决循环依赖）
 * @param {Function} loadFileFn
 */
export function setLoadFileCallback(loadFileFn) {
  _loadFile = loadFileFn;
}

/**
 * 刷新历史记录列表
 */
export async function refreshHistory() {
  const history = await window.electronAPI.getHistory();
  renderHistory(history);
}

/**
 * 渲染历史记录列表
 * @param {Array} history
 */
function renderHistory(history) {
  if (!history || history.length === 0) {
    dom.historyList.innerHTML = '<div class="empty-state-sm"><p>暂无浏览记录</p></div>';
    return;
  }

  dom.historyList.innerHTML = '';

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('data-path', item.path);
    if (item.path === state.currentPath) {
      el.classList.add('active');
    }

    const dirPath = item.path.substring(0, item.path.lastIndexOf('/')) || item.path.substring(0, item.path.lastIndexOf('\\'));
    const fileIcon = getFileIcon(item.name);

    el.innerHTML = `
      <span class="history-icon">${fileIcon}</span>
      <div class="history-item-info">
        <span class="history-item-name">${escapeHtml(item.name)}</span>
        <span class="history-item-path">${escapeHtml(dirPath)}</span>
      </div>
      <button class="history-item-delete" title="移除记录">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    el.addEventListener('click', async (e) => {
      if (e.target.closest('.history-item-delete')) return;

      const exists = await window.electronAPI.fileExists(item.path);
      if (!exists) {
        await window.electronAPI.removeHistory(item.path);
        await refreshHistory();
        return;
      }

      document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      if (_loadFile) await _loadFile(item.path);
    });

    const deleteBtn = el.querySelector('.history-item-delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // 如果该文件有对应的标签页，先关闭它
      const tab = findTabByPath(item.path);
      if (tab && _closeTab) {
        const closed = await _closeTab(tab.id);
        if (!closed) return; // 用户取消了（有未保存修改）
      }
      await window.electronAPI.removeHistory(item.path);
      await refreshHistory();
    });

    dom.historyList.appendChild(el);
  });
}

/**
 * 清空所有历史记录
 */
export async function clearAllHistory() {
  const history = await window.electronAPI.getHistory();
  if (!history || history.length === 0) return;

  const confirmed = confirm('确定要清空所有浏览记录吗？此操作不可撤销。');
  if (!confirmed) return;

  await window.electronAPI.clearHistory();
  await refreshHistory();
}
