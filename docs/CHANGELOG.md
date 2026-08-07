# 更新日志

本文档记录 FlexiKit 所有重要版本的变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 安全修复
- 🔒 修复前端明文存储用户密码的严重安全问题
- 🔒 修复 `openTool` 和 `getLocalIcon` 方法的命令注入风险
- 🔒 增加 SSRF 防护，禁止 fecth 和爬虫访问内网 IP
- 🔒 bcrypt salt rounds 从 10 提升到 12
- 🔒 增加文件路径白名单校验

### 新增
- ✨ 项目文档体系（README、部署指南、安全说明、贡献指南）
- ✨ 统一 HTTP 客户端服务，消除代码重复
- ✨ 爬虫并发控制和重试机制
- ✨ 数据库索引优化
- ✨ 统一日志系统

### 修复
- 🐛 修复 V2EX 爬虫使用 Math.random() 导致热度随机变化的问题
- 🐛 修复排行榜时间筛选使用工具创建时间而非访问时间的问题
- 🐛 修复 require 与 import 混用问题
- 🐛 修复 console 与 Logger 不统一问题

### 性能
- ⚡ 为常用查询字段添加数据库索引
- ⚡ 爬虫增加请求间隔和频率限制
- ⚡ 前端路由懒加载

## [1.0.0] - 2026-06-26

### 新增
- 🎉 初始版本发布
- ✨ 用户认证系统（注册、登录、资料编辑、头像）
- ✨ 工具管理（增删改查、分类、搜索、收藏、排序）
- ✨ 本地工具支持（打开exe、自动提取图标）
- ✨ 发现页多平台爬虫（V2EX、小众软件、异次元、Product Hunt、掘金、少数派、反斗软件、爱范儿、36氪、开源中国）
- ✨ 智能标签推荐功能
- ✨ 毛玻璃 UI 设计，支持亮/暗主题
- ✨ 完整的移动端响应式适配
- ✨ favicon 多源 fallback 机制
- ✨ 工具卡片详细面板
- ✨ 网页工具/本地工具筛选
- ✨ 离线数据缓存
- ✨ Docker Compose 一键启动数据库

### 技术栈
- 前端：Vue 3.4 + TypeScript + Pinia + Vite 5
- 后端：NestJS 10 + TypeORM + PostgreSQL 16 + Redis 7
- 数据库：pgvector 向量扩展支持
