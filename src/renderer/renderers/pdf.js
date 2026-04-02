import dom from '../dom.js';
import state, { getActiveTab } from '../state.js';
import { escapeHtml, getFileName } from '../utils.js';
import { updateEditorTab } from '../tab.js';
import { clearOutline, hideOutlinePanel, showOutlinePanel } from '../outline.js';
import { updateStatusBarForPdf, updatePdfCurrentPage } from '../statusbar.js';

let pdfjsInitialized = false;

// ===== PDF 缩放状态 =====
const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
const ZOOM_DEFAULT_INDEX = 7; // 1.0 = 100%
let currentZoomIndex = ZOOM_DEFAULT_INDEX;
let lastZoomIndex = ZOOM_DEFAULT_INDEX;
let currentPdf = null;       // 缓存当前 PDF 文档对象
let currentFilePath = null;  // 缓存当前文件路径

/**
 * 获取 PDF.js 库引用
 */
function getPdfjsLib() {
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('PDF.js 库未加载');
  if (!pdfjsInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';
    pdfjsInitialized = true;
  }
  return pdfjsLib;
}

/**
 * 显示错误信息
 */
function showError(message) {
  dom.content.innerHTML = `
    <div class="error">
      <h2>❌ 错误</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * 根据 PDF 目录的 dest 解析出目标页码
 * @param {Object} pdf - PDF 文档对象
 * @param {Object} item - 大纲项
 * @returns {Promise<number>} 页码 (1-based)
 */
async function resolveOutlinePageNum(pdf, item) {
  try {
    let dest = item.dest;
    // dest 可能是字符串（命名目的地），也可能是数组
    if (typeof dest === 'string') {
      dest = await pdf.getDestination(dest);
    }
    if (dest && Array.isArray(dest) && dest.length > 0) {
      // dest[0] 是一个 page ref 对象
      const pageIndex = await pdf.getPageIndex(dest[0]);
      return pageIndex + 1; // 转为 1-based
    }
  } catch (e) {
    // 忽略解析错误
  }
  return 1;
}

/**
 * 递归构建 PDF 大纲树，扁平化为带层级的列表
 * @param {Object} pdf - PDF 文档对象
 * @param {Array} items - 大纲项数组
 * @param {number} level - 当前层级 (1-based)
 * @returns {Promise<Array>} 扁平化的大纲列表 [{ title, pageNum, level }]
 */
async function flattenOutline(pdf, items, level) {
  const result = [];
  for (const item of items) {
    const pageNum = await resolveOutlinePageNum(pdf, item);
    result.push({
      title: item.title,
      pageNum,
      level
    });
    // 递归处理子项
    if (item.items && item.items.length > 0) {
      const children = await flattenOutline(pdf, item.items, level + 1);
      result.push(...children);
    }
  }
  return result;
}

/**
 * 生成 PDF 目录并填充到大纲面板
 * @param {Object} pdf - PDF 文档对象
 */
async function generatePdfOutline(pdf) {
  let outline;
  try {
    outline = await pdf.getOutline();
  } catch (e) {
    clearOutline('无法读取 PDF 目录');
    hideOutlinePanel();
    return false;
  }

  if (!outline || outline.length === 0) {
    clearOutline('该 PDF 没有目录');
    hideOutlinePanel();
    return false;
  }

  // 扁平化目录树
  const flatItems = await flattenOutline(pdf, outline, 1);

  if (flatItems.length === 0) {
    clearOutline('该 PDF 没有目录');
    hideOutlinePanel();
    return false;
  }

  const fragment1 = document.createDocumentFragment();
  const fragment2 = document.createDocumentFragment();

  flatItems.forEach((entry) => {
    fragment1.appendChild(createPdfTocItem(entry));
    fragment2.appendChild(createPdfTocItem(entry));
  });

  dom.tocList.innerHTML = '';
  dom.tocList.appendChild(fragment1);
  dom.tocListSidebar.innerHTML = '';
  dom.tocListSidebar.appendChild(fragment2);

  // 显示大纲面板
  showOutlinePanel();
  return true;
}

/**
 * 创建单个 PDF 目录项
 * @param {Object} entry - { title, pageNum, level }
 * @returns {HTMLElement}
 */
function createPdfTocItem(entry) {
  const item = document.createElement('div');
  item.className = 'toc-item';
  item.setAttribute('data-level', entry.level);
  item.setAttribute('data-page', entry.pageNum);
  item.textContent = entry.title;
  item.title = `${entry.title} (第 ${entry.pageNum} 页)`;

  item.addEventListener('click', () => {
    scrollToPage(entry.pageNum);
    highlightPdfTocItem(item);
  });

  return item;
}

/**
 * 滚动到指定 PDF 页面
 * @param {number} pageNum - 页码 (1-based)
 */
function scrollToPage(pageNum) {
  const page = dom.content.querySelector(`.pdf-page[data-page="${pageNum}"]`);
  if (page) {
    page.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * 获取当前缩放比例
 * @returns {number}
 */
function getCurrentZoom() {
  return ZOOM_LEVELS[currentZoomIndex];
}

/**
 * 创建 PDF 缩放工具栏
 */
function createZoomToolbar() {
  // 移除已有的工具栏
  const existing = document.getElementById('pdfZoomToolbar');
  if (existing) existing.remove();

  const toolbar = document.createElement('div');
  toolbar.id = 'pdfZoomToolbar';
  toolbar.className = 'pdf-zoom-toolbar';

  // 缩小按钮
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'pdf-zoom-btn';
  zoomOutBtn.title = '缩小 (Ctrl+-)';
  zoomOutBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  zoomOutBtn.addEventListener('click', () => zoomOut());

  // 缩放比例显示（点击回到适应宽度）
  const zoomLevel = document.createElement('button');
  zoomLevel.className = 'pdf-zoom-level';
  zoomLevel.id = 'pdfZoomLevel';
  zoomLevel.title = '适应宽度';
  zoomLevel.textContent = Math.round(getCurrentZoom() * 100) + '%';
  zoomLevel.addEventListener('click', () => zoomReset());

  // 放大按钮
  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'pdf-zoom-btn';
  zoomInBtn.title = '放大 (Ctrl++)';
  zoomInBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
  zoomInBtn.addEventListener('click', () => zoomIn());

  toolbar.appendChild(zoomOutBtn);
  toolbar.appendChild(zoomLevel);
  toolbar.appendChild(zoomInBtn);

  // 挂到面包屑栏右侧
  const actions = dom.breadcrumbActions;
  if (actions) {
    actions.insertBefore(toolbar, actions.firstChild);
  }
}

/**
 * 更新缩放比例显示
 */
function updateZoomDisplay() {
  const el = document.getElementById('pdfZoomLevel');
  if (el) {
    el.textContent = Math.round(getCurrentZoom() * 100) + '%';
  }
}

/**
 * 放大
 */
function zoomIn() {
  if (currentZoomIndex < ZOOM_LEVELS.length - 1) {
    currentZoomIndex++;
    applyZoom();
  }
}

/**
 * 缩小
 */
function zoomOut() {
  if (currentZoomIndex > 0) {
    currentZoomIndex--;
    applyZoom();
  }
}

/**
 * 重置缩放到 100%
 */
function zoomReset() {
  currentZoomIndex = ZOOM_DEFAULT_INDEX;
  applyZoom();
}

/**
 * 应用缩放 — 纯 CSS transform，即时生效，无重渲染
 */
function applyZoom() {
  updateZoomDisplay();

  const pdfContainer = document.getElementById('pdfContainer');
  if (!pdfContainer) return;

  const oldScale = ZOOM_LEVELS[lastZoomIndex] || 1;
  const newScale = ZOOM_LEVELS[currentZoomIndex];
  
  // 计算缩放变化比例
  const scaleRatio = newScale / oldScale;

  // 获取当前的滚动中心点（距离容器顶部的距离）
  const content = dom.content;
  const scrollCenterY = content.scrollTop + content.clientHeight / 2;

  // 因为 .editor-content 的 padding-top 为 32px，缩放原点（top center）实际从 32px 处开始
  // 计算此时视窗内内容中心点距离“缩放原点”的相对距离
  const PADDING_TOP = 32;
  const centerYFromOrigin = scrollCenterY - PADDING_TOP;

  // 根据缩放比例计算新的相对距离
  const newCenterYFromOrigin = centerYFromOrigin * scaleRatio;
  
  // 计算需要设置的新的滚动顶部位置
  const newScrollTop = newCenterYFromOrigin + PADDING_TOP - content.clientHeight / 2;

  // 更新上一状态的记录
  lastZoomIndex = currentZoomIndex;

  pdfContainer.style.transformOrigin = 'top center';
  pdfContainer.style.transform = `scale(${newScale})`;
  // 用 margin-bottom 补偿 transform 后布局尺寸不变的问题，防止滚动区域不对
  const rect = pdfContainer.scrollHeight;
  pdfContainer.style.marginBottom = `${rect * (newScale - 1)}px`;

  // 临时禁用平滑滚动以避免与 transform 过渡冲突产生视差，直接对齐目标位置
  content.style.scrollBehavior = 'auto';
  content.scrollTop = newScrollTop;

  // 恢复平滑滚动（等下一帧应用）
  requestAnimationFrame(() => {
    content.style.scrollBehavior = '';
  });

  // 更新当前标签页缓存中的缩放比例
  const tab = getActiveTab();
  if (tab && tab.pdfCache) {
    tab.pdfCache.zoomIndex = currentZoomIndex;
  }
}

/**
 * 设置 PDF 缩放快捷键（Ctrl/Cmd + / -）
 */
let pdfZoomKeyHandler = null;
function setupPdfZoomKeys() {
  if (pdfZoomKeyHandler) return;

  pdfZoomKeyHandler = (e) => {
    if (state.currentFileType !== 'pdf') return;
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      e.stopPropagation();
      zoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      e.stopPropagation();
      zoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      e.stopPropagation();
      zoomReset();
    }
  };
  document.addEventListener('keydown', pdfZoomKeyHandler, true);
}

/**
 * 设置 Ctrl+滚轮 / 触摸板双指缩放
 * 触摸板 pinch 在 macOS 上表现为 ctrlKey=true 的 wheel 事件，deltaY 是连续小数
 * 需要累积 delta 到阈值才触发一次缩放，并做节流
 */
let pdfWheelHandler = null;
let wheelDeltaAccum = 0;
const WHEEL_ZOOM_THRESHOLD = 30; // 累积阈值
let wheelZoomTimer = null;

function setupPdfWheelZoom() {
  if (pdfWheelHandler) return;

  pdfWheelHandler = (e) => {
    if (state.currentFileType !== 'pdf') return;
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();
    e.stopPropagation();

    wheelDeltaAccum += e.deltaY;

    if (wheelZoomTimer) return;

    wheelZoomTimer = requestAnimationFrame(() => {
      wheelZoomTimer = null;

      if (Math.abs(wheelDeltaAccum) >= WHEEL_ZOOM_THRESHOLD) {
        if (wheelDeltaAccum > 0) {
          zoomOut();
        } else {
          zoomIn();
        }
        wheelDeltaAccum = 0;
      }
    });
  };
  dom.content.addEventListener('wheel', pdfWheelHandler, { passive: false });
}

/**
 * 高亮当前点击的 PDF 目录项
 * @param {HTMLElement} activeItem
 */
function highlightPdfTocItem(activeItem) {
  [dom.tocList, dom.tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      item.classList.remove('active');
    });
  });
  // 高亮两个面板中对应页码的项
  const page = activeItem.getAttribute('data-page');
  const title = activeItem.textContent;
  [dom.tocList, dom.tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      if (item.getAttribute('data-page') === page && item.textContent === title) {
        item.classList.add('active');
      }
    });
  });
}

/**
 * 设置 PDF 滚动时自动高亮目录中对应的页码项
 */
function setupPdfScrollHighlight() {
  let ticking = false;

  dom.content.addEventListener('scroll', () => {
    if (state.currentFileType !== 'pdf') return;
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;

      const pages = dom.content.querySelectorAll('.pdf-page');
      if (pages.length === 0) return;

      const scrollTop = dom.content.scrollTop;
      const offset = 100;

      let currentPage = 1;
      pages.forEach(page => {
        if (page.offsetTop - offset <= scrollTop) {
          currentPage = parseInt(page.getAttribute('data-page'));
        }
      });

      // 更新状态栏当前页码
      updatePdfCurrentPage(currentPage, pages.length);

      // 找到当前页码对应的最后一个目录项来高亮
      [dom.tocList, dom.tocListSidebar].forEach(list => {
        const items = list.querySelectorAll('.toc-item');
        let lastMatch = null;
        items.forEach(item => {
          item.classList.remove('active');
          const itemPage = parseInt(item.getAttribute('data-page'));
          if (itemPage <= currentPage) {
            lastMatch = item;
          }
        });
        if (lastMatch) {
          lastMatch.classList.add('active');
          lastMatch.scrollIntoView({ block: 'nearest' });
        }
      });
    });
  });
}

// 初始化时注册滚动监听（只注册一次）
let pdfScrollListenerAdded = false;

/**
 * 加载并渲染 PDF 文件
 * @param {string} filePath - 文件路径
 */
export async function loadPdfFile(filePath) {
  state.currentPath = filePath;
  state.currentFileType = 'pdf';
  currentFilePath = filePath;

  const fileName = getFileName(filePath);

  // 更新 UI
  dom.currentPathDisplay.textContent = filePath;
  dom.titlebarTitle.textContent = fileName + ' — MD Reader';
  updateEditorTab(fileName, '📕');

  // 尝试从当前标签页恢复缓存
  const tab = getActiveTab();
  
  if (tab && tab.pdfCache) {
    const container = tab.pdfCache.container;
    
    // 禁用初始的 slideIn 动画，防止动画的 transform 覆盖内联的 scale，引发缩放闪烁过程
    container.style.animation = 'none';
    container.style.transition = 'none';

    // 恢复缓存的 DOM 和状态
    dom.content.innerHTML = '';
    dom.content.appendChild(container);
    
    // 双重 requestAnimationFrame 确保在 DOM 真正绘制渲染后，再开启 transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.transition = '';
      });
    });

    dom.tocList.innerHTML = '';
    tab.pdfCache.outline.forEach(n => dom.tocList.appendChild(n));
    
    dom.tocListSidebar.innerHTML = '';
    tab.pdfCache.outlineSidebar.forEach(n => dom.tocListSidebar.appendChild(n));
    
    // 根据缓存的 hasOutline 标记控制大纲面板显示/隐藏
    if (tab.pdfCache.hasOutline) {
      showOutlinePanel();
    } else {
      hideOutlinePanel();
    }

    currentZoomIndex = tab.pdfCache.zoomIndex;
    lastZoomIndex = currentZoomIndex;
    currentPdf = tab.pdfCache.pdf;
    
    createZoomToolbar();
    updateZoomDisplay();
    updateStatusBarForPdf(fileName, tab.pdfCache.totalPages);
    return;
  }

  // 加载状态
  dom.content.innerHTML = `<div class="pdf-loading"><p>正在加载 PDF…</p></div>`;

  // 重置缩放
  currentZoomIndex = ZOOM_DEFAULT_INDEX;
  lastZoomIndex = ZOOM_DEFAULT_INDEX;

  try {
    const pdfjsLib = getPdfjsLib();

    // 读取二进制数据
    const result = await window.electronAPI.readFileBinary(filePath);
    if (!result.success) {
      showError(result.error);
      return;
    }

    const uint8Array = new Uint8Array(result.data);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    currentPdf = pdf;
    const totalPages = pdf.numPages;

    // 创建容器
    dom.content.innerHTML = `<div class="pdf-body" id="pdfContainer"></div>`;
    const pdfContainer = document.getElementById('pdfContainer');

    // 用适应容器宽度的比例渲染，作为 100% 基准
    const firstPage = await pdf.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    const containerWidth = dom.content.clientWidth - 96;
    const baseScale = containerWidth / baseViewport.width;
    const dpr = window.devicePixelRatio || 1;

    // 逐页渲染
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: baseScale });

      // 页面包装器
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page';
      pageWrapper.setAttribute('data-page', pageNum);

      // Canvas — 高分辨率渲染
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      // 页码标签
      const pageLabel = document.createElement('div');
      pageLabel.className = 'pdf-page-label';
      pageLabel.textContent = `第 ${pageNum} / ${totalPages} 页`;

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(pageLabel);
      pdfContainer.appendChild(pageWrapper);
    }

    // 创建缩放工具栏
    createZoomToolbar();

    // 设置缩放快捷键和滚轮缩放
    setupPdfZoomKeys();
    setupPdfWheelZoom();

    // 生成 PDF 目录大纲
    const hasOutline = await generatePdfOutline(pdf);

    // 注册滚动高亮（只注册一次）
    if (!pdfScrollListenerAdded) {
      setupPdfScrollHighlight();
      pdfScrollListenerAdded = true;
    }

    // 更新状态栏
    updateStatusBarForPdf(fileName, totalPages);

    // 缓存到当前 tab
    if (tab) {
      tab.pdfCache = {
        container: pdfContainer,
        outline: Array.from(dom.tocList.childNodes),
        outlineSidebar: Array.from(dom.tocListSidebar.childNodes),
        zoomIndex: currentZoomIndex,
        pdf: currentPdf,
        totalPages: totalPages,
        hasOutline: hasOutline
      };
    }

  } catch (error) {
    showError('PDF 加载失败: ' + error.message);
  }
}
