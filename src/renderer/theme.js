import dom from './dom.js';

/**
 * 初始化主题（从 localStorage 读取）
 */
export function initTheme() {
  const saved = localStorage.getItem('md-reader-theme') || 'light';
  applyTheme(saved);
}

/**
 * 切换明暗主题
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('md-reader-theme', next);
}

/**
 * 应用指定主题
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const darkIcon = dom.toggleThemeBtn.querySelector('.theme-icon-dark');
  const lightIcon = dom.toggleThemeBtn.querySelector('.theme-icon-light');

  if (theme === 'light') {
    darkIcon.style.display = 'none';
    lightIcon.style.display = 'block';
    dom.hljsDark.disabled = true;
    dom.hljsLight.disabled = false;
  } else {
    darkIcon.style.display = 'block';
    lightIcon.style.display = 'none';
    dom.hljsDark.disabled = false;
    dom.hljsLight.disabled = true;
  }
}
