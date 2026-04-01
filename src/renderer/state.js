/**
 * 全局应用状态
 */
const state = {
  currentPath: '',
  activePanel: 'explorer', // 'explorer' | 'outline' | null
  currentFileType: '',     // 'markdown' | 'txt' | 'pdf'
  viewMode: 'read',        // 'read' | 'source' — 当前视图模式
  rawContent: '',          // 当前文件的原始内容（markdown 源码 / txt 文本）
  isDirty: false,          // 是否有未保存的修改
};

export default state;
