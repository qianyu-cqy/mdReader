import dom from '../dom.js';
import state from '../state.js';
import { getFileName } from '../utils.js';
import { updateEditorTab, updateTabDirtyState } from '../tab.js';
import { clearOutline } from '../outline.js';
import { updateStatusBar } from '../statusbar.js';
import { initTxtEditMode } from '../source-mode.js';

/**
 * 将文本转义后放入 textarea（避免 HTML 解析问题）
 */
function escapeForTextarea(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 渲染纯文本文件（默认可编辑）
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

  // 渲染为可编辑的 textarea
  dom.content.innerHTML = `<div class="plaintext-body">
    <textarea class="plaintext-editor" id="sourceEditor" spellcheck="false">${escapeForTextarea(text)}</textarea>
  </div>`;

  // 绑定编辑事件
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
  }

  // 清空大纲
  clearOutline('纯文本文件无大纲');

  // 更新状态栏
  updateStatusBar(text, fileName);

  // 初始化编辑状态
  initTxtEditMode(text, filePath);
}

/**
 * 更新标签页上的脏标记（txt 专用，与 source-mode 中的逻辑一致）
 */
function updateDirtyIndicator() {
  updateTabDirtyState();
}
