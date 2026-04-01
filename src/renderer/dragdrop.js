import { loadFile } from './file-loader.js';

/**
 * 设置拖放文件功能
 */
export function setupDragDrop() {
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
      // 支持同时拖入多个文件，每个文件打开为一个标签页
      for (let i = 0; i < files.length; i++) {
        const filePath = window.electronAPI.getPathForFile(files[i]);
        await loadFile(filePath);
      }
    }
  });
}
