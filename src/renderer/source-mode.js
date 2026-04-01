import dom from './dom.js';
import state from './state.js';
import { renderMarkdown } from './renderers/markdown.js';
import { updateStatusBar } from './statusbar.js';
import { getFileName } from './utils.js';

// 模式记忆存储 key
const MODE_MEMORY_KEY = 'md-reader-mode-memory';

/**
 * 获取文件模式记忆映射
 * @returns {Object} { filePath: 'read' | 'source' }
 */
function getModeMemory() {
  try {
    return JSON.parse(localStorage.getItem(MODE_MEMORY_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * 保存文件模式记忆
 * @param {string} filePath
 * @param {'read'|'source'} mode
 */
function saveModeMemory(filePath, mode) {
  const memory = getModeMemory();
  memory[filePath] = mode;
  // 只保留最近 200 条记忆
  const keys = Object.keys(memory);
  if (keys.length > 200) {
    const toRemove = keys.slice(0, keys.length - 200);
    toRemove.forEach(k => delete memory[k]);
  }
  localStorage.setItem(MODE_MEMORY_KEY, JSON.stringify(memory));
}

/**
 * 获取指定文件上次的工作模式
 * @param {string} filePath
 * @returns {'read'|'source'}
 */
export function getRememberedMode(filePath) {
  const memory = getModeMemory();
  return memory[filePath] || 'read';
}

/**
 * 显示/隐藏模式切换按钮
 * @param {boolean} show
 */
export function showModeToggle(show) {
  if (dom.modeToggleBtn) {
    dom.modeToggleBtn.classList.toggle('hidden', !show);
  }
}

/**
 * 更新按钮外观以反映当前模式
 */
function updateToggleButton() {
  if (!dom.modeToggleBtn) return;
  const label = dom.modeToggleBtn.querySelector('.mode-label');
  if (state.viewMode === 'source') {
    dom.modeToggleBtn.classList.add('active');
    if (label) label.textContent = '阅读';
    dom.modeToggleBtn.title = '切换阅读模式';
  } else {
    dom.modeToggleBtn.classList.remove('active');
    if (label) label.textContent = '源码';
    dom.modeToggleBtn.title = '切换源码模式';
  }
}

/**
 * 切换到源码模式
 */
function enterSourceMode() {
  state.viewMode = 'source';
  saveModeMemory(state.currentPath, 'source');
  updateToggleButton();

  // 创建源码编辑器
  dom.content.innerHTML = `<div class="source-editor-container">
    <textarea class="source-editor" id="sourceEditor" spellcheck="false">${escapeForTextarea(state.rawContent)}</textarea>
  </div>`;

  const editor = document.getElementById('sourceEditor');
  if (editor) {
    editor.addEventListener('input', () => {
      if (!state.isDirty) {
        state.isDirty = true;
        updateDirtyIndicator();
      }
    });

    // 支持 Tab 键缩进
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        if (!state.isDirty) {
          state.isDirty = true;
          updateDirtyIndicator();
        }
      }
    });

    editor.focus();
  }

  // 更新状态栏
  const fileName = getFileName(state.currentPath);
  updateStatusBar(state.rawContent, fileName);
}

/**
 * 切换到阅读模式
 */
function enterReadMode() {
  // 如果有编辑器，获取当前内容
  const editor = document.getElementById('sourceEditor');
  if (editor) {
    state.rawContent = editor.value;
  }

  state.viewMode = 'read';
  saveModeMemory(state.currentPath, 'read');
  updateToggleButton();

  // 重新渲染 Markdown（不重新加载文件）
  renderMarkdownContent(state.rawContent, state.currentPath);
}

/**
 * 内部渲染 Markdown 内容（不修改状态中的 rawMarkdown 和路径相关信息）
 */
function renderMarkdownContent(markdown, filePath) {
  renderMarkdown(markdown, filePath, true); // skipSourceInit = true
}

/**
 * 切换模式
 */
export function toggleMode() {
  if (state.currentFileType !== 'markdown') return;

  if (state.viewMode === 'read') {
    enterSourceMode();
  } else {
    enterReadMode();
  }
}

/**
 * 保存当前编辑的源码到文件
 * @returns {Promise<boolean>} 是否保存成功
 */
export async function saveCurrentFile() {
  if (!state.isDirty || !state.currentPath) {
    return true;
  }

  // 只有 markdown 和 txt 文件支持保存
  if (state.currentFileType !== 'markdown' && state.currentFileType !== 'txt') {
    return true;
  }

  const editor = document.getElementById('sourceEditor');
  if (editor) {
    state.rawContent = editor.value;
  }

  const result = await window.electronAPI.writeFile(state.currentPath, state.rawContent);
  if (result.success) {
    state.isDirty = false;
    updateDirtyIndicator();
    return true;
  } else {
    alert('保存失败: ' + result.error);
    return false;
  }
}

/**
 * 检查是否有未保存的修改，如果有则提示用户
 * @returns {Promise<boolean>} true = 可以继续操作, false = 用户取消
 */
export async function checkUnsavedChanges() {
  if (!state.isDirty) return true;

  const result = confirm('当前文件有未保存的修改，是否保存？\n\n点击"确定"保存，点击"取消"放弃修改。');
  if (result) {
    return await saveCurrentFile();
  }
  // 用户选择不保存，丢弃修改
  state.isDirty = false;
  updateDirtyIndicator();
  return true;
}

/**
 * 更新标签页上的脏标记
 */
function updateDirtyIndicator() {
  const tabLabel = dom.welcomeTab.querySelector('.editor-tab-label');
  if (!tabLabel) return;

  const fileName = getFileName(state.currentPath);
  if (state.isDirty) {
    tabLabel.textContent = '● ' + fileName;
    dom.welcomeTab.classList.add('dirty');
  } else {
    tabLabel.textContent = fileName;
    dom.welcomeTab.classList.remove('dirty');
  }
}

/**
 * 重置源码模式状态（关闭文件时调用）
 */
export function resetSourceMode() {
  state.viewMode = 'read';
  state.rawContent = '';
  state.isDirty = false;
  showModeToggle(false);
  updateToggleButton();
}

/**
 * 将文本转义后放入 textarea（避免 HTML 解析问题）
 */
function escapeForTextarea(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 初始化源码模式（进入一个 markdown 文件时调用）
 * @param {string} markdown - 原始 markdown 内容
 * @param {string} filePath - 文件路径
 */
export function initSourceMode(markdown, filePath) {
  state.rawContent = markdown;
  state.isDirty = false;
  showModeToggle(true);

  const rememberedMode = getRememberedMode(filePath);
  state.viewMode = rememberedMode;
  updateToggleButton();

  if (rememberedMode === 'source') {
    // 延迟一点切换到源码模式，让 renderMarkdown 先完成基本 UI 设置
    setTimeout(() => {
      enterSourceMode();
    }, 0);
  }
}

/**
 * 初始化 txt 文件编辑模式
 * @param {string} text - 文本内容
 * @param {string} filePath - 文件路径
 */
export function initTxtEditMode(text, filePath) {
  state.rawContent = text;
  state.isDirty = false;
  showModeToggle(false); // txt 不需要模式切换按钮
}
