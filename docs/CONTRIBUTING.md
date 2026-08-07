# 贡献指南

感谢你对 FlexiKit 的兴趣！我们欢迎任何形式的贡献。

## 行为准则

参与本项目即表示你同意遵守我们的行为准则：
- 尊重他人，保持友善和专业
- 接受建设性的批评
- 关注社区的共同利益
- 禁止任何形式的骚扰和歧视

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请通过 Issue 报告，并包含以下信息：

1. **Bug 描述**：清晰简洁地描述问题
2. **复现步骤**：详细的复现步骤
   1. 打开 '...'
   2. 点击 '....'
   3. 滚动到 '....'
   4. 看到错误
3. **预期行为**：描述你期望发生的事情
4. **截图**：如果可能，添加截图帮助说明问题
5. **环境信息**：
   - 操作系统
   - 浏览器版本
   - Node.js 版本
   - 项目版本/commit hash

### 提出新功能

我们欢迎新功能建议！请在 Issue 中说明：

1. **功能描述**：你想要什么功能
2. **使用场景**：这个功能解决什么问题
3. **实现思路**：如果你有想法，可以简单描述
4. **替代方案**：你考虑过的其他解决方案

### 提交 Pull Request

1. **Fork 本仓库**
2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或修复bug
   git checkout -b fix/bug-description
   ```
3. **开发**
   - 遵循现有代码风格
   - 提交前运行 lint 和测试
   - 提交信息清晰明了
4. **提交规范**
   ```
   <type>(<scope>): <subject>

   <body>
   ```
   Type 类型：
   - feat: 新功能
   - fix: 修复bug
   - docs: 文档更新
   - style: 代码格式（不影响代码运行）
   - refactor: 重构（既不是新增功能，也不是修改bug）
   - perf: 性能优化
   - test: 测试相关
   - chore: 构建过程或辅助工具的变动
5. **推送到你的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **创建 Pull Request**
   - 清晰描述 PR 的内容
   - 关联相关的 Issue
   - 附上截图（如果是UI相关改动）

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 缩进使用 2 个空格
- 使用分号结尾
- 字符串使用单引号
- 命名规范：
  - 组件/类：PascalCase（如 `ToolCard`、`ToolsService`）
  - 函数/变量：camelCase（如 `getTools`、`isLoaded`）
  - 常量：UPPER_SNAKE_CASE（如 `DEFAULT_ICON`）
  - 文件名：kebab-case（如 `tool-card.vue`、`tools.service.ts`）

### 后端规范（NestJS）

1. **模块结构**：每个功能模块一个目录，包含
   - `*.module.ts`：模块定义
   - `*.controller.ts`：控制器
   - `*.service.ts`：服务
   - `*.entity.ts`：实体
   - `dto/`：数据传输对象
2. **依赖注入**：使用构造函数注入
3. **错误处理**：使用 NestJS 内置的 HttpException
4. **验证**：所有请求参数使用 DTO + class-validator 验证
5. **日志**：使用 NestJS Logger，不要用 console

### 前端规范（Vue3）

1. **组件风格**：使用 Composition API + `<script setup lang="ts">`
2. **状态管理**：使用 Pinia，按功能划分 store
3. **API 调用**：统一在 `api/` 目录封装，不要在组件中直接调用 axios
4. **样式**：使用 CSS 变量，支持主题切换
5. **响应式**：所有页面必须适配移动端

### Git 提交规范

```
feat(tools): 添加工具批量删除功能

- 支持多选工具批量删除
- 添加删除确认对话框
- 优化删除后的刷新逻辑

Closes #123
```

## 开发环境设置

1. 安装依赖：
   ```bash
   # 后端
   cd backend && npm install
   
   # 前端
   cd frontend && npm install
   ```

2. 启动数据库：
   ```bash
   cd docker && docker-compose up -d
   ```

3. 启动开发服务：
   ```bash
   # 后端（端口3000）
   cd backend && npm run start:dev
   
   # 前端（端口5173）
   cd frontend && npm run dev
   ```

## 测试

提交 PR 前请确保：
- [ ] 代码可以正常构建（`npm run build`）
- [ ] 没有 TypeScript 类型错误
- [ ] 没有 lint 错误
- [ ] 核心功能正常工作
- [ ] 新功能有对应的测试（如果适用）

## 文档

如果你的改动影响了使用方式，请更新相应的文档：
- README.md：新增功能说明
- docs/：相关文档更新
- 代码注释：复杂逻辑添加注释

## 发布流程（维护者）

1. 更新 CHANGELOG.md
2. 更新版本号（package.json）
3. 创建 tag
4. 发布 Release

---

再次感谢你的贡献！🎉
