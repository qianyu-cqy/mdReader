import dom from './dom.js';
import { getFileType, escapeHtml } from './utils.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderPlainText } from './renderers/plaintext.js';
import { loadPdfFile } from './renderers/pdf.js';
import { refreshHistory } from './history.js';

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
 * 打开文件对话框
 */
export async function openFile() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    await loadFile(filePath);
  }
}

/**
 * 加载文件（根据类型分发到对应渲染器）
 * @param {string} filePath - 文件路径
 */
export async function loadFile(filePath) {
  const fileType = getFileType(filePath);

  if (fileType === 'pdf') {
    await loadPdfFile(filePath);
  } else {
    const result = await window.electronAPI.readFile(filePath);
    if (result.success) {
      if (fileType === 'txt') {
        renderPlainText(result.content, result.path);
      } else {
        renderMarkdown(result.content, result.path);
      }
      await window.electronAPI.addHistory(result.path);
      await refreshHistory();
    } else {
      showError(result.error);
    }
  }
}
