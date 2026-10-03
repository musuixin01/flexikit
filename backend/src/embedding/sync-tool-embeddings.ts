import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { AiUsageEvent } from '../ai/ai-usage-event.entity';
import { AiUsageService } from '../ai/ai-usage.service';
import dataSource from '../database/data-source';
import { Tool } from '../tools/tool.entity';
import {
  EmbeddingService,
  type EmbeddingFetch,
} from './embedding.service';
import { ToolEmbeddingPipelineService } from './tool-embedding-pipeline.service';

function requestedLimit(): number | undefined {
  const raw = process.env.EMBEDDING_SYNC_LIMIT?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : undefined;
}

async function main(): Promise<void> {
  const configService = new ConfigService();
  await dataSource.initialize();

  try {
    const fetchImpl: EmbeddingFetch = fetch;
    const embeddingService = new EmbeddingService(configService, fetchImpl);
    const usageService = new AiUsageService(
      dataSource.getRepository(AiUsageEvent),
    );
    const pipeline = new ToolEmbeddingPipelineService(
      dataSource.getRepository(Tool),
      dataSource,
      embeddingService,
      usageService,
    );
    const result = await pipeline.syncStaleTools({
      limit: requestedLimit(),
    });
    process.stdout.write(JSON.stringify(result) + '\n');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : 'Embedding sync failed';
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
