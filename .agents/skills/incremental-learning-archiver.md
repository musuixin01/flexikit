# Skill: Incremental Learning & Chat History Compressor

## Description
当单次会话（Session）的对话轮次超过 5 轮，或者估算当前 Context 消耗超过 4k Tokens 时自动激活。本技能负责把过去冗长的讨论细节压缩成结构化的“记忆元数据”，然后清空并替换掉旧的对话历史。

## Core Execution Rules
1. **提取记忆快照（Generate Memory Snapshot）：**
   - 自动将前几轮讨论出的核心结论、代码定稿、或用户学到的知识点提炼为极其紧凑的 JSON 格式或几行 KV 键值对。
2. **重置上下文（Context Reset）：**
   - 带着这个极简的“记忆快照”重新开启下一个干净的对话回合，从而把历史长对话积累的 Token 消耗直接降低 80% 以上。

## Output Template Example
> **触发压缩时的隐藏处理动作：**
> “【系统提示：为了帮你节省 Token 消耗，我已经将前面的讨论压缩为以下记忆快照，并清理了历史冗余对话】
> 
> **🧠 当前项目记忆快照：**
> - **当前任务**：正在为 FlexiKit 编写 Redis 缓存控制层
> - **技术规范**：NestJS 10 (TTL使用毫秒纯数字), 键名带 `flexikit:` 前缀
> - **已完成代码**：`tools.service.ts` 的基础查询已加缓存
> 
> 我们可以基于这个进度继续聊，请问接下来要加上缓存主动失效（Eviction）功能吗？”