import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AiTokenUsage } from '../ai/contracts/ai-provider';
import { AiUsageService } from '../ai/ai-usage.service';
import { Tool } from '../tools/tool.entity';
import { EmbeddingService } from './embedding.service';
import {
  buildCanonicalToolEmbeddingSource,
  TOOL_EMBEDDING_DIMENSIONS,
  TOOL_EMBEDDING_MAX_BATCH_SIZE,
  TOOL_EMBEDDING_MODEL,
  TOOL_EMBEDDING_PROVIDER,
  TOOL_EMBEDDING_SOURCE_VERSION,
} from './tool-embedding-source';

const DEFAULT_SYNC_LIMIT = 100;
const MAX_SYNC_LIMIT = 500;
const MAX_SCAN_COUNT = 5_000;

export interface ToolEmbeddingSyncOptions {
  limit?: number;
}

export interface ToolEmbeddingSyncResult {
  scanned: number;
  stale: number;
  updated: number;
  skippedChanged: number;
  batches: number;
  promptTokens: number;
}

interface PendingToolEmbedding {
  tool: Tool;
  sourceText: string;
  sourceHash: string;
}

function boundedSyncLimit(candidate: number | undefined): number {
  if (!Number.isInteger(candidate) || (candidate ?? 0) < 1) {
    return DEFAULT_SYNC_LIMIT;
  }
  return Math.min(candidate as number, MAX_SYNC_LIMIT);
}

function embeddingUsage(promptTokens: number): AiTokenUsage {
  return {
    inputTokens: promptTokens,
    outputTokens: 0,
    totalTokens: promptTokens,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: 0,
  };
}

function vectorLiteral(vector: readonly number[]): string {
  return `[${vector.join(',')}]`;
}

@Injectable()
export class ToolEmbeddingPipelineService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolsRepository: Repository<Tool>,
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async syncStaleTools(
    options: Readonly<ToolEmbeddingSyncOptions> = {},
  ): Promise<ToolEmbeddingSyncResult> {
    const limit = boundedSyncLimit(options.limit);
    const pending = await this.findStalePublicTools(limit);
    const result: ToolEmbeddingSyncResult = {
      scanned: pending.scanned,
      stale: pending.items.length,
      updated: 0,
      skippedChanged: 0,
      batches: 0,
      promptTokens: 0,
    };

    for (
      let offset = 0;
      offset < pending.items.length;
      offset += TOOL_EMBEDDING_MAX_BATCH_SIZE
    ) {
      const batch = pending.items.slice(
        offset,
        offset + TOOL_EMBEDDING_MAX_BATCH_SIZE,
      );
      const embedded = await this.embeddingService.generateBatch(
        batch.map((item) => item.sourceText),
      );
      result.batches += 1;
      result.promptTokens += embedded.promptTokens;

      await this.aiUsageService.record({
        providerId: embedded.providerId,
        modelId: embedded.modelId,
        billingMode: 'platform',
        usage: embeddingUsage(embedded.promptTokens),
      });

      for (let index = 0; index < batch.length; index += 1) {
        const stored = await this.persistIfSourceUnchanged(
          batch[index],
          embedded.vectors[index],
        );
        if (stored) result.updated += 1;
        else result.skippedChanged += 1;
      }
    }

    return result;
  }

  private async findStalePublicTools(
    updateLimit: number,
  ): Promise<{ items: PendingToolEmbedding[]; scanned: number }> {
    const items: PendingToolEmbedding[] = [];
    let scanned = 0;
    let cursorId = 0;

    while (items.length < updateLimit && scanned < MAX_SCAN_COUNT) {
      const pageSize = Math.min(250, MAX_SCAN_COUNT - scanned);
      const tools = await this.toolsRepository
        .createQueryBuilder('tool')
        .addSelect('tool.embeddingProvider')
        .addSelect('tool.embeddingModel')
        .addSelect('tool.embeddingDimensions')
        .addSelect('tool.embeddingSourceVersion')
        .addSelect('tool.embeddingSourceHash')
        .where('tool.user_id IS NULL')
        .andWhere('tool.id > :cursorId', { cursorId })
        .orderBy('tool.id', 'ASC')
        .take(pageSize)
        .getMany();

      if (tools.length === 0) break;
      scanned += tools.length;
      cursorId = tools[tools.length - 1].id;

      for (const tool of tools) {
        const source = buildCanonicalToolEmbeddingSource({
          name: tool.name,
          description: tool.description,
          tags: tool.tags,
          category: tool.category,
          url: tool.url,
          isLocal: Boolean(tool.local_path),
        });
        if (!this.isStale(tool, source.hash)) continue;
        items.push({
          tool,
          sourceText: source.text,
          sourceHash: source.hash,
        });
        if (items.length >= updateLimit) break;
      }

      if (tools.length < pageSize) break;
    }

    return { items, scanned };
  }

  private isStale(tool: Tool, sourceHash: string): boolean {
    return (
      tool.embeddingProvider !== TOOL_EMBEDDING_PROVIDER
      || tool.embeddingModel !== TOOL_EMBEDDING_MODEL
      || tool.embeddingDimensions !== TOOL_EMBEDDING_DIMENSIONS
      || tool.embeddingSourceVersion !== TOOL_EMBEDDING_SOURCE_VERSION
      || tool.embeddingSourceHash !== sourceHash
    );
  }

  private async persistIfSourceUnchanged(
    pending: Readonly<PendingToolEmbedding>,
    vector: readonly number[],
  ): Promise<boolean> {
    if (
      vector.length !== TOOL_EMBEDDING_DIMENSIONS
      || !vector.every((value) => Number.isFinite(value))
    ) {
      return false;
    }

    return this.dataSource.transaction(async (manager) => {
      const current = await manager.getRepository(Tool).findOne({
        where: { id: pending.tool.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current || current.user_id !== null) return false;

      const currentSource = buildCanonicalToolEmbeddingSource({
        name: current.name,
        description: current.description,
        tags: current.tags,
        category: current.category,
        url: current.url,
        isLocal: Boolean(current.local_path),
      });
      if (currentSource.hash !== pending.sourceHash) return false;

      await manager.query(
        `UPDATE "tools"
         SET "embedding" = $1::vector,
             "embedding_provider" = $2,
             "embedding_model" = $3,
             "embedding_dimensions" = $4,
             "embedding_source_version" = $5,
             "embedding_source_hash" = $6,
             "embedding_updated_at" = $7
         WHERE "id" = $8`,
        [
          vectorLiteral(vector),
          TOOL_EMBEDDING_PROVIDER,
          TOOL_EMBEDDING_MODEL,
          TOOL_EMBEDDING_DIMENSIONS,
          TOOL_EMBEDDING_SOURCE_VERSION,
          pending.sourceHash,
          new Date(),
          pending.tool.id,
        ],
      );
      return true;
    });
  }
}
