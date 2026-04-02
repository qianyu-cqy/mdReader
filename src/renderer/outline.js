import dom from './dom.js';

// 记录拖拽后的自定义宽度，以便展开时恢复
let _outlineCustomWidth = null;

/**
 * 隐藏右侧大纲面板（统一入口）
 */
export function hideOutlinePanel() {
  // 保存内联 width（如果被拖拽过）
  const inlineW = dom.outlinePanel.style.width;
  if (inlineW) {
    _outlineCustomWidth = inlineW;
  }
  // 清除内联 width，让 .hidden 的 CSS width:0 能生效
  dom.outlinePanel.style.width = '';
  dom.outlinePanel.classList.add('hidden');
  dom.outlineSash.classList.add('hidden');
}

/**
 * 显示右侧大纲面板（统一入口）
 */
export function showOutlinePanel() {
  // 恢复拖拽调整过的自定义宽度（如果有）
  if (_outlineCustomWidth) {
    dom.outlinePanel.style.width = _outlineCustomWidth;
  }
  dom.outlinePanel.classList.remove('hidden');
  dom.outlineSash.classList.remove('hidden');
}

/**
 * 生成大纲（TOC）
 */
export function generateToc() {
  const markdownBody = dom.content.querySelector('.markdown-body');
  const emptyMsg = '<div class="empty-state-sm"><p>打开文件后显示大纲</p></div>';

  if (!markdownBody) {
    dom.tocList.innerHTML = emptyMsg;
    dom.tocListSidebar.innerHTML = emptyMsg;
    hideOutlinePanel();
    return;
  }

  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    const noHeadMsg = '<div class="empty-state-sm"><p>该文档没有标题</p></div>';
    dom.tocList.innerHTML = noHeadMsg;
    dom.tocListSidebar.innerHTML = noHeadMsg;
    hideOutlinePanel();
    return;
  }

  const fragment1 = document.createDocumentFragment();
  const fragment2 = document.createDocumentFragment();

  headings.forEach((heading, index) => {
    const id = 'heading-' + index;
    heading.id = id;
    const level = parseInt(heading.tagName.charAt(1));

    fragment1.appendChild(createTocItem(heading, id, level));
    fragment2.appendChild(createTocItem(heading, id, level));
  });

  dom.tocList.innerHTML = '';
  dom.tocList.appendChild(fragment1);
  dom.tocListSidebar.innerHTML = '';
  dom.tocListSidebar.appendChild(fragment2);

  // 显示大纲面板
  showOutlinePanel();
}

/**
 * 创建单个 TOC 项
 */
function createTocItem(heading, id, level) {
  const item = document.createElement('div');
  item.className = 'toc-item';
  item.setAttribute('data-level', level);
  item.setAttribute('data-target', id);
  item.textContent = heading.textContent;
  item.title = heading.textContent;

  item.addEventListener('click', () => {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    highlightTocItem(id);
  });

  return item;
}

/**
 * 高亮指定 TOC 项
 */
function highlightTocItem(targetId) {
  [dom.tocList, dom.tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-target') === targetId);
    });
  });
}

/**
 * 内容滚动时更新 TOC 高亮
 */
export function onContentScroll() {
  const markdownBody = dom.content.querySelector('.markdown-body');
  if (!markdownBody) return;

  const headings = markdownBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) return;

  const scrollTop = dom.content.scrollTop;
  const offset = 80;

  let currentId = '';
  headings.forEach(heading => {
    if (heading.offsetTop - offset <= scrollTop) {
      currentId = heading.id;
    }
  });

  [dom.tocList, dom.tocListSidebar].forEach(list => {
    list.querySelectorAll('.toc-item').forEach(item => {
      const isActive = item.getAttribute('data-target') === currentId;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  });
}

/**
 * 清空大纲并设置提示信息
 * @param {string} message
 */
export function clearOutline(message) {
  const msg = `<div class="empty-state-sm"><p>${message}</p></div>`;
  dom.tocList.innerHTML = msg;
  dom.tocListSidebar.innerHTML = msg;
}
