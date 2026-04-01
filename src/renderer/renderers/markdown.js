import dom from '../dom.js';
import state from '../state.js';
import { getFileName } from '../utils.js';
import { updateEditorTab } from '../tab.js';
import { generateToc } from '../outline.js';
import { updateStatusBar } from '../statusbar.js';

/**
 * 初始化 marked 配置
 */
export function initMarked() {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {}
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });
  }
}

/**
 * 渲染 Markdown 文件
 * @param {string} markdown - Markdown 内容
 * @param {string} filePath - 文件路径
 */
export function renderMarkdown(markdown, filePath) {
  state.currentPath = filePath;
  state.currentFileType = 'markdown';

  const fileName = getFileName(filePath);

  // 更新 UI
  dom.currentPathDisplay.textContent = filePath;
  dom.titlebarTitle.textContent = fileName + ' — MD Reader';
  updateEditorTab(fileName);

  let html;
  if (typeof marked !== 'undefined') {
    html = marked.parse(markdown);
  } else {
    html = simpleMarkdownParse(markdown);
  }

  dom.content.innerHTML = `<div class="markdown-body">${html}</div>`;

  // 语法高亮 + 复制按钮
  addCodeHighlightAndCopy();

  // 生成 TOC
  generateToc();

  // 更新状态栏
  updateStatusBar(markdown, fileName);
}

/**
 * 为代码块添加高亮和复制按钮
 */
function addCodeHighlightAndCopy() {
  if (typeof hljs === 'undefined') return;

  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });

  document.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.copy-btn')) return;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    copyBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px;
      background: var(--btn-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
    `;

    pre.style.position = 'relative';
    pre.appendChild(copyBtn);

    pre.addEventListener('mouseenter', () => { copyBtn.style.opacity = '1'; });
    pre.addEventListener('mouseleave', () => { copyBtn.style.opacity = '0'; });

    copyBtn.addEventListener('click', async () => {
      const code = pre.querySelector('code').textContent;
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.innerHTML = '✓';
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      } catch (e) {
        console.error('Failed to copy:', e);
      }
    });
  });
}

/**
 * 简单 Markdown 回退解析器（当 marked 不可用时）
 */
function simpleMarkdownParse(md) {
  let html = md;
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  return html;
}
