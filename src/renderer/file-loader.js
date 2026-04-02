import dom from './dom.js';
import state, { findTabByPath } from './state.js';
import { getFileType, escapeHtml } from './utils.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderPlainText } from './renderers/plaintext.js';
import { loadPdfFile } from './renderers/pdf.js';
import { refreshHistory } from './history.js';
import { showModeToggle } from './source-mode.js';
import { createTab, switchToTab, snapshotCurrentTab } from './tab.js';

/**
 * 显示错误信息
 * @param {string} message
 */
function showError(message) {
  dom.content.innerHTML = `
    <div class="error">
      <h2>❌ 错误</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * 打开文件对话框（支持多选）
 */
export async function openFile() {
  const filePaths = await window.electronAPI.openFileDialog();
  if (filePaths && filePaths.length > 0) {
    for (const filePath of filePaths) {
      await loadFile(filePath);
    }
  }
}

/**
 * 加载文件（根据类型分发到对应渲染器）
 * 如果文件已在标签页中打开，则切换到该标签页
 * 否则创建新标签页
 * @param {string} filePath - 文件路径
 */
export async function loadFile(filePath) {
  // 检查文件是否已经打开
  const existingTab = findTabByPath(filePath);
  if (existingTab) {
    // 切换到已有标签
    await switchToTab(existingTab.id);
    return;
  }

  // 保存当前 tab 的快照（如果有的话）
  snapshotCurrentTab();

  const fileType = getFileType(filePath);

  // 创建新标签页
  createTab(filePath, fileType);

  // 渲染内容
  await renderFileContent(filePath, fileType);

  // 添加历史
  await window.electronAPI.addHistory(filePath);
  await refreshHistory();

  // 开始监听文件外部修改
  await window.electronAPI.watchFile(filePath);
}

/**
 * 渲染文件内容（供 loadFile 和 reloadTab 共用）
 * @param {string} filePath - 文件路径
 * @param {string} fileType - 文件类型
 * @param {string} [rawContent] - 已有的原始内容（切换标签恢复时使用）
 */
async function renderFileContent(filePath, fileType, rawContent) {
  // 非 PDF 时移除缩放工具栏
  if (fileType !== 'pdf') {
    const zoomToolbar = document.getElementById('pdfZoomToolbar');
    if (zoomToolbar) zoomToolbar.remove();
  }

  if (fileType === 'pdf') {
    showModeToggle(false);
    await loadPdfFile(filePath);
  } else if (fileType === 'txt') {
    if (rawContent !== undefined) {
      renderPlainText(rawContent, filePath);
    } else {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        renderPlainText(result.content, result.path);
      } else {
        showError(result.error);
      }
    }
  } else {
    // markdown
    if (rawContent !== undefined) {
      renderMarkdown(rawContent, filePath);
    } else {
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        renderMarkdown(result.content, result.path);
      } else {
        showError(result.error);
      }
    }
  }
}

/**
 * 重新加载标签页内容（切换标签时调用）
 * @param {Object} tab - tab 数据对象
 */
export async function reloadTab(tab) {
  // 渲染期间禁用平滑滚动，避免内容变化触发滚动动画
  dom.content.style.scrollBehavior = 'auto';

  await renderFileContent(tab.filePath, tab.fileType, tab.rawContent);

  // 恢复 tab 快照中的 isDirty 和 viewMode
  // 因为 initSourceMode/initTxtEditMode 会重置 state.isDirty = false
  state.isDirty = tab.isDirty;
  state.viewMode = tab.viewMode;

  // 如果 tab 有脏标记，更新 DOM 显示
  if (tab.isDirty) {
    const { updateTabDirtyState } = await import('./tab.js');
    updateTabDirtyState();
  }

  // 渲染完成后恢复平滑滚动（由 switchToTab 在设置 scrollTop 后最终恢复）
  // 这里不恢复，留给 switchToTab 的 requestAnimationFrame 处理
}
