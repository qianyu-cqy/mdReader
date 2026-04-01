/**
 * 设置拖拽调整面板大小
 * @param {HTMLElement} sash - 拖拽手柄
 * @param {HTMLElement} panel - 要调整的面板
 * @param {'left'|'right'} direction - 面板方向
 * @param {number} minWidth - 最小宽度
 * @param {number} maxWidth - 最大宽度
 */
export function setupSashResize(sash, panel, direction, minWidth, maxWidth) {
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
