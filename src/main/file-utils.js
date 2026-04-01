const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.txt', '.pdf'];

/**
 * 从命令行参数中提取支持的文件路径
 * @param {string[]} args - 命令行参数数组
 * @returns {string|null} 文件路径或 null
 */
function getFileFromArgs(args) {
  for (const arg of args) {
    if (arg && !arg.startsWith('-') && !arg.startsWith('--')) {
      const lower = arg.toLowerCase();
      if (SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
        return arg;
      }
    }
  }
  return null;
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  getFileFromArgs,
};
