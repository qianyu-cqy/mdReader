import dom from '../dom.js';
import state from '../state.js';
import { escapeHtml, getFileName } from '../utils.js';
import { updateEditorTab } from '../tab.js';
import { clearOutline } from '../outline.js';
import { updateStatusBarForPdf } from '../statusbar.js';
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

    // 清空大纲
    clearOutline('PDF 文件暂不支持大纲');

    // 更新状态栏
    updateStatusBarForPdf(fileName, totalPages);

    // 添加历史
    await window.electronAPI.addHistory(filePath);
    await refreshHistory();

  } catch (error) {
    showError('PDF 加载失败: ' + error.message);
  }
}
