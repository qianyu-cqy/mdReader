/**
 * 单个标签页的数据结构
 * @typedef {Object} TabData
 * @property {string} id           - 唯一标识
 * @property {string} filePath     - 文件路径
 * @property {string} fileType     - 'markdown' | 'txt' | 'pdf'
 * @property {string} fileName     - 文件名
 * @property {string} icon         - 图标 emoji
 * @property {string} rawContent   - 原始文件内容（md/txt）
 * @property {string} viewMode     - 'read' | 'source'
 * @property {boolean} isDirty     - 是否有未保存的修改
 * @property {number} scrollTop    - 滚动位置快照
 * @property {string} contentHTML  - 渲染后的 HTML 快照（用于切换时恢复）
 */

let _tabIdCounter = 0;

/**
 * 生成唯一的 tab id
 */
export function generateTabId() {
  return 'tab-' + (++_tabIdCounter);
}

/**
 * 全局应用状态
 */
const state = {
  // 多标签页
  tabs: [],              // TabData[]
  activeTabId: null,     // 当前激活的 tab id

  // 当前激活 tab 的快捷访问（与 activeTab 同步）
  currentPath: '',
  activePanel: 'explorer', // 'explorer' | 'outline' | null
  currentFileType: '',     // 'markdown' | 'txt' | 'pdf'
  viewMode: 'read',        // 'read' | 'source' — 当前视图模式
  rawContent: '',          // 当前文件的原始内容（markdown 源码 / txt 文本）
  isDirty: false,          // 是否有未保存的修改
};

/**
 * 获取当前激活的 tab 数据
 * @returns {TabData|null}
 */
export function getActiveTab() {
  if (!state.activeTabId) return null;
  return state.tabs.find(t => t.id === state.activeTabId) || null;
}

/**
 * 根据文件路径查找已打开的 tab
 * @param {string} filePath
 * @returns {TabData|null}
 */
export function findTabByPath(filePath) {
  return state.tabs.find(t => t.filePath === filePath) || null;
}

export default state;
