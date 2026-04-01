const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 获取历史记录文件路径
 */
function getHistoryPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

/**
 * 读取历史记录
 * @returns {Array} 历史记录数组
 */
function readHistory() {
  try {
    const data = fs.readFileSync(getHistoryPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 写入历史记录
 * @param {Array} history - 历史记录数组
 */
function writeHistory(history) {
  fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), 'utf-8');
}

module.exports = {
  readHistory,
  writeHistory,
};
