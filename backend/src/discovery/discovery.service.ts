import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { DiscoveryTool } from './discovery.entity';

@Injectable()
export class DiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectRepository(DiscoveryTool)
    private discoveryRepository: Repository<DiscoveryTool>,
  ) {}

  /**
   * 模块初始化时添加示例数据
   */
  async onModuleInit() {
    const count = await this.discoveryRepository.count();
    if (count === 0) {
      this.logger.log('Seeding discovery tools data...');
      await this.seedSampleData();
      this.logger.log('Discovery tools data seeded.');
    }
  }

  /**
   * 添加示例数据
   */
  private async seedSampleData() {
    const sampleTools = [
      // Product Hunt 风格的工具
      {
        name: 'Raycast',
        url: 'https://www.raycast.com',
        description: 'Raycast 是一款效率工具，可以让你通过快捷键快速启动应用、搜索文件、计算、翻译等。',
        category: '效率工具',
        tags: ['效率', '启动器', 'macOS'],
        source: 'producthunt',
        source_url: 'https://www.producthunt.com/posts/raycast',
        hot_score: 95.5,
        upvotes: 12580,
        comments: 892,
        discovered_at: new Date(Date.now() - 86400000 * 2),
      },
      {
        name: 'Linear',
        url: 'https://linear.app',
        description: 'Linear 是一款现代化的项目管理工具，专为软件团队设计，界面简洁优雅。',
        category: '开发工具',
        tags: ['项目管理', '开发', 'SaaS'],
        source: 'producthunt',
        source_url: 'https://www.producthunt.com/posts/linear',
        hot_score: 92.3,
        upvotes: 9870,
        comments: 654,
        discovered_at: new Date(Date.now() - 86400000 * 5),
      },
      {
        name: 'Notion',
        url: 'https://www.notion.so',
        description: 'Notion 是一款集成了笔记、文档、任务管理、数据库等功能的全能工作空间。',
        category: '效率工具',
        tags: ['笔记', '协作', '知识库'],
        source: 'producthunt',
        source_url: 'https://www.producthunt.com/posts/notion',
        hot_score: 98.7,
        upvotes: 15620,
        comments: 1203,
        discovered_at: new Date(Date.now() - 86400000 * 10),
      },
      {
        name: 'Figma',
        url: 'https://www.figma.com',
        description: 'Figma 是一款基于浏览器的界面设计工具，支持多人实时协作。',
        category: '设计工具',
        tags: ['设计', 'UI/UX', '协作'],
        source: 'producthunt',
        source_url: 'https://www.producthunt.com/posts/figma',
        hot_score: 96.8,
        upvotes: 11230,
        comments: 789,
        discovered_at: new Date(Date.now() - 86400000 * 7),
      },
      {
        name: 'Obsidian',
        url: 'https://obsidian.md',
        description: 'Obsidian 是一款基于本地文件的知识管理工具，支持双向链接和 Markdown。',
        category: '效率工具',
        tags: ['笔记', '知识管理', 'Markdown'],
        source: 'producthunt',
        source_url: 'https://www.producthunt.com/posts/obsidian',
        hot_score: 89.2,
        upvotes: 7650,
        comments: 432,
        discovered_at: new Date(Date.now() - 86400000 * 3),
      },
      // 小众软件风格的工具
      {
        name: 'Everything',
        url: 'https://www.voidtools.com',
        description: 'Everything 是一款 Windows 上的文件搜索工具，速度极快，可以瞬间搜索到你需要的文件。',
        category: '系统工具',
        tags: ['搜索', '文件管理', 'Windows'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/everything/',
        hot_score: 88.5,
        upvotes: 3420,
        comments: 156,
        discovered_at: new Date(Date.now() - 3600000 * 2),
      },
      {
        name: 'Wox',
        url: 'https://www.wox.one',
        description: 'Wox 是一款 Windows 上的高效启动器，支持插件、快捷搜索、程序启动等功能。',
        category: '效率工具',
        tags: ['启动器', '效率', 'Windows'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/wox/',
        hot_score: 86.2,
        upvotes: 2890,
        comments: 187,
        discovered_at: new Date(Date.now() - 3600000 * 5),
      },
      {
        name: 'PotPlayer',
        url: 'https://potplayer.daum.net',
        description: 'PotPlayer 是一款功能强大的视频播放器，支持几乎所有格式，界面简洁。',
        category: '影音娱乐',
        tags: ['播放器', '视频', 'Windows'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/potplayer/',
        hot_score: 85.6,
        upvotes: 2890,
        comments: 198,
        discovered_at: new Date(Date.now() - 86400000 * 4),
      },
      {
        name: 'Snipaste',
        url: 'https://www.snipaste.com',
        description: 'Snipaste 是一款简单但强大的截图工具，也可以让你将截图贴回屏幕上。',
        category: '图形图像',
        tags: ['截图', '工具', 'Windows'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/snipaste/',
        hot_score: 90.1,
        upvotes: 4560,
        comments: 234,
        discovered_at: new Date(Date.now() - 86400000 * 6),
      },
      {
        name: 'Traffic Monitor',
        url: 'https://github.com/zhongyang219/TrafficMonitor',
        description: 'Traffic Monitor 是一款用于 Windows 平台的网速监控悬浮窗软件，可以显示当前网速、CPU 及内存利用率。',
        category: '系统工具',
        tags: ['监控', '网速', 'Windows'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/traffic-monitor/',
        hot_score: 82.3,
        upvotes: 1980,
        comments: 87,
        discovered_at: new Date(Date.now() - 86400000 * 8),
      },
      {
        name: 'HandShaker',
        url: 'https://www.smartisan.com/apps/#/handshaker',
        description: 'HandShaker 是锤子科技推出的一款电脑管理手机文件的工具，界面美观，操作简单。',
        category: '手机工具',
        tags: ['文件管理', '手机', '跨平台'],
        source: 'appinn',
        source_url: 'https://www.appinn.com/handshaker/',
        hot_score: 78.9,
        upvotes: 1560,
        comments: 123,
        discovered_at: new Date(Date.now() - 86400000 * 12),
      },
      // V2EX 风格的工具
      {
        name: 'Hoppscotch',
        url: 'https://hoppscotch.io',
        description: 'Hoppscotch 是一款开源的 API 测试工具，轻量快速，支持 REST、GraphQL、WebSocket 等。',
        category: '开发工具',
        tags: ['API', '开发', '开源'],
        source: 'v2ex',
        source_url: 'https://www.v2ex.com/t/123456',
        hot_score: 84.7,
        upvotes: 2340,
        comments: 167,
        discovered_at: new Date(Date.now() - 86400000 * 1),
      },
      {
        name: 'Tabby',
        url: 'https://tabby.sh',
        description: 'Tabby 是一款高度可定制的终端模拟器，支持 SSH、SFTP、串口等。',
        category: '开发工具',
        tags: ['终端', 'SSH', '开源'],
        source: 'v2ex',
        source_url: 'https://www.v2ex.com/t/234567',
        hot_score: 81.2,
        upvotes: 1890,
        comments: 145,
        discovered_at: new Date(Date.now() - 86400000 * 3),
      },
      {
        name: 'ImageOptim',
        url: 'https://imageoptim.com',
        description: 'ImageOptim 是一款图片压缩工具，可以无损压缩 PNG、JPEG 等格式的图片。',
        category: '图形图像',
        tags: ['图片压缩', '优化', 'macOS'],
        source: 'v2ex',
        source_url: 'https://www.v2ex.com/t/345678',
        hot_score: 79.5,
        upvotes: 1670,
        comments: 98,
        discovered_at: new Date(Date.now() - 86400000 * 9),
      },
      {
        name: 'KeePassXC',
        url: 'https://keepassxc.org',
        description: 'KeePassXC 是一款开源的密码管理器，支持自动填充、密码生成等功能。',
        category: '安全工具',
        tags: ['密码管理', '安全', '开源'],
        source: 'v2ex',
        source_url: 'https://www.v2ex.com/t/456789',
        hot_score: 86.4,
        upvotes: 3120,
        comments: 210,
        discovered_at: new Date(Date.now() - 86400000 * 11),
      },
      {
        name: 'Flameshot',
        url: 'https://flameshot.org',
        description: 'Flameshot 是一款功能强大但简单易用的截图工具，支持标注、模糊、上传等功能。',
        category: '图形图像',
        tags: ['截图', '开源', '跨平台'],
        source: 'v2ex',
        source_url: 'https://www.v2ex.com/t/567890',
        hot_score: 83.6,
        upvotes: 2450,
        comments: 178,
        discovered_at: new Date(Date.now() - 86400000 * 2),
      },
    ];

    for (const tool of sampleTools) {
      await this.addTool(tool);
    }
  }

  /**
   * 获取发现工具列表
   */
  async findAll(query: {
    source?: string;
    category?: string;
    search?: string;
    sort?: 'hot' | 'new' | 'upvotes';
    limit?: number;
    offset?: number;
  }) {
    const {
      source,
      category,
      search,
      sort = 'hot',
      limit = 20,
      offset = 0,
    } = query;

    const qb = this.discoveryRepository.createQueryBuilder('tool');

    // 筛选来源
    if (source) {
      qb.andWhere('tool.source = :source', { source });
    }

    // 筛选分类
    if (category) {
      qb.andWhere('tool.category = :category', { category });
    }

    // 搜索
    if (search) {
      qb.andWhere(
        '(tool.name ILIKE :search OR tool.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 排序
    switch (sort) {
      case 'new':
        qb.orderBy('tool.discovered_at', 'DESC');
        break;
      case 'upvotes':
        qb.orderBy('tool.upvotes', 'DESC');
        break;
      case 'hot':
      default:
        qb.orderBy('tool.hot_score', 'DESC');
        break;
    }

    // 分页
    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total };
  }

  /**
   * 获取推荐工具（按热度排序）
   */
  async getRecommendations(limit: number = 6, source?: string) {
    const qb = this.discoveryRepository.createQueryBuilder('tool');
    
    if (source) {
      qb.andWhere('tool.source = :source', { source });
    }
    
    qb.orderBy('tool.hot_score', 'DESC')
      .take(limit);
    return qb.getMany();
  }

  /**
   * 获取排行榜
   */
  async getRankings(period: string = 'all', limit: number = 10, source?: string) {
    const qb = this.discoveryRepository.createQueryBuilder('tool');
    
    if (source) {
      qb.andWhere('tool.source = :source', { source });
    }
    
    // 按时间段筛选
    if (period && period !== 'all') {
      const startDate = this.getPeriodStartDate(period);
      if (startDate) {
        qb.andWhere('tool.discovered_at >= :startDate', { startDate });
      }
    }
    
    qb.orderBy('tool.hot_score', 'DESC')
      .take(limit);
    
    const items = await qb.getMany();
    return items.map(item => ({
      ...item,
      hot_score: item.hot_score,
    }));
  }

  /**
   * 获取时间段的起始时间
   */
  private getPeriodStartDate(period: string): Date | null {
    const now = new Date();
    const start = new Date(now);
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return start;
      case 'week':
        // 本周一 00:00
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1; // 周日是0，周一到周日是1-6
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        return start;
      case 'month':
        // 本月1号 00:00
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return start;
      default:
        return null;
    }
  }

  /**
   * 获取最新发现
   */
  async getLatest(limit: number = 10, offset: number = 0, source?: string) {
    const qb = this.discoveryRepository.createQueryBuilder('tool');
    
    if (source) {
      qb.andWhere('tool.source = :source', { source });
    }
    
    qb.orderBy('tool.discovered_at', 'DESC')
      .skip(offset)
      .take(limit);
    
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * 获取所有来源平台
   */
  async getSources() {
    const qb = this.discoveryRepository
      .createQueryBuilder('tool')
      .select('tool.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tool.source')
      .orderBy('count', 'DESC');
    
    const result = await qb.getRawMany();
    return result.map(item => ({
      source: item.source,
      count: parseInt(item.count, 10),
    }));
  }

  /**
   * 添加工具（爬虫用）
   */
  async addTool(toolData: Partial<DiscoveryTool>) {
    // 检查是否已存在（按 URL 去重）
    const existing = await this.discoveryRepository.findOne({
      where: { url: toolData.url },
    });

    if (existing) {
      // 更新热度分等信息
      existing.hot_score = toolData.hot_score ?? existing.hot_score;
      existing.upvotes = toolData.upvotes ?? existing.upvotes;
      existing.comments = toolData.comments ?? existing.comments;
      return this.discoveryRepository.save(existing);
    }

    // 如果没有图标，自动生成 favicon 地址
    const icon = toolData.icon || this.getFaviconUrl(toolData.url || '');

    const tool = this.discoveryRepository.create({
      ...toolData,
      icon,
      discovered_at: toolData.discovered_at || new Date(),
    });

    return this.discoveryRepository.save(tool);
  }

  /**
   * 根据 URL 获取 favicon 图标地址
   */
  private getFaviconUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      // 使用国内 favicon 服务
      return `https://api.iowen.cn/favicon/${domain}.png`;
    } catch {
      return '';
    }
  }

  /**
   * 批量添加工具
   */
  async batchAddTools(toolsData: Partial<DiscoveryTool>[]): Promise<DiscoveryTool[]> {
    const results: DiscoveryTool[] = [];
    for (const toolData of toolsData) {
      try {
        const result = await this.addTool(toolData);
        results.push(result);
      } catch (e) {
        console.error('Failed to add tool:', toolData.name, e);
      }
    }
    return results;
  }
}
