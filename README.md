# Cherry Studio · 小程序精简版

本项目是 [CherryHQ/cherry-studio](https://github.com/CherryHQ/cherry-studio) **v2.2.3** 的精简分支，只保留「小程序（Mini Apps）」板块，用于把 Cherry Studio 当作小程序容器/运行环境使用。基于上游代码（MIT 协议），非 Cherry 官方发行版。

> This is a **mini-apps-only fork** of Cherry Studio v2.2.3 (MIT). The desktop app boots straight into the Mini Apps module; chat, assistants, agents, knowledge base, paintings, translate, code, files, notes, marketplace and scheduled tasks are removed from the UI.

## 保留的能力

- **小程序板块**：小程序安装（本地包/内置/在线）、启动、卸载、更新、固定到侧边栏、多标签与会话保活
- **小程序沙箱运行时**：独立分区、受限协议、权限审核（AI、网络、存储、文件、剪贴板、通知）与调用审计
- **小程序 AI 能力**：走 Cherry Studio 的模型供应商与流式接口，支持默认对话模型、推理模型
- **必要设置**：供应商、模型（仅默认对话模型）、通用、外观、通知、数据（本地数据目录/缓存/备份/恢复）、关于、设置内搜索
- **桌面外壳**：标签栏、侧边栏（只含小程序）、窗口分离、多语言、主题、自动更新

## 已移除

| 层 | 移除内容 |
| --- | --- |
| 渲染层 | 聊天/助手、Agent、知识库、画板、翻译、代码、文件、笔记、市场、定时任务、启动台；对应的路由、页面、组件、hooks、i18n 引用 |
| 设置页 | 个人资料、MCP、技能、提示词、计算机使用、浏览器、网络搜索、文件处理、OCR、本地模型、API 网关、频道、设备连接、快捷键、快捷助手、划词助手、截图、依赖、订阅、用量、语音、系统、归档等 |
| 主进程 | 快捷助手、划词助手（含 `native/selection-panel`）、截屏浮层/截图对话、语音会话（`ai/voice`）、DeepSeek Harness、Hermes Dashboard、OpenClaw 服务，以及它们的 IPC handler/schema、窗口注册、托盘菜单、全局快捷键 |
| 其他 | 相关单元测试、语音冒烟脚本、构建入口 |

**仍然保留在主进程**：数据层（SQLite + 迁移）、模型供应商栈、agent runtime、MCP、知识库/浏览器/API 网关/文件处理等共享服务。小程序运行时、模型调用和数据 API 都构建在这套内核上，因此没有做进一步剥离（见「后续可做」）。

## 目录结构

```
src/
  main/                 Electron 主进程
    features/miniApp/   小程序安装器、沙箱运行时、权限能力
    data/               SQLite schema、数据服务、Data API handlers
    ai/                 模型调用、供应商、agent runtime（共享内核）
    services/           窗口、更新、通知、备份等系统服务
  preload/              IPC 桥
  renderer/             渲染层（仅 miniApps + 必要 settings）
    pages/miniApps/     小程序列表、详情、安装面板、显示设置
    components/MiniApp/ 小程序 WebView 容器、权限/更新弹窗
    layouts / route     标签页外壳、路由
  shared/               共享类型、数据 API 契约、IPC schema
packages/               内部包（ui、aiCore、provider-registry 等）
```

## 开发与构建

环境要求：Node.js ≥ 24.12、pnpm 12.6。

```bash
pnpm install

# 类型检查
pnpm typecheck:web     # 渲染层
pnpm typecheck:node    # 主进程 / preload / shared

# 构建
npx electron-vite build
pnpm run build:utility-process
```

启动开发模式：

```bash
pnpm dev
```

## 当前状态

- `typecheck:web`、`typecheck:node`、`electron-vite build`、`build:utility-process` 均通过
- 精简时删除了被移除功能的专属测试，`pnpm test` 不再作为完整门禁
- 上游的 `.github/workflows` 依赖 Cherry 官方仓库的 secrets/runner，在本仓库大概率不可用
- `pnpm-workspace.yaml` 中设置 `minimumReleaseAge: 0`：上游 lockfile 含比 pnpm 默认窗口更新的包，否则无法安装

## 后续可做

进一步移除主进程共享内核需要整体拆除 assistant/agent/MCP/skills 栈，并改写流式调用路径与数据表关系，属于独立的阶段性工程。

## 许可证与致谢

基于 [CherryHQ/cherry-studio](https://github.com/CherryHQ/cherry-studio) v2.2.3，遵循 [LICENSE](./LICENSE)（MIT）。本项目非 Cherry 官方发行版，与 CherryHQ 无隶属关系；原项目的版权与许可声明予以保留。
