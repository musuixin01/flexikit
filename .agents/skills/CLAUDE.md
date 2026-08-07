# FlexiKit 项目开发记忆锚点

## 技术架构规范
- 前端：Vue 3.4 + Pinia + Tailwind CSS (毛玻璃设计语言)。
- 后端：NestJS 10 + TypeORM + PostgreSQL 16 (pgvector) + Redis 7。
- 核心逻辑：工具管理、多平台爬虫发现、本地 EXE 调用。

## 技能与编码准则
- 所有代码编写必须严格调用 `.agents/skills/` 下的 `.md` 技能文件。
- 遵循“增量修改”原则，优先输出 Diff 格式。
- 后端响应必须封装在统一的 JSON 信封内，严禁泄露底层异常。