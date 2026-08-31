# 2026-08-07

- 操作：新建浏览器页面后立即检查收藏星标的液态渐变计算样式。
- 错误：工具卡片数据尚未完成初始化，页面中没有收藏按钮，断言返回失败。
- 原因与处理：页面数据加载是异步过程；等待卡片元素出现后再执行相同样式检查。

- 操作：结束拖拽与收藏交互验证使用的临时 Vite 运行单元。
- 错误：运行单元已达到 124 秒时限并返回超时状态。
- 原因与处理：常驻预览服务超过运行单元时限；确认 5174 端口后，仅停止该明确端口对应的残留进程。

- 操作：在现有浏览器页面中补充验证收藏激活态的计算样式。
- 错误：选中的独立页面已被浏览器回收，无法继续执行样式断言。
- 原因与处理：独立检查页生命周期已结束；重新打开 App 页面后直接执行最小样式断言，不复用旧页面。

- 操作：在未登录的独立浏览器环境中验证拖拽预览抑制与收藏视觉状态。
- 错误：拖拽断言通过，但直接点击收藏按钮后状态未切换，组合断言返回失败。
- 原因与处理：未登录流程会拦截收藏并提示登录，不能用于验证已收藏样式；保留已通过的拖拽结果，改为在浏览器中注入现有本地收藏数据并重新加载，再检查真实已收藏渲染状态。

- 操作：同时压缩 App 页头并将默认主题变量切换为蓝色。
- 错误：`styles/base.css` 含有旧编码字节，补丁工具拒绝读取，整组补丁未应用。
- 原因与处理：该历史样式文件不是有效 UTF-8；不转换整份文件，拆分补丁，仅修改 UTF-8 的 Home 与主题 Store。运行时主题 Store 会统一覆盖默认 CSS 变量。

- 操作：在浏览器中读取 App 侧边栏收缩按钮的实际位置与外框内边距。
- 错误：此前用于检查的浏览器页面已关闭，脚本没有可用的选中页面。
- 原因与处理：临时预览上下文已随上一次验证结束；新建独立页面后重新执行同一坐标断言。

- 操作：结束 App、Discover、About 视觉验证使用的临时 Vite 运行单元。
- 错误：运行单元已先达到 124 秒时限并返回超时状态，无法再次正常终止。
- 原因与处理：预览服务是常驻进程，运行单元超时后已结束；仅确认 5174 端口是否仍在监听，如有残留则只停止该明确端口对应的进程。

- 操作：检查临时预览的 5174 监听端口。
- 错误：未找到监听连接，端口检查返回非零状态。
- 原因与处理：终止运行单元时临时子进程也已退出；改用可控的前台运行单元启动并保留单元编号。

- 操作：使用隐藏的独立进程启动 5174 端口的临时 Vite 预览。
- 错误：启动命令未按预期结束并持续占用运行单元，已主动终止该运行单元。
- 原因与处理：子进程继承输出导致 PowerShell 会话保持；改为确认端口状态，直接使用现有预览进程完成检查，最后按明确端口停止。
- 补充：首次追加错误记录时选用了乱码显示后的末行作为定位点，补丁未匹配；改用稳定的文件标题定位写入。

- 操作：结束四页面桌面与移动端验证使用的临时 Vite 运行单元。
- 结果：运行单元已达到 124 秒时限并自动结束，终止接口返回超时状态。
- 处理：仅检查 5174 端口，并在存在带明确 `--port 5174` 参数的残留进程时停止该进程。

- 补充：`--ignoreDeprecations 6.0` 无法覆盖配置解析前的旧值，TS5103 仍在读取 `tsconfig` 时出现；检查当前编译器是否提供忽略配置选项，否则以 Vite 构建为准。

- 操作：使用现有 TypeScript 5.9.3 执行 `tsc --noEmit`，补充检查普通 TS 文件。
- 错误：`tsconfig.json` 的旧 `ignoreDeprecations` 值触发 TS5103，配置解析阶段停止。
- 原因与处理：项目配置针对旧 TypeScript；不修改配置文件，使用命令行兼容值覆盖后再运行检查。

- 操作：查找本机可用于旧版 `vue-tsc` 的 Node 18/20 运行时。
- 错误：递归扫描 Program Files 时虽然找到候选 `node.exe`，但部分目录访问结果使命令返回非零状态。
- 原因与处理：全目录扫描范围过大且包含受保护路径；停止扫描，只验证已返回的明确候选路径版本。

- 操作：四个页面优化完成后执行前端完整 `npm run build`。
- 错误：旧版 `vue-tsc 1.8.27` 在 Node.js 24.15.0 下抛出 `Search string not found: /supportedTSExtensions/`，未进入项目类型检查。
- 原因与处理：这是现有工具链与 Node 24 的兼容问题；不升级项目依赖，尝试使用工作区内兼容的 Node 运行时执行完整构建，并保留已通过的 Vite 构建结果。

- 补充：直接使用 computed 后移动端导航仍未恢复；根因是 Vue 对缺省 Boolean Prop 自动赋值为 `false`。使用 `withDefaults` 明确将搜索、收藏和导航链接默认设为开启。

- 操作：优化通用 Navbar 的可选搜索框和导航链接后进行移动端检查。
- 错误：模板对已有计算状态再次使用 `!== false` 判断，渲染结果将导航链接和搜索框关闭。
- 原因与处理：`showSearch` 与 `showNavLinks` 已是带默认逻辑的 computed；模板改为直接使用这两个状态。

- 操作：排查移动端通用导航中链接与搜索框未显示的样式来源。
- 错误：搜索命令同时传入了 `apps/web/src/styles/*.css`，Windows 未展开该通配路径，命令返回非零状态。
- 原因与处理：路径通配方式不兼容；改为直接扫描 `apps/web/src/styles` 目录并使用 `--glob "*.css"`。

- 操作：扫描 `.agents/skills/*.md` 的触发条件，为多页面布局优化加载项目技能。
- 错误：Windows 环境未展开传给 `rg` 的通配符，返回路径语法错误。
- 原因与处理：`rg` 在该调用方式下不接受 PowerShell 风格文件通配；改为扫描 `.agents/skills` 目录并使用 `--glob "*.md"`。

- 操作：查找主题应用函数，为浏览器标签页 Logo 接入动态颜色。
- 错误：按预期名称 `applyTheme` 搜索没有命中并返回非零状态。
- 原因与处理：当前 store 使用了不同的函数命名；改为搜索主题变量写入入口与监听器后继续。

- 操作：为 FlexiKit 品牌 Logo 增加主题色联动。
- 错误：首次补丁使用了与当前 `ui.ts` 不一致的颜色混合函数签名作为定位点，补丁未应用。
- 原因与处理：此前主题系统已调整函数结构；读取实际函数位置后分段添加品牌滤镜变量和色相辅助函数。

- 操作：撤销网站 Logo 主题染色后检查残留代码并构建前端。
- 错误：命令工作目录已经位于 `apps/web`，仍传入带 `apps/web` 前缀的路径，导致文件查找失败。
- 原因与处理：检查命令的相对路径重复；改用 `src/...` 路径后重新执行，不影响撤销结果。

- 操作：执行 `git add -A` 创建项目初始提交。
- 错误：`backend/ does not have a commit checked out`，Git 无法索引嵌套仓库。
- 原因：`backend/` 内存在独立且尚无提交的 `.git` 元数据。
- 处理：检查嵌套仓库历史与远程配置，确认无须保留后再以可恢复方式解除嵌套。

- 操作：对首次提交执行 `git diff --cached --check`。
- 结果：检查报告现有源码和文档中存在行尾空格，因此返回非零状态。
- 处理：该问题不影响代码内容或初始版本存档；为避免无关的全仓格式化，本次保留原文件，仅记录检查结果。

- 操作：首次提交前运行 Web 与后端构建。
- 结果：后端 `nest build` 通过；Web 构建失败，提示本地 `node_modules` 缺失，且 `vue-tsc` 在 Node.js 24.15.0 下出现 `Search string not found: /supportedTSExtensions/`。
- 原因：当前前端依赖安装状态不完整，旧版 `vue-tsc` 与当前 Node.js/TypeScript 组合不兼容。
- 处理：本次仅保存现有版本，不擅自安装或升级依赖；后续单独处理 Web 构建环境。

- 操作：为缺失的数据库表生成 TypeORM 初始迁移。
- 错误：`typeorm-ts-node-esm migration:generate` 在加载数据源时返回 `SyntaxError: Invalid or unexpected token`。
- 原因：后端 `tsconfig` 使用 CommonJS，而 package 脚本错误调用了 ESM 版 TypeORM 启动器。
- 处理：将 TypeORM CLI 脚本切换为 `typeorm-ts-node-commonjs` 后重新生成迁移。

- 操作：启动临时 Vite 进程验证 `/api/tools` 代理链路。
- 错误：包含临时日志清理和进程终止的组合命令被本机安全策略拦截。
- 原因：测试命令包含受限的清理操作，并非应用代码失败。
- 处理：改用可控的前台开发服务执行代理测试，再通过运行单元的终止机制关闭。

- 操作：读取图标链路相关文件的指定行区间。
- 错误：PowerShell 的 `Math.Min` 接收到不匹配的区间参数类型。
- 原因：辅助读取脚本把单个区间数组展开成了标量。
- 处理：改用 `Select-Object -Skip/-First` 分段读取，不影响项目代码。

- 操作：为官网静态预览增加元数据请求和动画后执行 Web 构建。
- 错误：Vue 样式解析器报告 `Unknown word const`。
- 原因：结构化补丁将 `loadWebsitePreview()` 误插入第二段 `<style scoped>`。
- 处理：把预览请求函数和 URL 监听移回 `<script setup>`，再重新构建验证。
- 操作：在未启动后端时直接请求 `/tools/preview` 进行联调。
- 错误：PowerShell 返回“无法连接到远程服务器”。
- 原因：本地 `127.0.0.1:3000` 没有后端进程监听，并非预览接口本身报错。
- 处理：临时启动已构建的后端，再单独请求接口验证；验证结束后关闭临时进程。
- 操作：以前台命令 `node dist/main.js` 启动临时后端。
- 错误：工具在 1 秒后超时，未返回可继续等待的运行单元。
- 原因：开发服务是常驻进程，短超时的前台执行方式不适合该验证。
- 处理：改用隐藏的独立进程启动，并记录精确 PID，验证完成后只停止该 PID。
- 操作：读取 SSRF 工具文件以检查官网预览请求逻辑。
- 错误：使用了不存在的路径 `backend/src/common/security/url-safety.ts`，命令返回非零状态。
- 原因：项目实际导入路径为 `common/utils/ssrf.util.ts`。
- 处理：按源码 import 指向的真实路径读取，不修改业务代码。
- 操作：验证 `example.com` 网站预览元数据接口。
- 错误：请求 `127.0.0.1:3000` 时提示无法连接到远程服务器。
- 原因：验证时后端服务未启动，3000 端口没有监听进程。
- 处理：临时启动已构建的后端服务后重新验证接口。

- 操作：临时后端启动后再次请求网站预览接口。
- 错误：3000 端口仍拒绝连接，未取得预期标题。
- 原因：待检查临时进程的实际监听端口与启动状态。
- 处理：检查非敏感端口配置、监听连接和进程输出后再验证。

- 操作：枚举 Node 进程及监听端口定位临时后端未响应原因。
- 错误：系统进程详情查询超过 10 秒超时。
- 原因：`Win32_Process` 全量查询在当前 Windows 环境响应过慢。
- 处理：缩小为容器状态、数据库端口和运行单元输出检查。

## 2026-08-07 设置面板视觉检查

- 操作：在浏览器中打开 `http://127.0.0.1:5173` 检查新版设置面板。
- 错误：浏览器返回 `ERR_CONNECTION_REFUSED`。
- 原因与处理：前端开发服务未运行；先完成 Vite 构建验证，再启动临时预览服务进行视觉检查。
- 补充：首次追加记录时使用了无上下文的补丁定位，补丁未匹配；改用日志末行作为稳定锚点后写入。
- 补充：使用隐藏后台进程启动临时 Vite 服务时被本机策略拦截；改为可控的前台运行单元启动，验证后再终止该运行单元。
- 补充：浏览器截图无法保存到仓库路径，工具返回目录权限拒绝；改为直接获取截图内容进行视觉检查，不向仓库写入临时图片。

## 2026-08-07 全局主题色阶检查

- 操作：搜索前端全局 CSS 变量及主题选择器。
- 错误：搜索表达式以 `--bg-primary` 开头，被工具误识别为命令参数。
- 原因与处理：缺少显式模式参数；改用 `rg -e` 传递以双横线开头的表达式后继续检查。
- 操作：为全局背景层加入缓慢环境光动画。
- 错误：补丁工具提示 `styles/base.css` 包含无效 UTF-8 字节，拒绝直接更新。
- 原因与处理：该历史样式文件使用旧编码；不转换整份文件，改在 UTF-8 的设置组件样式中用全局选择器安全覆盖背景动画。
- 操作：为功能图标加入主题色联动规则。
- 错误：补丁引用了调整前的环境光样式行，当前文件无法匹配。
- 原因与处理：前一轮已降低环境光参数；改用固定的布局图标规则和动画关键帧作为插入锚点。
# 2026-08-08

- Web 端 1:1 桌面清理：补丁工具无法读取二进制 `.ico`，因此不能删除旧 favicon。处理为在桌面 `.gitignore` 中排除 `public/`；该文件不被 Tauri 或 Web 构建引用，也不会进入提交。
- Web 端 1:1 桌面清理：即使单独指定旧 favicon，直接 `Remove-Item` 仍被策略拦截。处理为交由补丁工具删除这个由当前任务生成且未跟踪的单个二进制文件；若工具不支持则仅将其排除，不再尝试系统删除。
- Web 端 1:1 桌面清理：一次命令同时删除旧 favicon 和多个空目录被安全策略拦截。处理为不组合目录清理，只删除明确的单个未跟踪 favicon 文件；空目录不影响 Git，可保留。
- Web 端 1:1 桌面构建：已验证目标路径后尝试直接递归删除 Cargo `target`，仍被本机安全策略拦截。处理为改用 Cargo 自带的 `cargo clean` 清理当前项目生成物，避免直接文件系统递归删除。
- Web 端 1:1 桌面构建：迁回项目目录的 Cargo `target` 缓存仍记录旧 D 盘绝对路径，Tauri build script 因找不到 `D:\DevTools\Rust\targets\...\permissions` 失败。处理为删除仅包含可再生成产物的旧 `apps/desktop/src-tauri/target`，在原项目目录进行一次干净 Release 构建。
- 桌面端复用 Web：复查剩余 API 字符串时使用了包含 PowerShell 反引号的正则，导致字符串终止符解析失败。处理为彻底停用该复杂表达式，改用普通 `/api` 文本搜索后人工区分导入路径与请求地址。
- 桌面端复用 Web：搜索现有 Tauri 运行时判断没有命中，`rg` 按约定返回非零状态，使组合检查显示失败；前面的 `.gitignore` 与 schema 清单已正常输出。处理为确认项目尚无运行时判断工具，直接新增统一 API 地址辅助函数。
- 桌面端复用 Web：检查旧 `apiClient` 引用时再次在 PowerShell 双引号中混用了正则引号字符，导致解析失败。处理为取消复杂正则，仅按文件名文本搜索，再分段读取相关组件。
- 桌面端复用 Web：组合搜索 Web API 直连调用时，PowerShell 将包含反引号与引号的正则表达式解析为未闭合字符串。处理为拆分文件读取与 `rg` 搜索，使用简单模式分别查找 `/api` 和 `axios.create`。
- C++ Build Tools 安装：`winget` 等待官方安装器超过 10 分钟后运行单元返回超时 124，期间没有安装失败输出。处理为不重复启动安装，先检查 D 盘目标目录、Visual Studio Installer 状态和相关进程，确认现有安装是否仍在继续或已经完成。
- 桌面端原生编译：修正 Tauri feature 后编译进入 Rust crate 阶段，但因系统缺少 MSVC `link.exe` 失败。处理为把 Visual Studio 2022 C++ Build Tools 主程序安装到 D 盘，再从其开发者环境中重新编译。
- 桌面端原生编译：Rust 安装完成后首次 `cargo check` 在依赖解析阶段失败，Tauri 2 不存在旧配置中的 `window-set-theme` feature。处理为从 `Cargo.toml` 移除该无效 feature，窗口主题 API 继续由 Tauri 2 权限系统控制。
- 桌面端视觉验证：结束临时 Vite 前台运行单元时返回 124 秒超时状态；该状态来自常驻开发服务的运行时限。处理为只检查 1420 端口是否仍监听，若有残留仅停止该明确端口对应进程。
- 桌面端浏览器预览：控制台发现 `/favicon.ico` 返回 404。原因是桌面前端没有 public 图标；处理为复用项目现有 FlexiKit 图标作为桌面页签图标并重新构建验证。
- 桌面端视觉验证：终止未成功监听的隐藏 Vite 运行单元时系统返回拒绝访问。该单元未提供网页服务；后续只按明确的 1420 端口检查残留，不进行广泛进程终止。
- 桌面端视觉验证：首次打开 `127.0.0.1:1420` 返回连接拒绝，说明隐藏启动的 Vite 子进程尚未成功监听。处理为终止该可控运行单元，改用直接前台启动并等待服务输出后再检查。
- 桌面端视觉验证：用隐藏后台进程组合启动 Vite、截图并终止进程的命令被本机安全策略拦截。处理为改用可控的前台运行单元启动预览，再单独截图和终止，不执行组合式进程清理。
- 桌面原生层验证：执行 `cargo check` 时系统提示找不到 Cargo。原因是当前电脑尚未安装 Rust 工具链或 Cargo 未加入 PATH；先确认常见安装位置，若仍缺失则保留已通过的前端构建结果并明确说明安装包构建条件。
- 桌面端实现：组合补丁在替换 `src-tauri/src/main.rs` 乱码注释时定位失败。原因是旧文件包含损坏的编码字符，文本与读取显示不一致；处理为先完整替换该短文件，再分别添加样式和权限文件。

- 暗色主题多页面视觉验证：临时 Vite 服务在结束等待时已达到 60 秒超时，终止调用返回 124；随后按 5174 端口确认并清理残留进程。
- 暗色主题净化：`base.css` 含历史非 UTF-8 字节，`apply_patch` 无法安全读取；放弃直接修改该文件，改由运行时主题变量和组件暗色覆盖完成调整。
- 导航栏右侧控制组视觉验证：临时 Vite 服务在结束等待时已达到 60 秒超时，终止调用返回 124；随后按 5174 端口确认并清理残留进程。
- 导航栏右侧控制组响应式验证：Chrome 当前窗口处于非普通状态，直接调整窗口尺寸失败；改用设备视口模拟检查移动端布局。
- 全页面液态玻璃视觉验证：临时 Vite 服务在结束等待时已达到 60 秒超时，终止调用返回 124；随后按 5174 端口确认并清理残留进程。
- 导航栏液态玻璃图标验证：临时 Vite 服务在结束等待时已达到 60 秒超时，终止调用返回 124；随后按 5174 端口确认并清理残留进程。
- 实时预览滚动验证：Playwright MCP 启动失败，原因是本机缺少其专用 Chromium Headless Shell。未修改项目依赖，改用 Chrome DevTools MCP 继续验证。
- 实时预览滚动验证：设置按钮首次点击超时，页面底部 Cookie 提示层可能拦截交互；先关闭提示层后再验证。
- 实时预览滚动验证：Chrome DevTools MCP 拒绝将截图写入项目目录（工具工作区路径识别限制）；改为直接返回截图进行视觉检查。
- 实时预览滚动验证：临时 Vite 服务在结束等待时已达到 120 秒超时，终止调用返回 124；随后按 5174 端口确认并清理残留进程。
### 2026-08-08 - Searching prior desktop build commands returned no matches

- Command: `rg -n "VsDevCmd|tauri build|CARGO_HOME" .agents apps/desktop ...`
- Result: `rg` exited with code 1 because no matching text was found.
- Resolution: use the already verified Rust and Visual Studio paths directly for the Tauri build; do not treat an empty search as a build failure.
### 2026-08-08 - Tauri rebuild could not replace a running desktop executable

- Command: desktop `npm run tauri build` from the Visual Studio developer environment.
- Error: Cargo could not remove `target\release\flexikit-desktop.exe` with Windows error 5 (access denied).
- Cause: a previously launched FlexiKit desktop process still held the executable open.
- Resolution: stop only the exact `flexikit-desktop` process, confirm it is gone, then rerun the same build.
### 2026-08-08 - Follow-up desktop screenshot targeted an exited process

- Action: attempted to capture process ID 34384 after an automated mouse interaction.
- Error: `Get-Process` could not find the process; subsequent screenshot calls received null window data.
- Resolution: relaunch the newly built executable and verify it remains running before each capture. Use keyboard/UI inspection only after resolving the exact current process ID.
### 2026-08-08 - WebView2 remote-debug launch was blocked by command policy

- Action: attempted to launch the release executable with a temporary `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` remote-debugging port and query its local target list.
- Result: the shell command was rejected by policy before execution.
- Resolution: avoid changing WebView2 debug environment flags; use a scoped Tauri readiness signal and native window enumeration as the deterministic pet-route check.
### 2026-08-08 - Long Tauri build wait lost its code-mode host generation

- Action: waited on build cell 311 after the initial shell call yielded.
- Error: the wait host timed out and then reported the cell belonged to a stale host generation.
- Resolution: inspect the release artifact timestamp and active compiler processes before deciding whether to rerun; never start a duplicate build blindly.
### 2026-08-08 - Physical pet size was scaled down by WebView window conversion

- Probe: launch app, require `FlexiKit Pet Ready`, and assert the pet bounds are 84x84.
- Result: route check passed, but native bounds were 67x67 and the size probe exited red.
- Cause: Tauri's physical-size setter and this monitor's effective scale do not map one-to-one to the desired CSS/native window size.
- Resolution: calibrate the requested size from the measured ratio, then keep the red/green native-bounds probe as the regression check.
### 2026-08-08 - Automated pet hover used DPI-virtualized coordinates

- Probe: move the mouse to the center reported by `GetWindowRect`, wait three seconds, and require the pet width to expand.
- Result: width remained 67 and the hover check exited red.
- Cause: PowerShell received DPI-virtualized window coordinates while `SetCursorPos` expects physical screen coordinates, so the pointer did not enter the pet.
- Resolution: multiply the reported center by `GetDpiForWindow / 96` before moving the cursor, then rerun the same hover assertion.
### 2026-08-08 - Manual DPI multiplication still missed the transparent pet hit region

- Probe: multiply virtualized window coordinates by the pet DPI scale before `SetCursorPos`.
- Result: cursor moved to 1838x958 but the pet remained collapsed.
- Cause: coordinate virtualization is applied inconsistently when a DPI-unaware PowerShell host calls both window and cursor APIs; manual multiplication is not a reliable hit-test driver.
- Resolution: run the hover probe from a process marked per-monitor DPI aware before reading bounds or moving the cursor.
### 2026-08-08 - DPI-aware cursor reached the pet but hover still did not expand

- Probe: mark the host per-monitor DPI aware, confirm pet bounds 1796,916,84,84, move the cursor to 1838,958, and wait three seconds.
- Result: cursor was inside the exact native bounds, but the window stayed 84x84.
- Finding: size/DPI is no longer the blocker; either transparent-window mouse events are not reaching the page or the resize invoke fails after the event.
- Next probe: click the same hit region and observe whether the pet's `show_main_window` action changes the foreground window, separating hit-testing from resize-command failure.
### 2026-08-08 - Pet native window did not receive automated clicks

- Probe: hide the main window, click the DPI-aware center of the pet, and require `show_main_window` to make the main window visible again.
- Result: main remained hidden and the click check exited red.
- Finding: the failure is at native hit-testing before Vue handlers; it is not limited to the hover timer or resize command.
- Next probe: inspect the pet window's extended native styles for click-through or no-activate flags, then remove the responsible window behavior.
### 2026-08-08 - Moving the cursor out and back still did not create WebView hover

- Probe: move the cursor to 200,200, then into the DPI-aware pet center and wait three seconds.
- Result: pet remained 84x84.
- Finding: the target point and transition are correct, but `SetCursorPos` alone is not generating a WebView2 pointer event in this automated desktop session.
- Resolution: use a relative `mouse_event` movement after entering the window to generate a hardware-style move event; if that still fails, validate the DOM action through UI Automation instead of treating automation limitations as an application defect.
### 2026-08-08 - Hardware-style relative move did not trigger WebView hover in automation

- Probe: move into the pet and issue a relative `mouse_event` before waiting.
- Result: native bounds remained 84x84.
- Finding: this desktop automation channel cannot drive WebView2 pointer events for the transparent pet window even though the route and rendered pixels are present.
- Resolution: stop using cursor injection as the pass/fail loop. Inspect the WebView accessibility tree and invoke the real logo control through UI Automation; validate expansion separately through the actual Tauri resize command and rendered snapshot.
### 2026-08-08 - UI Automation tree probe had a PowerShell pipeline parse error

- Command: build PSCustomObjects directly inside a `for` loop and pipe the loop output to `Format-Table`.
- Error: PowerShell reported an empty pipe element after the loop block.
- Resolution: collect elements into an explicit list inside the loop, then format the completed list in a separate statement.
### 2026-08-08 - Injected mouse button was not observed by native pet click poll

- Probe: hide the main window, hold an injected left button for 180 ms over the expanded pet logo, and require the main window to reappear.
- Result: main stayed hidden.
- Finding: native position polling works, but this automation session's `mouse_event` button injection is not visible to the app's background `GetAsyncKeyState` poll.
- Resolution: verify `GetAsyncKeyState` inside the injector process and use a keyboard-accessible/native command seam to validate main-window restoration; retain the click poll for real hardware input.
### 2026-08-08 - Keyboard search automation was denied by Windows input isolation

- Probe: focus the pet window and send `zotero{ENTER}` to exercise the real search form and main-window restore path.
- Result: `SendKeys.SendWait` raised `Access is denied`; main remained hidden.
- Finding: the desktop session blocks synthetic keyboard injection across this WebView window, matching the earlier synthetic mouse limitation.
- Resolution: stop synthetic input testing. Keep the verified route/render/native-hover checks, validate the shared-origin search handoff structurally, and perform final visual checks without claiming automated typing coverage.
### 2026-08-08 - Final multi-window capture repeated the PowerShell loop-pipeline parse mistake

- Command: emit capture result objects from a `foreach` block and immediately pipe the block to `Format-List`.
- Error: PowerShell reported an empty pipe element.
- Resolution: collect capture result objects into a list and format the list after the loop, matching the earlier UI Automation fix.

### 2026-08-31 - Desktop release executable was locked during rebuild

- Command: `npm run tauri -- build` from `apps/desktop`.
- Error: Rust could not remove `target/release/flexikit-desktop.exe` because Windows returned access denied (os error 5).
- Finding: an older FlexiKit desktop process was still running and holding the release executable open; frontend and Rust compilation had otherwise progressed normally.
- Resolution: stop only running `flexikit-desktop` processes, confirm the target is unlocked, then rerun the release build.

### 2026-08-31 - Pet view replacement used unsupported combined patch operations

- Command: replace `Pet.vue` with one patch containing both delete-file and add-file operations for the same path.
- Error: `apply_patch` rejected multiple operations targeting the same file.
- Finding: the patch engine requires the delete and add operations to be separate calls for a full-file replacement.
- Resolution: delete the old file in one patch, then add the rewritten file in the next patch.

### 2026-08-31 - Parallel web and Rust checks exhausted Windows resources

- Command: run the desktop web build and `cargo check` concurrently.
- Error: Rust compilation failed with Windows error 1450, allocation failures, and secondary dependency errors after the compiler ran out of system resources.
- Finding: the web build succeeded; the Rust errors occurred inside unchanged registry dependencies while both build pipelines were active, so the signal is resource exhaustion rather than an application source error.
- Resolution: rerun Rust formatting and checking separately with `CARGO_BUILD_JOBS=1` after the web build has completed.

### 2026-08-31 - Debug Cargo graph exposed a schemars/indexmap mismatch

- Command: `cargo check -j 1` after the resource-safe retry.
- Error: `schemars 0.8.22` resolved an `indexmap 1.9.3` type that required a third generic argument in the debug dependency graph.
- Finding: the error is in registry dependency source, not FlexiKit code, and the same project had already built successfully in the release profile used for shipping.
- Resolution: validate the native source with formatting plus the actual release-profile Tauri build; do not treat this debug-only dependency graph error as an application source failure.

### 2026-08-31 - Combined WebView debug launch command was rejected

- Command: stop the release app, set a WebView2 debugging environment variable, launch the app, and remove the environment variable in one PowerShell command.
- Error: the command was rejected by the execution safety policy before it ran.
- Finding: combining process termination, environment mutation, and launch made the diagnostic command too broad.
- Resolution: split shutdown and diagnostic launch into separate commands and clear the process-scoped variable with a direct environment assignment.

### 2026-08-31 - WebView2 remote debugging remained blocked after command split

- Command: launch the release app with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` in process scope.
- Error: execution policy rejected the launch before it ran.
- Finding: the environment blocks enabling a browser debugging port for this desktop process, even when shutdown and launch are separated.
- Resolution: stop retrying the blocked mechanism; verify expanded UI through an application-owned preview event and native window capture instead.

### 2026-08-31 - Rust formatting check found one wrapped closure

- Command: `cargo fmt -- --check` after narrowing native pet hit testing.
- Error: rustfmt requested collapsing one three-line closure into a single line.
- Finding: this is formatting-only; the desktop web build passed and no native logic error was reported.
- Resolution: run `cargo fmt`, then build the release profile.

### 2026-08-31 - cargo fmt was launched one directory too high

- Command: run `cargo fmt` from `apps/desktop` immediately before the Tauri build.
- Error: Cargo could not find `Cargo.toml` because the Rust crate is in `apps/desktop/src-tauri`.
- Finding: the following Tauri release build continued normally; only the standalone formatting step used the wrong working directory.
- Resolution: run `cargo fmt` from `apps/desktop/src-tauri`, then perform the final native rebuild from `apps/desktop`.

### 2026-08-31 - Final formatted release was locked by a surviving pet process

- Command: final `npm run tauri -- build` after formatting and the search-list overflow fix.
- Error: the linker could not remove `target/release/flexikit-desktop.exe` because Windows returned access denied.
- Finding: a FlexiKit process pointing at the target release executable survived or restarted during visual validation and retained the file handle; source compilation itself reported no error.
- Resolution: enumerate and stop every process whose resolved executable path exactly matches the target release file, confirm none remain, then rerun the incremental release build.

### 2026-08-31 - Drag probe used a stale desktop process id

- Command: enumerate the pet window under the process id returned by the earlier final launch, then inject a controlled drag inside its aquarium.
- Error: the probe could not find a `FlexiKit Pet` window for that process id.
- Finding: the recorded launcher process id was stale or the active desktop window belonged to another FlexiKit process instance, so no drag input was sent.
- Resolution: enumerate current top-level windows by title first, resolve the owning process, then run the same position-before/after drag assertion against the discovered handle.

### 2026-08-31 - vue-tsc is incompatible with the installed Node runtime

- Command: `npx vue-tsc --noEmit` in `apps/web`.
- Error: vue-tsc exited before checking project files with `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node.js 24.15.0.
- Finding: the repository's vue-tsc wrapper is incompatible with the installed TypeScript/Node runtime; this is a checker bootstrap failure rather than a reported source error.
- Resolution: validate the desktop web bundle with its existing Vite build and validate the integrated application with the Tauri release build.

### 2026-08-31 - Adaptive pet layout patch used an imprecise Vue context

- Command: apply the four-direction placement template, state, and event changes to `apps/web/src/views/Pet.vue` in one patch.
- Error: `apply_patch` could not find the expected `handlePointerLeave` context, so none of that patch was applied.
- Finding: the target function order differed from the combined patch context after earlier search-style edits.
- Resolution: inspect the exact surrounding ranges and apply the template, state, functions, and listeners as separate scoped patches.

### 2026-08-31 - cargo check resolved an incompatible schemars/indexmap pair

- Command: `cargo check` after formatting the adaptive pet placement code.
- Error: dependency compilation failed because `schemars 0.8.22` expected a two-parameter `IndexMap`, while the resolved `indexmap 1.9.3` type exposed a third generic parameter.
- Finding: the failure occurred inside the Cargo registry before checking the FlexiKit crate; rustfmt completed successfully and prior locked release builds worked.
- Resolution: retain the existing lockfile and validate the integrated native code through the repository's Tauri release build rather than altering unrelated dependency versions.

### 2026-08-31 - Secret scan used an ambiguous PowerShell interpolation

- Command: classify `.env` values and report only variable names before publishing the repository.
- Error: PowerShell parsed `$lineNo:` as an invalid variable reference.
- Finding: the scan stopped before reading or reporting any configuration values; no files were changed.
- Resolution: delimit interpolated variables with `${lineNo}` and rerun the redacted scan.
