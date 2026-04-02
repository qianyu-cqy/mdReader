/**
 * 集中管理所有 DOM 元素引用
 * 在 DOMContentLoaded 后才可安全使用
 */
const dom = {
  // Title bar
  get titlebarTitle() { return document.getElementById('titlebarTitle'); },
  get titlebar() { return document.getElementById('titlebar'); },

  // Activity bar
  get activityBar() { return document.getElementById('activityBar'); },
  get activityExplorer() { return document.getElementById('activityExplorer'); },
  get activityOutline() { return document.getElementById('activityOutline'); },

  // Primary sidebar
  get primarySidebar() { return document.getElementById('primarySidebar'); },
  get sidebarSash() { return document.getElementById('sidebarSash'); },
  get panelExplorer() { return document.getElementById('panelExplorer'); },
  get panelOutline() { return document.getElementById('panelOutline'); },
  get recentFilesToggle() { return document.getElementById('recentFilesToggle'); },

  // Editor area
  get editorTabs() { return document.getElementById('editorTabs'); },
  get breadcrumbBar() { return document.getElementById('breadcrumbBar'); },
  get content() { return document.getElementById('content'); },
  get currentPathDisplay() { return document.getElementById('currentPath'); },
  get breadcrumbActions() { return document.querySelector('.breadcrumb-actions'); },

  // Buttons
  get openFileBtn() { return document.getElementById('openFileBtn'); },
  get welcomeOpenBtn() { return document.getElementById('welcomeOpenBtn'); },
  get clearHistoryBtn() { return document.getElementById('clearHistoryBtn'); },
  get toggleThemeBtn() { return document.getElementById('toggleThemeBtn'); },
  get aboutBtn() { return document.getElementById('aboutBtn'); },
  get aboutModalOverlay() { return document.getElementById('aboutModalOverlay'); },
  get aboutModalClose() { return document.getElementById('aboutModalClose'); },
  get aboutAppVersion() { return document.getElementById('aboutAppVersion'); },
  get modeToggleBtn() { return document.getElementById('modeToggleBtn'); },

  // History
  get historyList() { return document.getElementById('historyList'); },

  // Theme stylesheets
  get hljsDark() { return document.getElementById('hljs-dark'); },
  get hljsLight() { return document.getElementById('hljs-light'); },

  // Outline panel (right side)
  get outlinePanel() { return document.getElementById('outlinePanel'); },
  get outlineSash() { return document.getElementById('outlineSash'); },
  get tocList() { return document.getElementById('tocList'); },
  get tocListSidebar() { return document.getElementById('tocListSidebar'); },
  get closeOutlineBtn() { return document.getElementById('closeOutlineBtn'); },

  // Status bar
  get statusFileInfo() { return document.getElementById('statusFileInfo'); },
  get statusWordCount() { return document.getElementById('statusWordCount'); },
  get statusEncoding() { return document.getElementById('statusEncoding'); },
  get statusType() { return document.getElementById('statusType'); },
};

export default dom;
