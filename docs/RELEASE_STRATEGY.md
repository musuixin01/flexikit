# FlexiKit 发布、版本与更新策略

## 1. 产品版本真源

FlexiKit Desktop 使用 SemVer。桌面产品版本的维护入口是 `apps/desktop/package.json`。

发布时以下版本必须完全一致：

- `apps/desktop/package.json`
- `apps/desktop/package-lock.json` 顶层版本与根包版本
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/Cargo.lock` 中 `flexikit-desktop`

根目录 `package.json`、Web 与 Backend 的 package version 属于仓库/服务构建元数据，不作为 Desktop 产品版本。

每次发布前必须运行 `npm run release:check-version`。

## 2. SemVer 规则

- `PATCH`：向后兼容 Bug 修复、稳定性和小型 UI 修正。
- `MINOR`：新增向后兼容功能；v0.x 阶段若包含数据结构变化，必须同时提供迁移与回滚说明。
- `MAJOR`：1.0.0 之后用于不兼容变化。
- 预发布版本使用 `-beta.N` / `-rc.N`，例如 `0.2.0-beta.1`。
- Git Tag 与产品版本一致，例如 `v0.1.0`。

任何改变 localStorage / WebView 数据、数据库 schema 或配置格式的版本，都必须先通过“旧版本写数据 → 新版本覆盖升级 → 数据仍可读”的回归。

## 3. Windows 发布流水线

1. 更新 `CHANGELOG.md`。
2. 同步桌面版本，并运行 `npm run release:check-version`。
3. 构建 Web desktop 产物。
4. 构建 Tauri optimized release。
5. 生成 NSIS 与 MSI。
6. 记录产物 SHA-256。
7. 做安装、启动、升级、卸载和用户数据保留回归。
8. 创建 `vX.Y.Z` Tag 和 Release。

当前 Runner 环境中，Tauri 子进程调用 `beforeBuildCommand` 会偶发阻塞，因此 CI/验收可先显式完成 Web desktop build，再使用 `src-tauri/tauri.release.conf.json` 跳过重复 beforeBuild。正式跨平台配置保持不变。

### 干净 Windows 安装门禁

最终发布前必须在没有既有 FlexiKit 安装和用户数据的 Windows 11 VM / 新机器执行：

`powershell -ExecutionPolicy Bypass -File scripts/windows-clean-install-smoke.ps1 -InstallerPath "<FlexiKit setup.exe>" -ExpectedVersion "0.1.0"`

脚本自动验证：NSIS 安装、卸载注册、安装版启动、真实 UI 中 `44 个工具` / `全部 44`、本地诊断日志、静默卸载和残留清理。为保护真实用户数据，只要发现既有 FlexiKit 安装或 `%LOCALAPPDATA%\\com.flexikit.desktop`，脚本会拒绝执行。

当前开发机已补充验证：Backend 3001 与 Vite 5173 同时关闭时，release 冷启动窗口截图在约 5.2 秒已完整显示 44 个工具；此前约 20 秒才出现完整 UIA 树属于 WebView2 Accessibility 延迟，不是实际首屏延迟。当前主机 Hyper-V 已启用但没有 VM，Windows Sandbox 为 Disabled，常用目录无 Windows ISO，因此真实干净客体系统验收仍保留为发布前外部环境门禁。

## 4. 自动更新方案

自动更新采用“签名更新 + HTTPS manifest + 用户确认安装”的路线，禁止从任意 URL 下载后直接执行。

### Stable / Beta

- Stable：默认通道，只接收正式 SemVer 版本。
- Beta：用户主动加入后接收 `-beta.N` / `-rc.N`。
- 默认不跨通道自动升级。

### 更新检查

- 后续接入 Tauri v2 updater 插件。
- 主窗口稳定后延迟检查，避免影响冷启动。
- 正常情况下最多每 24 小时自动检查一次，同时保留“手动检查更新”。
- 只提示更高版本，不自动降级。

### 签名与密钥

- 更新包必须使用 Tauri updater 签名。
- 私钥只能存放在 CI Secret / 发布机安全存储中，严禁进入 Git、安装包或普通配置文件。
- 客户端只内置公钥。
- manifest 和安装包均通过 HTTPS 发布。
- 发布前校验 SHA-256，并保存到 Release 记录。

### 安装行为

- 发现更新后展示版本号、变更摘要和下载大小。
- v0.x 默认由用户确认后下载与安装，不做后台强制静默更新。
- 安装前不得清除 `com.flexikit.desktop` 用户数据目录。
- 更新失败时保留当前可运行版本，并提供手动下载安装包入口。

### v0.1 状态

v0.1 已完成更新架构和升级兼容性验证，但暂不启用在线自动更新。启用条件：

1. 正式 HTTPS Release/manifest 地址确定；
2. updater 签名密钥生成并纳入 CI Secret；
3. Tauri updater 插件接入；
4. Stable/Beta manifest 回归通过；
5. 断网、签名错误、下载中断、安装失败和回滚路径通过测试。

自动更新的长期稳定性仍属于后续真实用户测试阶段，不因本方案完成而提前视为“生产稳定”。

## 5. 诊断日志

Desktop 本地诊断日志只记录程序级事件，不记录剪贴板正文、Prompt、歌词、用户文件内容或密码。

Windows 默认目录：`%LOCALAPPDATA%\\com.flexikit.desktop\\logs\\flexikit.log`。

日志包含启动、setup 完成、用户退出、正常 event loop 退出、runtime error 和 Rust panic。单文件达到 2 MB 后轮转，最多保留 3 个备份。

v0.1 不自动上传日志。需要排障时由用户主动提供。
