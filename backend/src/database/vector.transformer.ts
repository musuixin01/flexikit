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

  from(value: string | null | undefined): number[] | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      // 移除方括号并解析
      const str = value.replace(/[\[\]]/g, '');
      if (!str) return [];
      return str.split(',').map(Number);
    }
    return value as any;
  },
};
