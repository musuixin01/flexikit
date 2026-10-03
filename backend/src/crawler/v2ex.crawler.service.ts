import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService, CrawledTool } from './crawler.service';
import { DiscoveryService } from '../discovery/discovery.service';
import * as https from 'https';

interface V2exTopic {
  id: number | string;
  title: string;
  url?: string;
  content?: string;
  replies?: number;
  stars?: number;
  created?: number;
  node?: {
    stars?: number;
  };
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isV2exTopic(value: unknown): value is V2exTopic {
  if (!value || typeof value !== 'object') return false;
  const topic = value as Record<string, unknown>;
  const id = topic.id;
  if (typeof topic.title !== 'string' || (typeof id !== 'number' && typeof id !== 'string')) {
    return false;
  }
  if (topic.url !== undefined && typeof topic.url !== 'string') return false;
  if (topic.content !== undefined && typeof topic.content !== 'string') return false;
  if (!isOptionalNumber(topic.replies) || !isOptionalNumber(topic.stars) || !isOptionalNumber(topic.created)) {
    return false;
  }
  if (topic.node !== undefined) {
    if (!topic.node || typeof topic.node !== 'object') return false;
    const node = topic.node as Record<string, unknown>;
    if (!isOptionalNumber(node.stars)) return false;
  }
  return true;
}

@Injectable()
export class V2exCrawlerService extends CrawlerService {
  private readonly baseUrl = 'https://www.v2ex.com';
  private readonly nodeName = 'create'; // 分享创造节点

  constructor(discoveryService: DiscoveryService) {
    super(discoveryService);
  }

  /**
   * 定时任务：每 6 小时抓取一次
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleCron() {
    this.logger.log('定时任务：开始抓取 V2EX 分享创造节点');
    await this.crawl();
  }

  /**
   * 执行 V2EX 爬虫
   */
  async crawl(): Promise<number> {
    this.logger.log('开始抓取 V2EX 分享创造节点...');
    
    try {
      const topics = await this.fetchLatestTopics();
      const tools = this.extractToolsFromTopics(topics);
      const count = await this.saveTools(tools);
      
      this.logger.log(`V2EX 抓取完成，新增 ${count} 个工具`);
      return count;
    } catch (e) {
      this.logger.error('V2EX 抓取失败', e);
      return 0;
    }
  }

  /**
   * 获取最新主题
   */
  private async fetchLatestTopics(): Promise<V2exTopic[]> {
    const url = `${this.baseUrl}/api/topics/show.json?node_name=${this.nodeName}`;
    
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        timeout: 10000, // 10秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (FlexiKit Bot)',
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json: unknown = JSON.parse(data);
            const topics = Array.isArray(json) ? json.filter(isV2exTopic) : [];
            this.logger.log(`V2EX API 返回 ${topics.length} 个有效主题`);
            resolve(topics);
          } catch (e) {
            this.logger.error('V2EX API 响应解析失败', e);
            reject(e);
          }
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('V2EX API 请求超时'));
      });
      
      req.on('error', (e) => {
        this.logger.error('V2EX API 请求失败', e);
        reject(e);
      });
    });
  }

  /**
   * 从主题中提取工具信息
   */
  private extractToolsFromTopics(topics: V2exTopic[]): CrawledTool[] {
    const tools: CrawledTool[] = [];
    
    for (const topic of topics) {
      // 简单提取：标题作为工具名，帖子链接作为来源
      // 实际项目中可以用更复杂的 NLP 提取
      const title = topic.title || '';
      const url = topic.url || `${this.baseUrl}/t/${topic.id}`;
      
      // 跳过太短的标题
      if (title.length < 2) continue;
      
      tools.push({
        name: title.substring(0, 50), // 限制长度
        url: url,
        description: topic.content?.substring(0, 200) || '',
        category: '分享创造',
        tags: ['v2ex', '分享'],
        source: 'v2ex',
        source_url: url,
        // 热度基于回复数计算，回复越多热度越高
        hot_score: (topic.replies || 0) * 2 + (topic.node?.stars || 0) * 0.1,
        upvotes: topic.stars || 0,
        comments: topic.replies || 0,
        discovered_at: topic.created ? new Date(topic.created * 1000) : new Date(),
      });
    }
    
    return tools;
  }
}
