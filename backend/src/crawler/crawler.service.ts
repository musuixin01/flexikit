import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService } from '../discovery/discovery.service';

export interface CrawledTool {
  name: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  source: string;
  source_url: string;
  hot_score?: number;
  upvotes?: number;
  comments?: number;
  discovered_at?: Date;
}

@Injectable()
export class CrawlerService {
  protected readonly logger = new Logger(CrawlerService.name);

  constructor(
    protected readonly discoveryService: DiscoveryService,
  ) {}

  /**
   * 执行爬虫
   */
  async crawl(): Promise<number> {
    throw new Error('Method not implemented');
  }

  /**
   * 保存抓取到的工具（自动去重）
   */
  protected async saveTools(tools: CrawledTool[]): Promise<number> {
    let count = 0;
    for (const tool of tools) {
      try {
        const saved = await this.discoveryService.addTool(tool as any);
        if (saved) {
          count++;
        }
      } catch (e) {
        this.logger.warn(`保存工具失败: ${tool.name}`, e);
      }
    }
    this.logger.log(`成功保存 ${count}/${tools.length} 个工具`);
    return count;
  }
}
