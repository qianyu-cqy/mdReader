import dom from '../dom.js';
import state from '../state.js';
import { escapeHtml, getFileName } from '../utils.js';
import { updateEditorTab } from '../tab.js';
import { clearOutline } from '../outline.js';
import { updateStatusBarForPdf, updatePdfCurrentPage } from '../statusbar.js';
import { refreshHistory } from '../history.js';

let pdfjsInitialized = false;

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
    return;
  }

  if (!outline || outline.length === 0) {
    clearOutline('该 PDF 没有目录');
    return;
  }

  // 扁平化目录树
  const flatItems = await flattenOutline(pdf, outline, 1);

  if (flatItems.length === 0) {
    clearOutline('该 PDF 没有目录');
    return;
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
  dom.outlinePanel.classList.remove('hidden');
  dom.outlineSash.classList.remove('hidden');
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

  const fileName = getFileName(filePath);

  // 更新 UI
  dom.currentPathDisplay.textContent = filePath;
  dom.titlebarTitle.textContent = fileName + ' — MD Reader';
  updateEditorTab(fileName, '📕');

  // 加载状态
  dom.content.innerHTML = `<div class="pdf-loading"><p>正在加载 PDF…</p></div>`;

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
    const totalPages = pdf.numPages;

    // 创建容器
    dom.content.innerHTML = `<div class="pdf-body" id="pdfContainer"></div>`;
    const pdfContainer = document.getElementById('pdfContainer');

    // 逐页渲染
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const containerWidth = dom.content.clientWidth - 96;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(containerWidth / viewport.width, 2.5);
      const scaledViewport = page.getViewport({ scale });

      // 页面包装器
      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page';
      pageWrapper.setAttribute('data-page', pageNum);

      // Canvas
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

    // 生成 PDF 目录大纲
    await generatePdfOutline(pdf);

    // 注册滚动高亮（只注册一次）
    if (!pdfScrollListenerAdded) {
      setupPdfScrollHighlight();
      pdfScrollListenerAdded = true;
    }

    // 更新状态栏
    updateStatusBarForPdf(fileName, totalPages);

    // 添加历史
    await window.electronAPI.addHistory(filePath);
    await refreshHistory();

  } catch (error) {
    showError('PDF 加载失败: ' + error.message);
  }
}
