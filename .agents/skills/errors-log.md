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
