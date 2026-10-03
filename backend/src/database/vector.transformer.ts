import { ValueTransformer } from 'typeorm';

/**
 * pgvector 类型转换器
 * 用于在 TypeORM 中正确处理 vector 类型的读写
 */
export const VectorTransformer: ValueTransformer = {
  to(value: number[] | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return `[${value.join(',')}]`;
  },

  from(value: unknown): number[] | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      // 移除方括号并解析
      const str = value.replace(/[\[\]]/g, '');
      if (!str) return [];
      const vector = str.split(',').map(Number);
      if (vector.every((item) => Number.isFinite(item))) return vector;
    }
    if (
      Array.isArray(value)
      && value.every(
        (item): item is number => typeof item === 'number' && Number.isFinite(item),
      )
    ) {
      return value;
    }
    throw new Error('Invalid pgvector value');
  },
};
