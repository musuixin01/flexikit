import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  // 暂不实现，后续集成 OpenAI 或本地模型
  async generateEmbedding(text: string): Promise<number[]> {
    // 返回模拟向量（1536维）
    return Array(1536).fill(0);
  }
}