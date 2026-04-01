import dom from '../dom.js';
import state from '../state.js';
import { escapeHtml, getFileName } from '../utils.js';
import { updateEditorTab } from '../tab.js';
import { clearOutline } from '../outline.js';
import { updateStatusBar } from '../statusbar.js';

/**
 * 渲染纯文本文件
 * @param {string} text - 文本内容
 * @param {string} filePath - 文件路径
 */
export function renderPlainText(text, filePath) {
  state.currentPath = filePath;
  state.currentFileType = 'txt';

  const fileName = getFileName(filePath);

  // 更新 UI
  dom.currentPathDisplay.textContent = filePath;
  dom.titlebarTitle.textContent = fileName + ' — MD Reader';
  updateEditorTab(fileName, '📝');

  // 渲染内容
  const escapedText = escapeHtml(text);
  dom.content.innerHTML = `<div class="plaintext-body"><pre class="plaintext-pre">${escapedText}</pre></div>`;

  // 清空大纲
  clearOutline('纯文本文件无大纲');

  // 更新状态栏
  updateStatusBar(text, fileName);
}
