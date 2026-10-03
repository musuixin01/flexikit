# FlexiKit Widget Plugin Specification

> Status: V1 baseline
> Host API: `WIDGET_PLUGIN_API_VERSION = 1`
> Source of truth: `apps/web/src/desktop/widgetPlugin.ts` + `apps/web/src/desktop/widgetRegistry.ts`

## 1. 目标

Widget Plugin V1 的目标是让 FlexiKit 的桌面 Widget 具备稳定、可验证、可继续扩展的注册契约，同时保持当前 Canvas 数据结构和现有 Widget 完全兼容。

V1 解决以下问题：

- 每个 Widget 都有显式插件身份、版本和 Host API 版本。
- 每个 Widget 显式声明需要的敏感能力。
- 联网 Widget 必须声明固定 HTTPS Origin。
- 调用 Tauri IPC 的 Widget 必须声明具体 Native Command。
- 插件注册时拒绝重复 type、非法 manifest、未知 API 版本和明显错误的尺寸/Schema。
- 支持 single / multiple 两种实例策略。
- 明确 Widget 的生命周期、临时状态和持久化状态边界。

V1 **不是第三方代码沙箱，也不是插件商店运行时**。

## 2. 核心结构

每个可注册 Widget 由两层信息组成：

1. `WidgetDefinition`
   - `type`
   - `title`
   - `description`
   - `icon`
   - Vue `component`
   - 默认宽高
   - 可选 `configSchema`
   - 必填 `plugin` manifest

2. `WidgetPluginManifest`
   - `id`：稳定插件 ID，例如 `flexikit.weather`
   - `version`：插件自身 SemVer
   - `apiVersion`：当前固定为 `1`
   - `source`：`builtin | extension`
   - `instancePolicy`：`single | multiple`
   - `permissions`
   - 可选 `networkOrigins`
   - 可选 `nativeCommands`

内置 Widget 统一通过 `createBuiltinWidgetPlugin()` 生成 manifest，再通过 `registerWidgetPlugin()` 注册。

## 3. 生命周期契约

V1 不额外发明一套与 Vue 冲突的生命周期 Hook。

统一约定：

- Mount：Vue `onMounted`
- Unmount：Vue `onBeforeUnmount`
- 临时状态：组件实例内的 `ref / computed / reactive`
- 持久状态：当前 `DesktopWidget.config`
- Canvas 级持久化：由 `desktopCanvas` Store 统一负责

对应常量：

`WIDGET_PLUGIN_LIFECYCLE_CONTRACT`

插件不得依赖模块级可变全局变量保存单实例状态，否则多个 Widget 实例会互相污染。

需要计时器、事件监听、AbortController、媒体轮询等资源时，必须在组件卸载时释放。

## 4. Permissions

当前权限枚举：

- `network`
- `native-command`
- `desktop-read`
- `desktop-open`
- `clipboard-read`
- `clipboard-write`
- `system-read`
- `media-control`
- `tool-launch`

规则：

- 声明 `network` 时必须同时声明至少一个 `networkOrigins`。
- `networkOrigins` 必须是精确的 HTTPS Origin，例如 `https://api.open-meteo.com`，不能写路径、Query 或通配符。
- 声明 `native-command` 时必须同时列出至少一个 `nativeCommands`。
- Native Command 名称必须使用小写 snake_case。
- 权限数组、Origin 和 Native Command 不允许重复。

### 重要安全说明

V1 权限 manifest 是**可审计契约**，当前不是 JavaScript 沙箱。

也就是说：

- 它可以在注册阶段验证声明是否完整。
- 它可以让代码审查、未来插件 UI 和发布流程知道插件声称使用什么能力。
- 它目前不能阻止一个已经被打包进 FlexiKit 的恶意 Vue 模块直接调用浏览器 API。

因此 V1 只允许**随 FlexiKit 构建一起审查和打包的本地可信代码**。

在真正支持第三方安装包、插件市场或用户下载插件之前，必须先实现独立权限执行层 / Sandbox；不得直接动态执行远程 JS。

## 5. Network 规则

联网插件必须：

- 明确声明 `network`。
- 明确列出 HTTPS Origin。
- UI 对用户说明联网行为。
- 默认不需要联网的能力不得偷偷联网。
- Secret / API Key 不得硬编码在 WebView 插件代码中。

当前示例：

- Weather：
  - `https://geocoding-api.open-meteo.com`
  - `https://api.open-meteo.com`
- Music 联网歌词：
  - `https://lrclib.net`

商业 API 凭据未来必须由 Backend / 受控代理 / 安全原生层持有。

## 6. Native Command 规则

调用 Tauri IPC 的插件必须在 manifest 中声明具体命令。

例如 Folder：

- `get_desktop_item_icon`
- `get_desktop_items`
- `get_desktop_folder_preview`
- `open_desktop_item`

Manifest 中声明命令并不会替代 Rust 侧的真正权限检查。

路径、Known Folder、受控应用目录等安全边界仍必须由 Rust Command 自己验证。

## 7. 实例策略

`instancePolicy`：

- `multiple`：默认，可添加多个实例。
- `single`：Canvas 只能存在一个相同 type 的实例。

当前 `desktop-organizer` 使用 `single`。

Canvas 添加组件时会检查该策略；如果单实例 Widget 已存在，则选中现有实例，而不是重复创建。

## 8. 注册校验

`registerWidgetPlugin()` 当前拒绝：

- 重复 Widget type。
- 非 lowercase kebab-case type。
- 空标题 / 描述 / 图标。
- 过小或非法默认尺寸。
- configSchema 重复 key。
- 非法插件 ID。
- 非 SemVer 插件版本。
- 不支持的 Host API 版本。
- 未知 / 重复 permission。
- 未声明 network permission 却填写 Origin。
- 声明 network 但没有 Origin。
- 非 HTTPS / 非精确 Origin。
- 未声明 native-command 却填写 Native Command。
- 声明 native-command 但没有命令列表。
- 非法或重复 Native Command。

注册失败必须 Fail Fast，不能静默覆盖已有 Widget。

## 9. Built-in Widget 权限基线

| Widget | 主要声明 |
| --- | --- |
| Clock / Calendar / Notes / Todo | 无敏感权限 |
| Desktop Organizer | desktop-read / desktop-open / native-command |
| Folder | desktop-read / desktop-open / native-command |
| System Monitor / Disk | system-read / native-command |
| Weather | network + Open-Meteo Origins |
| Launcher / Search | tool-launch |
| Clipboard | clipboard-read / clipboard-write / native-command |
| Music | media-control / native-command / network |
| AI 快捷台 | clipboard-write / tool-launch / native-command |

该表只是摘要；精确权限和命令以 `BUILTIN_PLUGIN_OPTIONS` 为准。

## 10. Config Schema V2

`WidgetDefinition.configSchema` 当前支持：

- `boolean`：开关。
- `select`：固定选项。
- `range`：滑杆，必须声明 min/max/step。
- `number`：数字输入，必须声明 min/max/step，可带 unit。
- `text`：文本输入，可声明 placeholder/maxLength。
- `color`：颜色选择，值固定为 `#RRGGBB`。
- `section`：Inspector 分组标题，不写入 Widget config。

除 section 外，值字段都必须声明 `defaultValue`。

所有 Schema item 可选：

`visibleWhen: { key, equals }`

V2 为避免依赖循环，要求条件只能引用当前 item 之前已经声明的值字段。Inspector 根据**归一化后的当前 config**计算显示状态。

注册时会校验：

- key 格式与唯一性。
- label 非空。
- select 选项唯一且 default 存在。
- number/range 的 default/min/max/step 为有限合法数值。
- text maxLength 为 1–4096 整数。
- color 默认值符合 `#RRGGBB`。
- visibleWhen 引用存在、顺序正确且值类型匹配。

运行时 `resolveWidgetConfigValue()` 会再次进行防御性归一化，不能假设 localStorage 中的数据永远可信。

当前真实使用：

- Weather：Section + Number + visibleWhen，控制 1–4 天预报。
- Notes：Section + Color，控制单个便签实例的强调色。

## 11. 扩展接入流程

新增 Widget 时：

1. 新建 Vue Widget 组件，Props 使用 `DesktopWidget`。
2. 临时状态保存在组件实例；需要持久化的数据写入当前 `widget.config`。
3. 在 Registry 中添加 `WidgetDefinition`。
4. 为其创建 Plugin Manifest。
5. 只声明实际需要的最小权限。
6. 有网络时列出固定 HTTPS Origins。
7. 有 Tauri IPC 时列出具体 Native Commands。
8. 运行 Web strict build。
9. 运行 Desktop 回归和有界启动烟测。
10. 更新 MASTER_PLAN / STABLE_CHECKLIST / CHANGELOG / TECH_DEBT。

## 12. V1 明确不做

以下内容不属于当前 V1：

- 在线插件市场。
- 远程 JS 加载。
- npm 包运行时安装。
- 任意本地插件目录扫描并执行代码。
- iframe / Worker 沙箱。
- 权限弹窗和实时授权管理。
- 插件签名 / 发布者证书。
- 插件自动更新。
- Host API 多版本兼容桥。

这些能力必须在真正开放第三方插件之前单独设计和安全评审。
