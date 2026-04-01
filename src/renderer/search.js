/**
 * 页内文字搜索模块
 * 使用 Electron 的 webContents.findInPage API
 */

let searchBar = null;
let searchInput = null;
let searchInfo = null;
let isVisible = false;

/**
 * 创建搜索栏 DOM
 */
function createSearchBar() {
  if (searchBar) return;

  searchBar = document.createElement('div');
  searchBar.className = 'search-bar hidden';
  searchBar.innerHTML = `
    <div class="search-bar-inner">
      <input type="text" class="search-input" placeholder="搜索…" spellcheck="false">
      <span class="search-info"></span>
      <button class="search-btn" id="searchPrev" title="上一个 (Shift+Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button class="search-btn" id="searchNext" title="下一个 (Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <button class="search-btn" id="searchClose" title="关闭 (Esc)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;

  document.querySelector('.editor-area').prepend(searchBar);

  searchInput = searchBar.querySelector('.search-input');
  searchInfo = searchBar.querySelector('.search-info');

  // 输入时实时搜索
  searchInput.addEventListener('input', () => {
    doSearch();
  });

  // Enter/Shift+Enter 查找上下一个
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        findPrev();
      } else {
        findNext();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideSearch();
    }
  });

  searchBar.querySelector('#searchPrev').addEventListener('click', findPrev);
  searchBar.querySelector('#searchNext').addEventListener('click', findNext);
  searchBar.querySelector('#searchClose').addEventListener('click', hideSearch);

  // 监听搜索结果
  // Electron 通过 found-in-page 事件返回结果，但在 preload 隔离环境下
  // 我们通过 IPC 回调来获取结果
}

/**
 * 执行搜索
 */
async function doSearch() {
  const text = searchInput.value.trim();
  if (!text) {
    searchInfo.textContent = '';
    await window.electronAPI.stopFindInPage();
    return;
  }
  await window.electronAPI.findInPage(text, { findNext: false });
  // 结果会通过 found-in-page 事件更新，这里先显示"搜索中"
  searchInfo.textContent = '搜索中…';
}

/**
 * 查找下一个
 */
async function findNext() {
  const text = searchInput.value.trim();
  if (!text) return;
  await window.electronAPI.findInPage(text, { forward: true, findNext: true });
}

/**
 * 查找上一个
 */
async function findPrev() {
  const text = searchInput.value.trim();
  if (!text) return;
  await window.electronAPI.findInPage(text, { forward: false, findNext: true });
}

/**
 * 显示搜索栏
 */
export function showSearch() {
  createSearchBar();
  searchBar.classList.remove('hidden');
  isVisible = true;
  searchInput.focus();
  // 如果有选中文本，自动填充
  const selection = window.getSelection().toString().trim();
  if (selection && selection.length < 200) {
    searchInput.value = selection;
    doSearch();
  }
  searchInput.select();
}

/**
 * 隐藏搜索栏
 */
export async function hideSearch() {
  if (!searchBar) return;
  searchBar.classList.add('hidden');
  isVisible = false;
  await window.electronAPI.stopFindInPage();
  searchInfo.textContent = '';
}

/**
 * 切换搜索栏可见性
 */
export function toggleSearch() {
  if (isVisible) {
    hideSearch();
  } else {
    showSearch();
  }
}

/**
 * 搜索栏是否可见
 */
export function isSearchVisible() {
  return isVisible;
}

/**
 * 设置搜索结果计数回调（由主进程 found-in-page 事件触发）
 */
export function updateSearchResult(activeMatchOrdinal, matches) {
  if (!searchInfo) return;
  if (matches === 0) {
    searchInfo.textContent = '无结果';
  } else {
    searchInfo.textContent = `${activeMatchOrdinal}/${matches}`;
  }
}
