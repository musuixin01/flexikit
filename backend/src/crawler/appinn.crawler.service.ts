import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService, CrawledTool } from './crawler.service';
import { DiscoveryService } from '../discovery/discovery.service';
import * as https from 'https';
import * as cheerio from 'cheerio';

@Injectable()
export class AppinnCrawlerService extends CrawlerService {
  private readonly feedUrl = 'https://www.appinn.com/feed/';
  private readonly source = 'appinn';

  constructor(discoveryService: DiscoveryService) {
    super(discoveryService);
  }

  /**
   * 定时任务：每天抓取两次
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.log('定时任务：开始抓取小众软件');
    await this.crawl();
  }

  /**
   * 执行小众软件爬虫
   */
  async crawl(): Promise<number> {
    this.logger.log('开始抓取小众软件 RSS...');

    try {
      const items = await this.fetchFeed();
      this.logger.log(`获取到 ${items.length} 篇文章`);

      const tools = await this.extractToolsFromItems(items);
      const count = await this.saveTools(tools);

      this.logger.log(`小众软件抓取完成，新增 ${count} 个工具`);
      return count;
    } catch (e) {
      this.logger.error('小众软件抓取失败', e);
      return 0;
    }
  }

  /**
   * 获取 RSS feed
   */
  private async fetchFeed(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const req = https.get(this.feedUrl, {
        timeout: 15000,
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
        reject(new Error('小众软件 RSS 请求超时'));
      });

      req.on('error', (e) => {
        this.logger.error('小众软件 RSS 请求失败', e);
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
      const creator = $(element).find('creator').text().trim();

      items.push({ title, link, description, pubDate, creator });
    });

    return items;
  }

  /**
   * 从文章中提取工具信息
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

    // 尝试从标题中提取工具名称
    // 常见格式："软件名称：描述" 或 "软件名称 - 描述"
    let name = title;
    let desc = description;

    // 尝试匹配 "名称：描述" 格式
    const colonMatch = title.match(/^(.+?)[：:](.+)$/);
    if (colonMatch) {
      name = colonMatch[1].trim();
      desc = colonMatch[2].trim() + ' ' + desc;
    }

    // 尝试匹配 "名称 - 描述" 格式
    const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (dashMatch && !colonMatch) {
      name = dashMatch[1].trim();
      desc = dashMatch[2].trim() + ' ' + desc;
    }

    // 尝试从描述中提取官网链接
    const url = this.extractUrl(item.description || '') || item.link;

    // 自动分类
    const category = this.classifyCategory(title + ' ' + description);

    // 自动生成标签
    const tags = this.generateTags(title + ' ' + description, category);

    // 计算热度分（基于发布时间和内容长度）
    const hotScore = this.calculateHotScore(item.pubDate, description.length);

    return {
      name: name.substring(0, 50),
      url: url,
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
   * 从 HTML 中提取第一个链接
   */
  private extractUrl(html: string): string {
    const match = html.match(/href="([^"]+)"/);
    if (match && match[1]) {
      // 过滤掉小众软件自己的链接
      if (!match[1].includes('appinn.com')) {
        return match[1];
      }
    }
    return '';
  }

  /**
   * 自动分类
   */
  private classifyCategory(text: string): string {
    const lowerText = text.toLowerCase();

    if (/(系统|优化|清理|监控|工具|软件)/i.test(text) && /(Windows|macOS|Linux|系统)/i.test(text)) {
      return '系统工具';
    }
    if (/(视频|音频|播放|剪辑|录屏|音乐)/i.test(text)) {
      return '影音娱乐';
    }
    if (/(图片|图像|截图|编辑|处理|设计|PS|Photoshop)/i.test(text)) {
      return '图形图像';
    }
    if (/(开发|编程|代码|IDE|调试|Git|API)/i.test(text)) {
      return '开发工具';
    }
    if (/(网络|下载|上传|加速|代理|浏览器)/i.test(text)) {
      return '网络工具';
    }
    if (/(安全|加密|密码|隐私|防护|杀毒)/i.test(text)) {
      return '安全工具';
    }
    if (/(文档|办公|PDF|笔记|写作|表格|PPT)/i.test(text)) {
      return '文档办公';
    }
    if (/(效率|办公|时间管理|生产力|自动化|启动器)/i.test(text)) {
      return '效率工具';
    }
    if (/(学习|教育|阅读|知识|语言|英语)/i.test(text)) {
      return '学习教育';
    }
    if (/(文件|管理|云存储|同步|备份|压缩)/i.test(text)) {
      return '文件管理';
    }
    if (/(手机|移动|安卓|iOS|APP)/i.test(text)) {
      return '手机工具';
    }
    if (/(游戏|娱乐|电竞|休闲)/i.test(text)) {
      return '游戏娱乐';
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
      '系统工具': ['系统', '优化', '实用工具'],
      '影音娱乐': ['视频', '音频', '多媒体'],
      '图形图像': ['图片', '图像处理', '设计'],
      '开发工具': ['开发', '编程', '开发者工具'],
      '网络工具': ['网络', '下载', '网络工具'],
      '安全工具': ['安全', '隐私', '安全工具'],
      '文档办公': ['文档', '办公', '办公软件'],
      '效率工具': ['效率', '办公', '生产力'],
      '学习教育': ['学习', '教育', '知识'],
      '文件管理': ['文件管理', '备份', '同步'],
      '手机工具': ['手机', '移动', '移动端'],
      '游戏娱乐': ['游戏', '娱乐', '休闲'],
    };

    if (categoryTags[category]) {
      tags.push(...categoryTags[category]);
    }

    // 添加一些关键词标签
    if (/(免费|开源|免费软件)/i.test(text)) {
      tags.push('免费');
    }
    if (/(开源|open source|GitHub)/i.test(text)) {
      tags.push('开源');
    }
    if (/(便携|绿色|Portable)/i.test(text)) {
      tags.push('便携软件');
    }
    if (/(Windows|win)/i.test(text)) {
      tags.push('Windows');
    }
    if (/(macOS|Mac|苹果)/i.test(text)) {
      tags.push('macOS');
    }
    if (/(Linux|ubuntu)/i.test(text)) {
      tags.push('Linux');
    }

    // 去重
    return [...new Set(tags)].slice(0, 6);
  }

  /**
   * 计算热度分
   */
  private calculateHotScore(pubDate: string, contentLength: number): number {
    let score = 50; // 基础分

    // 根据发布时间计算：越新分数越高
    if (pubDate) {
      const date = new Date(pubDate);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 1) {
        score += 30; // 24小时内 +30
      } else if (daysDiff <= 3) {
        score += 20; // 3天内 +20
      } else if (daysDiff <= 7) {
        score += 10; // 7天内 +10
      } else if (daysDiff <= 30) {
        score += 5; // 30天内 +5
      }
    }

    // 根据内容长度计算：内容越长通常越详细，分数略高
    if (contentLength > 500) {
      score += 10;
    } else if (contentLength > 200) {
      score += 5;
    }

    // 添加一点随机因素
    score += Math.random() * 5;

    return Math.min(100, Math.round(score * 10) / 10);
  }
}
