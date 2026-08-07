# Skill: Progressive Knowledge Summarizer

## Description
当用户扔给你一长篇长文、技术文档、长视频导出的字幕，并要求“总结”、“提取精华”或“记笔记”时触发。本技能打破传统的“单层摘要”，采用多层级渐进提炼，帮助用户快速内化知识体系。

## Strict Triggers
- "总结一下这篇长文"
- "提取里面的核心知识点"
- "把这个文档做成思维导图/笔记"

## Core Implementation Rules
输出必须严格包含以下**三层渐进结构**，层层递进：

1. **Layer 1: 骨架提取（The Skeleton - 15% 长度）：** 用 3-5 个核心要点（Bullet Points），勾勒出文章最核心的、不看就会死的核心结论。
2. **Layer 2: 黄金金句（The Golden Nuggets）：** 必须原文摘录或精简出 2-3 句最具有启发性、颠覆认知的话或核心架构公式。
3. **Layer 3: 行动指南（Actionable Next Steps）：** 强行将理论转化为具体的、明天就能去做的 2 个实际行动。不要空洞的口号，要具体的动作。

## Output Template Example
> **用户输入：** （输入了一长篇关于如何优化 NestJS 性能的文章）
> **技能命中输出：**
> ### 🧠 渐进式知识内化笔记
> 
> **📍 一句话骨架：**
> * 针对高频查询接口，NestJS v10 必须使用毫秒级纯数字设置 Redis TTL，并配合命名空间规范防止混淆。
> 
> **✨ 黄金金句：**
> * “高并发下不加防穿透保护的缓存，只是一层纸糊的盾牌。”
> 
> **🚀 即可执行的行动项：**
> 1. 打开你现有的 `tools.service.ts`，检查所有的 `cacheManager.set` 传参，确保没有误用旧版的对象格式。
> 2. 为你的 Redis Key 统一加上 `flexikit:` 前缀命名空间。