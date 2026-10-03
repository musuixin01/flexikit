import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Tool } from '../tools/tool.entity';
import {
  TOOL_EMBEDDING_DIMENSIONS,
  TOOL_EMBEDDING_MODEL,
  TOOL_EMBEDDING_PROVIDER,
  TOOL_EMBEDDING_SOURCE_VERSION,
} from './tool-embedding-source';

const DEFAULT_VECTOR_SEARCH_LIMIT = 12;
const MAX_VECTOR_SEARCH_LIMIT = 50;
const MAX_EXCLUDED_TOOL_IDS = 100;
const MAX_VECTOR_COMPONENT_ABS = 1_000_000;

export interface ToolVectorSearchOptions {
  limit?: number;
  excludeToolIds?: readonly number[];
}

export interface ToolVectorSearchMatch {
  tool: Tool;
  cosineDistance: number;
  cosineSimilarity: number;
}

interface VectorSearchRawRow {
  vector_distance: string | number;
  vector_similarity: string | number;
}

function boundedLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_VECTOR_SEARCH_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_VECTOR_SEARCH_LIMIT) {
    throw new Error('Vector search limit is outside the supported range');
  }
  return value;
}

function vectorLiteral(vector: readonly number[]): string {
  if (
    vector.length !== TOOL_EMBEDDING_DIMENSIONS
    || !vector.every(
      (value) => (
        Number.isFinite(value)
        && Math.abs(value) <= MAX_VECTOR_COMPONENT_ABS
      ),
    )
  ) {
    throw new Error('Vector search input is invalid');
  }
  return `[${vector.join(',')}]`;
}

function normalizedExcludedToolIds(
  toolIds: readonly number[] | undefined,
): number[] {
  if (!toolIds || toolIds.length === 0) return [];
  if (toolIds.length > MAX_EXCLUDED_TOOL_IDS) {
    throw new Error('Too many excluded Tool ids');
  }
  if (
    !toolIds.every(
      (toolId) => Number.isSafeInteger(toolId) && toolId > 0,
    )
  ) {
    throw new Error('Excluded Tool ids are invalid');
  }
  return [...new Set(toolIds)];
}

function rawMetric(value: string | number, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid pgvector ${label}`);
  }
  return parsed;
}

@Injectable()
export class ToolVectorSearchService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolsRepository: Repository<Tool>,
  ) {}

  async searchPublicTools(
    queryVector: readonly number[],
    options: Readonly<ToolVectorSearchOptions> = {},
  ): Promise<ToolVectorSearchMatch[]> {
    const limit = boundedLimit(options.limit);
    const excludeToolIds = normalizedExcludedToolIds(options.excludeToolIds);
    const queryVectorLiteral = vectorLiteral(queryVector);
    const distanceExpression = (
      'tool.embedding <=> CAST(:queryVector AS vector)'
    );

    const query = this.toolsRepository
      .createQueryBuilder('tool')
      .addSelect(distanceExpression, 'vector_distance')
      .addSelect(`1 - (${distanceExpression})`, 'vector_similarity')
      .where('tool.user_id IS NULL')
      .andWhere('tool.embedding IS NOT NULL')
      .andWhere('tool.embeddingProvider = :embeddingProvider')
      .andWhere('tool.embeddingModel = :embeddingModel')
      .andWhere('tool.embeddingDimensions = :embeddingDimensions')
      .andWhere('tool.embeddingSourceVersion = :embeddingSourceVersion')
      .andWhere('tool.embeddingSourceHash IS NOT NULL')
      .andWhere('tool.embeddingUpdatedAt IS NOT NULL')
      .andWhere('tool.embeddingUpdatedAt >= tool.updated_at')
      .orderBy(distanceExpression, 'ASC')
      .addOrderBy('tool.id', 'ASC')
      .setParameters({
        queryVector: queryVectorLiteral,
        embeddingProvider: TOOL_EMBEDDING_PROVIDER,
        embeddingModel: TOOL_EMBEDDING_MODEL,
        embeddingDimensions: TOOL_EMBEDDING_DIMENSIONS,
        embeddingSourceVersion: TOOL_EMBEDDING_SOURCE_VERSION,
      })
      .take(limit);

    if (excludeToolIds.length > 0) {
      query.andWhere('tool.id NOT IN (:...excludeToolIds)', {
        excludeToolIds,
      });
    }

    return this.readMatches(query);
  }

  async searchPublicToolsSimilarToTool(
    sourceToolId: number,
    options: Readonly<ToolVectorSearchOptions> = {},
  ): Promise<ToolVectorSearchMatch[]> {
    if (!Number.isSafeInteger(sourceToolId) || sourceToolId < 1) {
      throw new Error('Source Tool id is invalid');
    }

    const limit = boundedLimit(options.limit);
    const excludeToolIds = normalizedExcludedToolIds(options.excludeToolIds);
    const distanceExpression = 'tool.embedding <=> source.embedding';
    const currentSourcePredicate = [
      'source.id = :sourceToolId',
      'source.user_id IS NULL',
      'source.embedding IS NOT NULL',
      'source.embeddingProvider = :embeddingProvider',
      'source.embeddingModel = :embeddingModel',
      'source.embeddingDimensions = :embeddingDimensions',
      'source.embeddingSourceVersion = :embeddingSourceVersion',
      'source.embeddingSourceHash IS NOT NULL',
      'source.embeddingUpdatedAt IS NOT NULL',
      'source.embeddingUpdatedAt >= source.updated_at',
    ].join(' AND ');

    const query = this.toolsRepository
      .createQueryBuilder('tool')
      .innerJoin(Tool, 'source', currentSourcePredicate)
      .addSelect(distanceExpression, 'vector_distance')
      .addSelect(`1 - (${distanceExpression})`, 'vector_similarity')
      .where('tool.user_id IS NULL')
      .andWhere('tool.embedding IS NOT NULL')
      .andWhere('tool.embeddingProvider = :embeddingProvider')
      .andWhere('tool.embeddingModel = :embeddingModel')
      .andWhere('tool.embeddingDimensions = :embeddingDimensions')
      .andWhere('tool.embeddingSourceVersion = :embeddingSourceVersion')
      .andWhere('tool.embeddingSourceHash IS NOT NULL')
      .andWhere('tool.embeddingUpdatedAt IS NOT NULL')
      .andWhere('tool.embeddingUpdatedAt >= tool.updated_at')
      .andWhere('tool.id <> source.id')
      .orderBy(distanceExpression, 'ASC')
      .addOrderBy('tool.id', 'ASC')
      .setParameters({
        sourceToolId,
        embeddingProvider: TOOL_EMBEDDING_PROVIDER,
        embeddingModel: TOOL_EMBEDDING_MODEL,
        embeddingDimensions: TOOL_EMBEDDING_DIMENSIONS,
        embeddingSourceVersion: TOOL_EMBEDDING_SOURCE_VERSION,
      })
      .take(limit);

    if (excludeToolIds.length > 0) {
      query.andWhere('tool.id NOT IN (:...excludeToolIds)', {
        excludeToolIds,
      });
    }

    return this.readMatches(query);
  }

  private async readMatches(
    query: SelectQueryBuilder<Tool>,
  ): Promise<ToolVectorSearchMatch[]> {
    const result = await query.getRawAndEntities<VectorSearchRawRow>();
    if (result.entities.length !== result.raw.length) {
      throw new Error('pgvector search returned inconsistent result metadata');
    }

    return result.entities.map((tool, index) => ({
      tool,
      cosineDistance: rawMetric(
        result.raw[index].vector_distance,
        'cosine distance',
      ),
      cosineSimilarity: rawMetric(
        result.raw[index].vector_similarity,
        'cosine similarity',
      ),
    }));
  }
}
