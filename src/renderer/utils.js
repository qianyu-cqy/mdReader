/**
 * HTML 转义，防止 XSS
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 从文件路径中提取文件名
 * @param {string} filePath
 * @returns {string}
 */
export function getFileName(filePath) {
  return filePath.split('/').pop() || filePath.split('\\').pop();
}

/**
 * 根据扩展名检测文件类型
 * @param {string} filePath
 * @returns {'markdown'|'txt'|'pdf'}
 */
export function getFileType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  return 'markdown';
}

/**
 * 根据文件名获取文件图标 emoji
 * @param {string} fileName
 * @returns {string}
 */
export function getFileIcon(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf') return '📕';
  if (ext === 'txt') return '📝';
  return '📄';
}
