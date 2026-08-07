# Skill: FlexiKit API Layer & Request Binder

## Description
当用户要求“让前端对接后端接口”、“编写 Axios 请求”、“处理前端加载状态（Loading）或错误提示（Toast）”时触发。此技能隔离网络请求细节，强迫 Codex 遵循 FlexiKit 的前端面向接口开发规范[cite: 1]。

## Strict Triggers
- "让前端调一下后端的...接口"
- "写一个前端的 axios 请求"
- "前端怎么获取数据并展示"
- "给这个页面加上数据对接"

## Core Implementation Rules
1. **禁止组件内裸写 Axios：**
   - 严禁在 Vue 组件（`*.vue`）中直接导入 `axios` 或拼写完整的 URL 路径。
   - 所有请求必须在 `frontend/src/api/` 目录下创建对应的模块（如 `tool.ts`, `user.ts`）进行函数式封装[cite: 1]。
2. **统一使用实例（Instance）：**
   - 必须使用项目中已经封装好的封装实例（通常是自定义的 `request` 或 `apiClient`），以便自动带上 JWT 认证 Header 并统一拦截 401/403/500 错误[cite: 1]。
3. **响应式状态联动：**
   - 异步接口调用必须配合 Vue 的 `try-catch-finally` 结构，在 `finally` 块中务必关闭 `loading.value = false`，保证极端情况下页面不会无限卡死。

## Output Template Example
```typescript
// frontend/src/api/tool.ts
import request from './request'; // 你的统一 Axios 实例包装
import type { ToolItem, CreateToolDto } from '@/types';

export const toolApi = {
  // 获取工具列表
  getTools: () => request.get<ToolItem[]>('/tools'),
  
  // 创建新工具
  createTool: (data: CreateToolDto) => request.post<ToolItem>('/tools', data)
};