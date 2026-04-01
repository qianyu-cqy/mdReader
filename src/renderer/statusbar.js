import dom from './dom.js';
import state from './state.js';
import { escapeHtml } from './utils.js';

const FILE_ICON_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
`;

const TYPE_LABELS = {
  markdown: 'Markdown',
  txt: '纯文本',
  pdf: 'PDF',
};

/**
 * 更新状态栏（文本文件用）
 * @param {string} textContent - 文件内容
 * @param {string} fileName - 文件名
 */
export function updateStatusBar(textContent, fileName) {
  const text = textContent.replace(/[#*`\[\]()>_~|\\-]/g, ' ');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = textContent.length;

  dom.statusFileInfo.innerHTML = `${FILE_ICON_SVG} ${escapeHtml(fileName)}`;
  dom.statusWordCount.textContent = `字数: ${chars} | 词数: ${words}`;
  dom.statusType.textContent = TYPE_LABELS[state.currentFileType] || '--';
}

/**
 * 更新状态栏（PDF 文件用）
 * @param {string} fileName - 文件名
 * @param {number} totalPages - 总页数
 */
export function updateStatusBarForPdf(fileName, totalPages) {
  dom.statusFileInfo.innerHTML = `${FILE_ICON_SVG} ${escapeHtml(fileName)}`;
  dom.statusWordCount.textContent = `第 1/${totalPages} 页`;
  dom.statusType.textContent = 'PDF';
}

/**
 * 更新 PDF 状态栏中的当前页码
 * @param {number} currentPage - 当前页码 (1-based)
 * @param {number} totalPages - 总页数
 */
export function updatePdfCurrentPage(currentPage, totalPages) {
  dom.statusWordCount.textContent = `第 ${currentPage}/${totalPages} 页`;
}

/**
 * 重置状态栏为初始状态
 */
export function resetStatusBar() {
  dom.statusFileInfo.innerHTML = `${FILE_ICON_SVG} 就绪`;
  dom.statusWordCount.textContent = '字数: --';
  dom.statusType.textContent = '--';
}
