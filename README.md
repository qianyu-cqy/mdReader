# MD Reader - Markdown 阅读器

<div align="center">

📖 一个简洁优雅的 Markdown 阅读器

支持 macOS 和 Windows 平台

</div>

## ✨ 功能特性

### 核心功能
- 📝 **完整 Markdown 支持** - 支持 GFM (GitHub Flavored Markdown) 规范
- 🎨 **代码语法高亮** - 基于 highlight.js，支持 180+ 种编程语言
- 📂 **智能文件管理** - 左侧资源管理器，浏览历史记录，快速访问
- 🎯 **文档大纲** - 自动生成目录结构，快速导航到任意章节
- 📋 **一键复制代码** - 鼠标悬停显示复制按钮，提升阅读体验

### 界面体验
- 🎭 **双主题切换** - 深色/浅色主题，适应不同环境
- 🖱️ **拖放打开** - 拖拽文件即可打开，操作便捷
- ⌨️ **快捷键支持** - 完整的键盘快捷键系统
- 📐 **自由调整布局** - 侧边栏宽度可调，个性化工作区
- 🎯 **VSCode 风格设计** - 熟悉的界面布局，上手即用

## ⌨️ 快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Cmd/Ctrl + O` | 打开文件 | 选择 Markdown 文件打开 |
| `Cmd/Ctrl + B` | 切换侧边栏 | 显示/隐藏资源管理器 |
| `Cmd/Ctrl + Shift + E` | 资源管理器 | 打开资源管理器面板 |
| `Cmd/Ctrl + R` | 刷新页面 | 重新加载当前文件 |
| `Cmd/Ctrl + +/-` | 缩放页面 | 调整显示比例 |

## 📦 安装使用

### 方式一：下载安装包（推荐）

1. 前往 [Releases](../../releases) 页面下载对应平台的安装包
   - **macOS**: `MD Reader-x.x.x.dmg` 或 `MD Reader-x.x.x-mac.zip`
   - **Windows**: `MD Reader Setup x.x.x.exe` 或便携版

2. 安装并运行应用

> ⚠️ **macOS 用户注意**：首次打开如果提示"已损坏"或"无法验证开发者"，请在终端执行：
> ```bash
> xattr -cr /Applications/MD\ Reader.app
> ```
> 这是因为应用未进行 Apple 签名，属于正常现象，不影响使用。

### 方式二：从源码运行

```bash
# 1. 克隆仓库
git clone <repository-url>
cd md-reader

# 2. 安装依赖
npm install

# 3. 开发模式运行
npm start

# 4. 打包应用
npm run build:mac   # macOS 平台
npm run build:win   # Windows 平台
npm run build:all   # 所有平台
```

### 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本
- **Windows**: Windows 7 或更高版本
- **磁盘空间**: 约 100MB

## 🎯 使用指南

### 打开文件
- 点击欢迎页面的 **"打开文件"** 按钮
- 使用快捷键 `Cmd/Ctrl + O`
- 直接拖拽 `.md` 文件到窗口

### 浏览历史
- 左侧资源管理器会自动记录打开过的文件
- 点击历史记录可快速重新打开
- 鼠标悬停在记录上可删除单个历史

### 查看大纲
- 文件打开后会自动在右侧显示文档大纲
- 点击大纲标题可快速跳转到对应章节
- 滚动文档时大纲会自动高亮当前章节

### 切换主题
- 点击左下角的主题切换按钮
- 支持深色和浅色两种主题
- 主题设置会自动保存

## 🛠️ 开发

### 技术栈

- **Electron** `^33.0.0` - 跨平台桌面应用框架
- **Marked** `^12.0.0` - Markdown 解析器
- **Highlight.js** `^11.9.0` - 代码语法高亮
- **Electron Builder** - 应用打包工具

### 项目结构

```
md-reader/
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本（IPC 桥接）
├── renderer.js          # 渲染进程逻辑
├── index.html           # 主页面结构
├── styles.css           # 全局样式
├── assets/              # 应用图标资源
│   ├── icon.icns       # macOS 图标
│   └── icon.ico        # Windows 图标
├── dist/                # 打包输出目录
├── package.json         # 项目配置
└── README.md           # 项目说明
```

### 开发调试

```bash
# 启动开发模式（自动重载）
npm start

# 打开开发者工具
Cmd/Ctrl + Shift + I
```

### 构建发布

```bash
# 构建所有平台
npm run build:all

# 仅构建 macOS
npm run build:mac

# 仅构建 Windows
npm run build:win
```

构建产物位于 `dist` 目录。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发建议
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Marked](https://marked.js.org/) - Markdown 解析器
- [Highlight.js](https://highlightjs.org/) - 代码高亮库

---

<div align="center">
Made with ❤️ by Markdown Lovers
</div>
# mdReader
