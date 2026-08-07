# Skill: TypeORM + pgvector Vector Sync & Search

## Description
当用户需要在 FlexiKit 后端处理向量数据库、配置 `embedding` 模块、编写向量相似度检索（如工具智能推荐、标签发现）、或者修改有关 `pgvector` 的 PostgreSQL 16 实体类（Entity）时触发。该技能严防大模型误写传统 SQL 或不兼容的向量计算语法。

## Strict Triggers
- "修改 embedding 模块"
- "用 pgvector 做相似度检索/向量搜索"
- "帮我写一段向量查询代码"
- "在 tool entity 里加上向量/embedding 字段"

## Core Implementation Rules
1. **Entity 向量定义规范：**
   - 在 TypeORM 实体中，向量字段必须显式声明为 `columnToken: 'vector'` 或者是底层的原生自定义类型，并指定维度（例如：使用 OpenAI 或 DeepSeek embedding 时通常为 1536 维，使用本地轻量模型可能为 384 或 768 维）。
   - 字段类型在 TypeScript 中声明为 `number[]`。
2. **高命中率 Raw SQL/QueryBuilder 检索公式：**
   - 在进行向量相似度匹配时，必须使用 `pgvector` 的专属余弦距离操作符 `<=>`。
   - 必须通过 `createQueryBuilder` 配合 `.orderBy('tool.embedding <=> :vector', 'ASC')` 进行排序，余弦距离越小说明越相似。
   - 严禁让模型使用传统的 `INNER JOIN` 或循环计算处理向量相似度。

## Negative Constraints (绝对禁止)
- **严禁**使用 JavaScript/TypeScript 数组在内存中进行 `for` 循环比对相似度。
- **严禁**在未使用 `pgvector` 扩展的情况下，直接对 `text` 字段进行模糊匹配来替代向量搜索。

## Output Template Example
```typescript
// 正确的 pgvector 检索 QueryBuilder 命中模版
const vectorString = `[${queryVector.join(',')}]`;
return await this.toolRepository
  .createQueryBuilder('tool')
  .orderBy('tool.embedding <=> :vector', 'ASC')
  .setParameter('vector', vectorString)
  .limit(limit)
  .getMany();