# Skill: Hierarchical Skill Router (Token-Saver Engine)

## Description
作为主代理（Router）的隐式核心技能。当用户发起任何请求时，本技能首先对用户意图进行分类，只把对应分类的 1 个子技能解冻并注入上下文，其余不相关的技能描述立刻从 Context 中卸载。

## Core Routing Logic
1. **语义分类（Semantic Gateway）：**
   - 检查用户请求的路径或关键词。
   - 若包含 `frontend/` 或 "页面/UI/组件" ➔ **仅挂载 `vue3-design-system.md`**，立刻卸载所有后端和数据库技能。
   - 若包含 `backend/` 或 "数据库/pgvector/Redis" ➔ **仅挂载后端相关技能**，卸载所有 UI 样式技能。
2. **动态修剪 System Prompt：**
   - 每次对话轮次更替时，自动评估前序对话的上下文。如果已经从前端开发转向了后端 Debug，立刻将前端的整个设计规范（Design Tokens）从短期记忆中抹除，释放 Token 空间。