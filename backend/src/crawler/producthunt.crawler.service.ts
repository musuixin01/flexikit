import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService, CrawledTool } from './crawler.service';
import { DiscoveryService } from '../discovery/discovery.service';
import * as https from 'https';
import * as cheerio from 'cheerio';

@Injectable()
export class ProducthuntCrawlerService extends CrawlerService {
  private readonly feedUrl = 'https://www.producthunt.com/feed';
  private readonly source = 'producthunt';

  constructor(discoveryService: DiscoveryService) {
    super(discoveryService);
  }

  /**
   * 定时任务：每天抓取一次
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCron() {
    this.logger.log('定时任务：开始抓取 Product Hunt');
    await this.crawl();
  }

  /**
   * 执行 Product Hunt 爬虫
   */
  async crawl(): Promise<number> {
    this.logger.log('开始抓取 Product Hunt RSS...');

    try {
      const items = await this.fetchFeed();
      this.logger.log(`获取到 ${items.length} 个产品`);

      const tools = await this.extractToolsFromItems(items);
      const count = await this.saveTools(tools);

      this.logger.log(`Product Hunt 抓取完成，新增 ${count} 个工具`);
      return count;
    } catch (e) {
      this.logger.error('Product Hunt 抓取失败', e);
      return 0;
    }
  }

  /**
   * 获取 RSS feed
   */
  private async fetchFeed(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const req = https.get(this.feedUrl, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (FlexiKit Bot)',
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const items = this.parseRss(data);
            resolve(items);
          } catch (e) {
            this.logger.error('RSS 解析失败', e);
            reject(e);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Product Hunt RSS 请求超时'));
      });

      req.on('error', (e) => {
        this.logger.error('Product Hunt RSS 请求失败', e);
        reject(e);
      });
    });
  }

  /**
   * 解析 RSS XML
   */
  private parseRss(xml: string): any[] {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: any[] = [];

    $('item').each((_, element) => {
      const title = $(element).find('title').text().trim();
      const link = $(element).find('link').text().trim();
      const description = $(element).find('description').text().trim();
      const pubDate = $(element).find('pubDate').text().trim();
      const category = $(element).find('category').text().trim();

      items.push({ title, link, description, pubDate, category });
    });

    return items;
  }

  /**
   * 从产品中提取工具信息
   */
  private async extractToolsFromItems(items: any[]): Promise<CrawledTool[]> {
    const tools: CrawledTool[] = [];

    for (const item of items) {
      try {
        const tool = this.extractToolInfo(item);
        if (tool) {
          tools.push(tool);
        }
      } catch (e) {
        this.logger.warn(`提取工具信息失败: ${item.title}`, e);
      }
    }

    return tools;
  }

  /**
   * 提取单个工具的信息
   */
  private extractToolInfo(item: any): CrawledTool | null {
    const title = item.title || '';
    const description = this.stripHtml(item.description || '');

    // 跳过太短的标题
    if (title.length < 2) return null;

    // 尝试从标题中提取工具名称和标语
    // Product Hunt 格式通常是 "Product Name - Tagline"
    let name = title;
    let tagline = '';

    const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (dashMatch) {
      name = dashMatch[1].trim();
      tagline = dashMatch[2].trim();
    }

    const desc = tagline + (tagline && description ? ' - ' : '') + description;

    // 自动分类
    const category = this.classifyCategory(title + ' ' + description + ' ' + item.category);

    // 自动生成标签
    const tags = this.generateTags(title + ' ' + description + ' ' + item.category, category);

    // 计算热度分
    const hotScore = this.calculateHotScore(item.pubDate, description.length);

    return {
      name: name.substring(0, 50),
      url: item.link,
      description: desc.substring(0, 300),
      category: category,
      tags: tags,
      source: this.source,
      source_url: item.link,
      hot_score: hotScore,
      upvotes: 0,
      comments: 0,
    };
  }

  /**
   * 去除 HTML 标签
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * 自动分类
   */
  private classifyCategory(text: string): string {
    const lowerText = text.toLowerCase();

    if (/(developer|development|code|programming|api|dev tool|developer tool)/i.test(text)) {
      return '开发工具';
    }
    if (/(design|ui|ux|graphic|image|photo|creative)/i.test(text)) {
      return '设计工具';
    }
    if (/(productivity|efficiency|task|todo|time|workflow|automation)/i.test(text)) {
      return '效率工具';
    }
    if (/(marketing|growth|seo|analytics|social media)/i.test(text)) {
      return '电商工具';
    }
    if (/(ai|artificial intelligence|machine learning|gpt|chatbot)/i.test(text)) {
      return '数据科学';
    }
    if (/(finance|money|banking|investment|crypto|bitcoin)/i.test(text)) {
      return '生活实用';
    }
    if (/(education|learning|study|school|course)/i.test(text)) {
      return '学习教育';
    }
    if (/(entertainment|game|music|video|movie|streaming)/i.test(text)) {
      return '影音娱乐';
    }
    if (/(health|fitness|wellness|medical|healthcare)/i.test(text)) {
      return '生活实用';
    }
    if (/(communication|chat|messaging|email|collaboration)/i.test(text)) {
      return '通讯社交';
    }

    return '效率工具'; // 默认分类
  }

  /**
   * 生成标签
   */
  private generateTags(text: string, category: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    // 根据分类添加标签
    const categoryTags: Record<string, string[]> = {
      '开发工具': ['开发', '编程', '开发者工具'],
      '设计工具': ['设计', '创意', '设计工具'],
      '效率工具': ['效率', '生产力', '办公'],
      '电商工具': ['营销', '运营', '数据分析'],
      '数据科学': ['AI', '机器学习', '数据'],
      '学习教育': ['学习', '教育', '知识'],
      '影音娱乐': ['娱乐', '视频', '音乐'],
      '生活实用': ['生活', '实用', '健康'],
      '通讯社交': ['社交', '通讯', '协作'],
    };

    if (categoryTags[category]) {
      tags.push(...categoryTags[category]);
    }

    // 添加一些关键词标签
    if (/(free|免费)/i.test(text)) {
      tags.push('免费');
    }
    if (/(open source|开源)/i.test(text)) {
      tags.push('开源');
    }
    if (/(ai|gpt|chatgpt|artificial intelligence)/i.test(text)) {
      tags.push('AI');
    }
    if (/(saas|web app|webapp)/i.test(text)) {
      tags.push('SaaS');
    }
    if (/(mobile|ios|android|app)/i.test(text)) {
      tags.push('移动端');
    }

    // 添加 Product Hunt 标签
    tags.push('Product Hunt');

    // 去重
    return [...new Set(tags)].slice(0, 6);
  }

  /**
   * 计算热度分
   */
  private calculateHotScore(pubDate: string, contentLength: number): number {
    let score = 55; // 基础分（Product Hunt 的产品质量较高，基础分高一些）

    // 根据发布时间计算：越新分数越高
    if (pubDate) {
      const date = new Date(pubDate);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 1) {
        score += 35; // 24小时内 +35
      } else if (daysDiff <= 3) {
        score += 25; // 3天内 +25
      } else if (daysDiff <= 7) {
        score += 15; // 7天内 +15
      } else if (daysDiff <= 30) {
        score += 5; // 30天内 +5
      }
    }

    // 根据内容长度计算
    if (contentLength > 300) {
      score += 5;
    }

    // 添加一点随机因素
    score += Math.random() * 5;

    return Math.min(100, Math.round(score * 10) / 10);
  }
}
