// Configure marked with syntax highlighting
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

// State
let currentPath = '';
let activePanel = 'explorer'; // 'explorer' | 'outline' | null
let currentFileType = ''; // 'markdown' | 'txt' | 'pdf'

// DOM Elements
const titlebarTitle = document.getElementById('titlebarTitle');
const activityBar = document.getElementById('activityBar');
const primarySidebar = document.getElementById('primarySidebar');
const sidebarSash = document.getElementById('sidebarSash');
const editorTabs = document.getElementById('editorTabs');
const breadcrumbBar = document.getElementById('breadcrumbBar');
const content = document.getElementById('content');
const currentPathDisplay = document.getElementById('currentPath');
const openFileBtn = document.getElementById('openFileBtn');
const welcomeOpenBtn = document.getElementById('welcomeOpenBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const hljsDark = document.getElementById('hljs-dark');
const hljsLight = document.getElementById('hljs-light');

// Activity bar buttons
const activityExplorer = document.getElementById('activityExplorer');
const activityOutline = document.getElementById('activityOutline');

// Sidebar panels
const panelExplorer = document.getElementById('panelExplorer');
const panelOutline = document.getElementById('panelOutline');
const recentFilesToggle = document.getElementById('recentFilesToggle');

// Outline panel (right side)
const outlinePanel = document.getElementById('outlinePanel');
const outlineSash = document.getElementById('outlineSash');
const tocList = document.getElementById('tocList');
const tocListSidebar = document.getElementById('tocListSidebar');
const closeOutlineBtn = document.getElementById('closeOutlineBtn');

// Status bar
const statusFileInfo = document.getElementById('statusFileInfo');
const statusWordCount = document.getElementById('statusWordCount');
const statusEncoding = document.getElementById('statusEncoding');
const statusType = document.getElementById('statusType');

// Tab elements
const welcomeTab = document.getElementById('welcomeTab');

// ===== Initialize =====
async function init() {
  // 根据平台调整 UI
  const isWindows = window.electronAPI.platform === 'win32';
  if (isWindows) {
    // Windows 有原生标题栏，隐藏自定义标题栏和面包屑栏
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.display = 'none';
    if (breadcrumbBar) breadcrumbBar.style.display = 'none';
  }

  // File open
  openFileBtn.addEventListener('click', openFile);
  welcomeOpenBtn.addEventListener('click', openFile);

  // Activity bar panel switching
  activityExplorer.addEventListener('click', () => togglePanel('explorer'));
  activityOutline.addEventListener('click', () => togglePanel('outline'));

  // Clear history
  clearHistoryBtn.addEventListener('click', clearAllHistory);

  // Section collapse
  recentFilesToggle.addEventListener('click', () => {
    recentFilesToggle.classList.toggle('collapsed');
    const body = recentFilesToggle.nextElementSibling;
    body.classList.toggle('collapsed');
  });

  // Theme
  initTheme();
  toggleThemeBtn.addEventListener('click', toggleTheme);

  // Outline close
  closeOutlineBtn.addEventListener('click', () => {
    outlinePanel.classList.add('hidden');
    outlineSash.classList.add('hidden');
    activityOutline.classList.remove('active');
  });

  // Tab close button
  const tabCloseBtn = welcomeTab.querySelector('.editor-tab-close');
  tabCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCurrentTab();
  });

  // Sash resize
  setupSashResize(sidebarSash, primarySidebar, 'left', 150, 450);
  setupSashResize(outlineSash, outlinePanel, 'right', 130, 400);

  // Scrolling highlights TOC
  content.addEventListener('scroll', onContentScroll);

  // Menu open file
  window.electronAPI.onOpenFile(async (filePath) => {
    await loadFile(filePath);
  });

  // Drag and drop
  setupDragDrop();

  // Keyboard shortcuts
  setupKeyboard();

  // Load history
  await refreshHistory();

  // Show sidebar by default
  showPanel('explorer');
  sidebarSash.classList.remove('hidden');
}

// ===== Activity Bar Panel Switching =====
function togglePanel(panel) {
  if (activePanel === panel) {
    // Close sidebar
    primarySidebar.classList.add('collapsed');
    sidebarSash.classList.add('hidden');
    setActivityActive(null);
    activePanel = null;
  } else {
    showPanel(panel);
  }
}

function showPanel(panel) {
  activePanel = panel;
  primarySidebar.classList.remove('collapsed');
  sidebarSash.classList.remove('hidden');
  setActivityActive(panel);

  // Show/hide panels
  panelExplorer.classList.toggle('hidden', panel !== 'explorer');
  panelOutline.classList.toggle('hidden', panel !== 'outline');
}

function setActivityActive(panel) {
  activityExplorer.classList.toggle('active', panel === 'explorer');
  activityOutline.classList.toggle('active', panel === 'outline');
}

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('md-reader-theme') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('md-reader-theme', next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const darkIcon = toggleThemeBtn.querySelector('.theme-icon-dark');
  const lightIcon = toggleThemeBtn.querySelector('.theme-icon-light');

  if (theme === 'light') {
    darkIcon.style.display = 'none';
    lightIcon.style.display = 'block';
    hljsDark.disabled = true;
    hljsLight.disabled = false;
  } else {
    darkIcon.style.display = 'block';
    lightIcon.style.display = 'none';
    hljsDark.disabled = false;
    hljsLight.disabled = true;
  }
}

// ===== Sash Resize =====
function setupSashResize(sash, panel, direction, minWidth, maxWidth) {
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  sash.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    panel.classList.add('resizing');
    sash.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let diff;
    if (direction === 'left') {
      diff = e.clientX - startX;
    } else {
      diff = startX - e.clientX;
    }
    let newWidth = startWidth + diff;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    panel.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    panel.classList.remove('resizing');
    sash.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// ===== TOC / Outline =====
function generateToc() {
  const markdownBody = content.querySelector('.markdown-body');
  const emptyMsg = '<div class="empty-state-sm"><p>打开文件后显示大纲</p></div>';

  if (!markdownBody) {
    tocList.innerHTML = emptyMsg;
    tocListSidebar.innerHTML = emptyMsg;
    return;
  }

  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    const noHeadMsg = '<div class="empty-state-sm"><p>该文档没有标题</p></div>';
    tocList.innerHTML = noHeadMsg;
    tocListSidebar.innerHTML = noHeadMsg;
    return;
  }

  const fragment1 = document.createDocumentFragment();
  const fragment2 = document.createDocumentFragment();

  headings.forEach((heading, index) => {
    const id = 'heading-' + index;
    heading.id = id;
    const level = parseInt(heading.tagName.charAt(1));

    // For outline panel
    const item1 = createTocItem(heading, id, level);
    fragment1.appendChild(item1);

    // For sidebar outline
    const item2 = createTocItem(heading, id, level);
    fragment2.appendChild(item2);
  });

  tocList.innerHTML = '';
  tocList.appendChild(fragment1);
  tocListSidebar.innerHTML = '';
  tocListSidebar.appendChild(fragment2);

  // Show outline panel
  outlinePanel.classList.remove('hidden');
  outlineSash.classList.remove('hidden');
}

function createTocItem(heading, id, level) {
  const item = document.createElement('div');
  item.className = 'toc-item';
  item.setAttribute('data-level', level);
  item.setAttribute('data-target', id);
  item.textContent = heading.textContent;
  item.title = heading.textContent;

  item.addEventListener('click', () => {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Highlight active in both toc lists
    highlightTocItem(id);
  });

  return item;
}

function highlightTocItem(targetId) {
  [tocList, tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-target') === targetId);
    });
  });
}

function onContentScroll() {
  const markdownBody = content.querySelector('.markdown-body');
  if (!markdownBody) return;

  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return;

  const scrollTop = content.scrollTop;
  const offset = 80;

  let currentId = '';
  headings.forEach(heading => {
    if (heading.offsetTop - offset <= scrollTop) {
      currentId = heading.id;
    }
  });

  [tocList, tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      const isActive = item.getAttribute('data-target') === currentId;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  });
}

// ===== File Type Detection =====
function getFileType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  return 'markdown'; // md, markdown, 其他默认 markdown
}

// ===== File Operations =====
async function openFile() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    await loadFile(filePath);
  }
}

async function loadFile(filePath) {
  const fileType = getFileType(filePath);

  if (fileType === 'pdf') {
    await loadPdfFile(filePath);
  } else {
    const result = await window.electronAPI.readFile(filePath);
    if (result.success) {
      if (fileType === 'txt') {
        renderPlainText(result.content, result.path);
      } else {
        renderMarkdown(result.content, result.path);
      }
      await window.electronAPI.addHistory(result.path);
      await refreshHistory();
    } else {
      showError(result.error);
    }
  }
}

async function loadFileWithoutHistory(filePath) {
  await loadFile(filePath);
}

// ===== History =====
async function refreshHistory() {
  const history = await window.electronAPI.getHistory();
  renderHistory(history);
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="empty-state-sm"><p>暂无浏览记录</p></div>';
    return;
  }

  historyList.innerHTML = '';

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    if (item.path === currentPath) {
      el.classList.add('active');
    }

    const dirPath = item.path.substring(0, item.path.lastIndexOf('/')) || item.path.substring(0, item.path.lastIndexOf('\\'));

    // 根据文件类型选择图标
    const fileExt = item.name.toLowerCase().split('.').pop();
    let fileIcon = '📄';
    if (fileExt === 'pdf') fileIcon = '📕';
    else if (fileExt === 'txt') fileIcon = '📝';

    el.innerHTML = `
      <span class="history-icon">${fileIcon}</span>
      <div class="history-item-info">
        <span class="history-item-name">${escapeHtml(item.name)}</span>
        <span class="history-item-path">${escapeHtml(dirPath)}</span>
      </div>
      <button class="history-item-delete" title="移除记录">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    el.addEventListener('click', async (e) => {
      if (e.target.closest('.history-item-delete')) return;

      const exists = await window.electronAPI.fileExists(item.path);
      if (!exists) {
        await window.electronAPI.removeHistory(item.path);
        await refreshHistory();
        return;
      }

      document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      await loadFileWithoutHistory(item.path);
    });

    const deleteBtn = el.querySelector('.history-item-delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.electronAPI.removeHistory(item.path);
      await refreshHistory();
    });

    historyList.appendChild(el);
  });
}

async function clearAllHistory() {
  const history = await window.electronAPI.getHistory();
  if (!history || history.length === 0) return;

  const confirmed = confirm('确定要清空所有浏览记录吗？此操作不可撤销。');
  if (!confirmed) return;

  for (const item of history) {
    await window.electronAPI.removeHistory(item.path);
  }
  await refreshHistory();
}

// ===== Render Markdown =====
function renderMarkdown(markdown, filePath) {
  currentPath = filePath;
  currentFileType = 'markdown';

  // Update breadcrumb
  currentPathDisplay.textContent = filePath;

  // Update titlebar
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
  titlebarTitle.textContent = fileName + ' — MD Reader';

  // Update tab
  updateEditorTab(fileName);

  let html;
  if (typeof marked !== 'undefined') {
    html = marked.parse(markdown);
  } else {
    html = simpleMarkdownParse(markdown);
  }

  content.innerHTML = `<div class="markdown-body">${html}</div>`;

  // Syntax highlighting + copy buttons
  if (typeof hljs !== 'undefined') {
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

  // Generate TOC
  generateToc();

  // Update status bar
  updateStatusBar(markdown, fileName);
}

function updateEditorTab(fileName, icon) {
  welcomeTab.querySelector('.editor-tab-icon').textContent = icon || '📄';
  welcomeTab.querySelector('.editor-tab-label').textContent = fileName;
  welcomeTab.title = fileName;
}

function closeCurrentTab() {
  // Reset state
  currentPath = '';
  currentFileType = '';

  // Restore tab to Welcome
  welcomeTab.querySelector('.editor-tab-icon').textContent = '📖';
  welcomeTab.querySelector('.editor-tab-label').textContent = 'Welcome';
  welcomeTab.title = '';

  // Reset titlebar
  titlebarTitle.textContent = 'MD Reader';

  // Reset breadcrumb
  currentPathDisplay.textContent = 'MD Reader';

  // Restore welcome content
  content.innerHTML = `
    <div class="welcome">
      <h1>MD Reader</h1>
      <div class="welcome-actions">
        <button class="welcome-btn" id="welcomeOpenBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          打开文件
        </button>
      </div>
      <div class="welcome-shortcuts">
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">打开文件</span>
          <kbd>⌘ O</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">切换侧栏</span>
          <kbd>⌘ B</kbd>
        </div>
        <div class="welcome-shortcut-row">
          <span class="welcome-shortcut-label">资源管理器</span>
          <kbd>⌘ ⇧ E</kbd>
        </div>
      </div>
      <p class="welcome-hint">拖拽 .md / .txt / .pdf 文件到窗口即可打开</p>
    </div>
  `;

  // Re-bindwelcome button
  const newWelcomeOpenBtn = document.getElementById('welcomeOpenBtn');
  if (newWelcomeOpenBtn) {
    newWelcomeOpenBtn.addEventListener('click', openFile);
  }

  // Clear outline
  const emptyMsg = '<div class="empty-state-sm"><p>打开文件后显示大纲</p></div>';
  tocList.innerHTML = emptyMsg;
  tocListSidebar.innerHTML = emptyMsg;

  // Hide outline panel
  outlinePanel.classList.add('hidden');
  outlineSash.classList.add('hidden');

  // Reset status bar
  statusFileInfo.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
    就绪
  `;
  statusWordCount.textContent = '字数: --';
  statusType.textContent = '--';

  // Deactivate history items
  document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
}

function updateStatusBar(textContent, fileName) {
  // Word count (approximate)
  const text = textContent.replace(/[#*`\[\]()>_~|\\-]/g, ' ');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = textContent.length;

  statusFileInfo.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
    ${escapeHtml(fileName)}
  `;
  statusWordCount.textContent = `字数: ${chars} | 词数: ${words}`;

  // 更新文件类型标签
  const typeLabels = { markdown: 'Markdown', txt: '纯文本', pdf: 'PDF' };
  statusType.textContent = typeLabels[currentFileType] || '--';
}

// ===== Render Plain Text =====
function renderPlainText(text, filePath) {
  currentPath = filePath;
  currentFileType = 'txt';

  // Update breadcrumb
  currentPathDisplay.textContent = filePath;

  // Update titlebar
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
  titlebarTitle.textContent = fileName + ' — MD Reader';

  // Update tab
  updateEditorTab(fileName, '📝');

  // 将纯文本转为 HTML（保留空格和换行）
  const escapedText = escapeHtml(text);
  content.innerHTML = `<div class="plaintext-body"><pre class="plaintext-pre">${escapedText}</pre></div>`;

  // 清空大纲（纯文本没有标题层级）
  const emptyMsg = '<div class="empty-state-sm"><p>纯文本文件无大纲</p></div>';
  tocList.innerHTML = emptyMsg;
  tocListSidebar.innerHTML = emptyMsg;

  // Update status bar
  updateStatusBar(text, fileName);
}

// ===== Render PDF =====
let pdfjsInitialized = false;

function getPdfjsLib() {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('PDF.js 库未加载');
  if (!pdfjsInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';
    pdfjsInitialized = true;
  }
  return pdfjsLib;
}

async function loadPdfFile(filePath) {
  currentPath = filePath;
  currentFileType = 'pdf';

  const fileName = filePath.split('/').pop() || filePath.split('\\').pop();

  // Update UI
  currentPathDisplay.textContent = filePath;
  titlebarTitle.textContent = fileName + ' — MD Reader';
  updateEditorTab(fileName, '📕');

  // 显示加载状态
  content.innerHTML = `<div class="pdf-loading"><p>正在加载 PDF…</p></div>`;

  try {
    // 获取 PDF.js
    const pdfjsLib = getPdfjsLib();

    // 读取二进制数据
    const result = await window.electronAPI.readFileBinary(filePath);
    if (!result.success) {
      showError(result.error);
      return;
    }

    const uint8Array = new Uint8Array(result.data);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const totalPages = pdf.numPages;

    // 创建 PDF 容器
    content.innerHTML = `<div class="pdf-body" id="pdfContainer"></div>`;
    const pdfContainer = document.getElementById('pdfContainer');

    // 逐页渲染
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // 计算缩放比例，让 PDF 页面适应容器宽度
      const containerWidth = content.clientWidth - 96; // 减去 padding
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / viewport.width, 2.5); // 最大 2.5 倍
      const scaledViewport = page.getViewport({ scale });

      // 创建页面包装器
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page';
      pageWrapper.setAttribute('data-page', pageNum);

      // 创建 canvas
      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width * (window.devicePixelRatio || 1);
      canvas.height = scaledViewport.height * (window.devicePixelRatio || 1);
      canvas.style.width = scaledViewport.width + 'px';
      canvas.style.height = scaledViewport.height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport
      }).promise;

      // 页码标签
      const pageLabel = document.createElement('div');
      pageLabel.className = 'pdf-page-label';
      pageLabel.textContent = `第 ${pageNum} / ${totalPages} 页`;

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(pageLabel);
      pdfContainer.appendChild(pageWrapper);
    }

    // 清空大纲（PDF 暂不提取目录）
    const emptyMsg = '<div class="empty-state-sm"><p>PDF 文件暂不支持大纲</p></div>';
    tocList.innerHTML = emptyMsg;
    tocListSidebar.innerHTML = emptyMsg;

    // 更新状态栏
    statusFileInfo.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      ${escapeHtml(fileName)}
    `;
    statusWordCount.textContent = `共 ${totalPages} 页`;
    statusType.textContent = 'PDF';

    // 添加历史
    await window.electronAPI.addHistory(filePath);
    await refreshHistory();

  } catch (error) {
    showError('PDF 加载失败: ' + error.message);
  }
}

// ===== Keyboard Shortcuts =====
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + B → toggle sidebar
    if (isMod && e.key === 'b') {
      e.preventDefault();
      if (activePanel) {
        primarySidebar.classList.add('collapsed');
        sidebarSash.classList.add('hidden');
        setActivityActive(null);
        activePanel = null;
      } else {
        showPanel('explorer');
      }
    }

    // Cmd/Ctrl + Shift + E → Explorer
    if (isMod && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      togglePanel('explorer');
    }

  });
}

// ===== Simple Markdown Fallback =====
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

// ===== Error =====
function showError(message) {
  content.innerHTML = `
    <div class="error">
      <h2>❌ 错误</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

// ===== Utils =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Drag & Drop =====
function setupDragDrop() {
  const overlay = document.createElement('div');
  overlay.className = 'drag-overlay';
  overlay.innerHTML = `
    <div class="drag-overlay-content">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <p>释放以打开文件</p>
    </div>
  `;
  document.body.appendChild(overlay);

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    overlay.classList.add('active');
  });

  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      overlay.classList.remove('active');
    }
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    overlay.classList.remove('active');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const filePath = window.electronAPI.getPathForFile(file);
      await loadFile(filePath);
    }
  });
}

// Start app
init();
