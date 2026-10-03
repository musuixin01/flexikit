import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { Tool } from '../tools/tool.entity';
import { EMBEDDING_FETCH, EmbeddingService } from './embedding.service';
import { ToolEmbeddingPipelineService } from './tool-embedding-pipeline.service';
import { ToolVectorSearchService } from './tool-vector-search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tool]), AiModule],
  providers: [
    {
      provide: EMBEDDING_FETCH,
      useValue: fetch,
    },
    EmbeddingService,
    ToolEmbeddingPipelineService,
    ToolVectorSearchService,
  ],
  exports: [
    EmbeddingService,
    ToolEmbeddingPipelineService,
    ToolVectorSearchService,
  ],
})
export class EmbeddingModule {}
