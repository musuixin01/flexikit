# 2026-08-07

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
