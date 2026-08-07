import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool } from './tool.entity';

export interface TagRecommendation {
  tag: string;
  score: number; // 相关性分数 0-1
  source: 'category' | 'keyword' | 'name' | 'ai' | 'personalized'; // 推荐来源
}

@Injectable()
export class TagRecommendationService {
  private readonly logger = new Logger(TagRecommendationService.name);

  /**
   * 是否启用 HuggingFace AI 增强
   */
  private readonly aiEnabled: boolean;
  private readonly huggingfaceApiKey?: string;
  private readonly huggingfaceModel: string;

  constructor(
    @InjectRepository(Tool)
    private toolRepository: Repository<Tool>,
  ) {
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    this.huggingfaceModel = process.env.HUGGINGFACE_MODEL || 'MoritzLaurer/mDeBERTa-v3-base-mnli-xnli';
    this.aiEnabled = !!this.huggingfaceApiKey;
  }
  /**
   * 分类到标签的映射
   */
  private readonly categoryTags: Record<string, string[]> = {
    '效率工具': ['效率', '办公', '时间管理', '生产力', '自动化', '工作流'],
    '开发工具': ['开发', '编程', '代码', 'IDE', '调试', '开发者工具'],
    '设计工具': ['设计', 'UI', 'UX', '图形', '创意', '原型'],
    '系统工具': ['系统', '优化', '清理', '监控', '实用', '系统工具'],
    '网络工具': ['网络', '下载', '上传', '加速', '代理', '网络工具'],
    '安全工具': ['安全', '加密', '密码', '隐私', '防护', '安全工具'],
    '影音娱乐': ['视频', '音频', '播放', '娱乐', '媒体', '影音'],
    '图形图像': ['图片', '图像', '截图', '编辑', '处理', '图像处理'],
    '文档办公': ['文档', '办公', 'PDF', '笔记', '写作', '办公软件'],
    '学习教育': ['学习', '教育', '阅读', '知识', '语言', '在线学习'],
    '生活实用': ['生活', '实用', '日常', '健康', '理财', '生活工具'],
    '通讯社交': ['通讯', '社交', '聊天', '邮件', '协作', '社交工具'],
    '手机工具': ['手机', '移动', '安卓', 'iOS', '同步', '移动端'],
    '分享创造': ['创造', '分享', '开源', '项目', '作品', '创作者'],
    '游戏娱乐': ['游戏', '娱乐', '电竞', '游戏平台', '游戏加速器', '休闲'],
    '数据科学': ['数据', '数据分析', '可视化', '大数据', 'AI', '机器学习'],
    '云服务': ['云服务', '云计算', '服务器', '云存储', 'CDN', '云主机'],
    '项目管理': ['项目管理', '团队协作', '任务管理', '敏捷开发', '看板', '甘特图'],
    '电商工具': ['电商', '开店', '运营', '数据分析', '营销', '电商运营'],
    '内容创作': ['内容创作', '自媒体', '短视频', '直播', '文案', '创作者'],
    '翻译工具': ['翻译', '词典', '语言', '翻译工具', 'OCR', '文字识别'],
    '思维导图': ['思维导图', '脑图', '思考', '知识图谱', 'XMind', '思维工具'],
    '数据库工具': ['数据库', 'SQL', '数据管理', 'Redis', 'MongoDB', '数据库管理'],
    '远程办公': ['远程办公', '远程桌面', '视频会议', '屏幕共享', '协作', '远程工具'],
    '文件管理': ['文件管理', '云存储', '同步', '备份', '压缩', '文件传输'],
  };

  /**
   * 关键词标签库：关键词 -> 对应标签
   */
  private readonly keywordTags: Array<{ pattern: RegExp; tags: string[] }> = [
    // ===== AI / 大模型相关 =====
    { pattern: /\bAI\b|人工智能|大模型|\bGPT\b|\bLLM\b|生成式|\bAIGC\b/i, tags: ['AI', '人工智能', '大模型'] },
    { pattern: /ChatGPT|对话|聊天机器人|AI助手/i, tags: ['AI', '对话', '聊天机器人'] },
    { pattern: /机器学习|深度学习|神经网络|\bML\b|\bDL\b/i, tags: ['机器学习', '深度学习', 'AI'] },
    { pattern: /计算机视觉|图像识别|\bCV\b|\bOCR\b|文字识别/i, tags: ['计算机视觉', 'OCR', 'AI'] },
    { pattern: /自然语言处理|\bNLP\b|文本生成|语义理解/i, tags: ['NLP', '自然语言处理', 'AI'] },
    { pattern: /语音识别|语音合成|\bTTS\b|\bASR\b|语音助手/i, tags: ['语音识别', '语音合成', 'AI'] },
    { pattern: /Stable Diffusion|Midjourney|DALL·E|文生图|AI绘画/i, tags: ['AI绘画', '图像生成', 'AI'] },
    { pattern: /DeepSeek|Qwen|Llama|Claude|Gemini|Kimi|智谱|文心|通义|豆包|Claude|GPT|大模型|Stitch/i, tags: ['AI', '大模型', 'ChatGPT'] },
    
    // ===== 效率 / 生产力相关 =====
    { pattern: /效率|生产力|自动化|工作流|Workflow/i, tags: ['效率', '生产力', '自动化'] },
    { pattern: /待办|任务|清单|Todo|任务管理/i, tags: ['待办', '任务管理', '效率'] },
    { pattern: /笔记|记录|知识管理|Notion|Obsidian/i, tags: ['笔记', '知识管理', '效率'] },
    { pattern: /时间管理|番茄钟|专注|时间追踪/i, tags: ['时间管理', '专注', '效率'] },
    { pattern: /启动器|快速启动|Alfred|Raycast|Listary/i, tags: ['启动器', '快速启动', '效率'] },
    { pattern: /快捷键|自动化|AutoHotkey|AHK|按键精灵/i, tags: ['快捷键', '自动化', '效率'] },
    { pattern: /剪贴板|剪切板|剪贴板历史|Ditto/i, tags: ['剪贴板', '效率', '工具'] },
    
    // ===== 开发 / 编程相关 =====
    { pattern: /代码|编程|开发|\bIDE\b|编辑器|Coding/i, tags: ['开发', '编程', '代码'] },
    { pattern: /\bAPI\b|接口|调试|测试|Postman|Apifox/i, tags: ['API', '调试', '开发'] },
    { pattern: /Git|版本控制|仓库|GitHub|GitLab/i, tags: ['Git', '版本控制', '开发'] },
    { pattern: /数据库|\bSQL\b|Redis|MySQL|PostgreSQL/i, tags: ['数据库', 'SQL', '开发'] },
    { pattern: /前端|后端|全栈|Web|前端开发/i, tags: ['Web开发', '前端', '后端'] },
    { pattern: /框架|Vue|React|Angular|Node.js/i, tags: ['框架', '前端', '开发'] },
    { pattern: /容器|Docker|\bK8s\b|Kubernetes|容器化/i, tags: ['Docker', '容器化', '开发'] },
    { pattern: /CI\/CD|持续集成|持续部署|DevOps/i, tags: ['CI/CD', 'DevOps', '开发'] },
    { pattern: /终端|命令行|Shell|Terminal|iTerm/i, tags: ['终端', '命令行', '开发'] },
    { pattern: /\bSSH\b|远程|连接|远程连接|\bVNC\b/i, tags: ['远程连接', 'SSH', '开发'] },
    { pattern: /抓包|Charles|Fiddler|Wireshark|网络分析/i, tags: ['抓包', '网络分析', '开发'] },
    { pattern: /虚拟机|VMware|VirtualBox|虚拟机/i, tags: ['虚拟机', '开发', '系统工具'] },
    
    // ===== 设计 / 创意相关 =====
    { pattern: /设计|\bUI\b|\bUX\b|原型|Figma|Sketch|Stitch/i, tags: ['设计', 'UI', '原型'] },
    { pattern: /Photoshop|\bPS\b|修图|图片编辑|图像处理/i, tags: ['Photoshop', '图像处理', '设计'] },
    { pattern: /图标|素材|模板|设计素材|UI素材/i, tags: ['设计素材', '图标', '模板'] },
    { pattern: /矢量图|\bSVG\b|Illustrator|\bAI\b|矢量/i, tags: ['矢量图', 'SVG', '设计'] },
    { pattern: /\b3D\b|三维|建模|Blender|Maya|3DMax/i, tags: ['3D建模', '三维', '设计'] },
    { pattern: /动效|动画|Motion|After Effects|\bAE\b/i, tags: ['动效', '动画', '设计'] },
    
    // ===== 系统 / 工具相关 =====
    { pattern: /系统|优化|清理|加速|系统优化/i, tags: ['系统优化', '清理', '加速'] },
    { pattern: /文件|搜索|查找|Everything|文件搜索/i, tags: ['文件管理', '搜索', '效率'] },
    { pattern: /压缩|解压|zip|rar|7z|压缩包/i, tags: ['压缩解压', '文件管理', '工具'] },
    { pattern: /备份|同步|数据备份|文件同步/i, tags: ['备份', '同步', '文件管理'] },
    { pattern: /卸载|软件管理|软件卸载|Geek/i, tags: ['软件卸载', '系统工具', '清理'] },
    { pattern: /硬件检测|硬件信息|\bCPU\b|\bGPU\b|温度监控/i, tags: ['硬件检测', '系统监控', '系统工具'] },
    { pattern: /数据恢复|文件恢复|Recuva|EasyRecovery/i, tags: ['数据恢复', '系统工具', '实用'] },
    
    // ===== 网络 / 下载相关 =====
    { pattern: /下载|\bBT\b|磁力|迅雷|\bIDM\b|下载器/i, tags: ['下载', '下载工具', '网络'] },
    { pattern: /浏览器|扩展|插件|Chrome|Edge|Firefox/i, tags: ['浏览器', '扩展', '工具'] },
    { pattern: /代理|\bVPN\b|科学上网|翻墙|代理工具/i, tags: ['代理', 'VPN', '网络工具'] },
    { pattern: /云存储|网盘|百度网盘|阿里云盘|OneDrive/i, tags: ['云存储', '网盘', '文件管理'] },
    { pattern: /\bFTP\b|文件传输|传输工具|FileZilla/i, tags: ['FTP', '文件传输', '网络工具'] },
    { pattern: /远程桌面|远程控制|TeamViewer|向日葵|ToDesk/i, tags: ['远程桌面', '远程控制', '远程办公'] },
    
    // ===== 安全 / 隐私相关 =====
    { pattern: /密码|加密|安全|隐私|密码管理|1Password|Bitwarden/i, tags: ['密码管理', '安全', '隐私'] },
    { pattern: /防火墙|杀毒|安全防护|杀毒软件/i, tags: ['安全', '防护', '杀毒'] },
    { pattern: /广告拦截|去广告|AdBlock|uBlock|广告过滤/i, tags: ['广告拦截', '隐私保护', '工具'] },
    { pattern: /隐私保护|数据安全|加密|端到端/i, tags: ['隐私保护', '数据安全', '安全'] },
    
    // ===== 影音 / 娱乐相关 =====
    { pattern: /视频|播放|播放器|PotPlayer|VLC|mpv/i, tags: ['视频', '播放器', '媒体'] },
    { pattern: /音乐|音频|听歌|网易云|QQ音乐|Spotify/i, tags: ['音乐', '音频', '媒体'] },
    { pattern: /剪辑|视频剪辑|剪映|Premiere|\bPR\b|视频编辑/i, tags: ['视频剪辑', '视频编辑', '创作'] },
    { pattern: /录屏|屏幕录制|\bOBS\b|Camtasia|录屏软件/i, tags: ['录屏', '屏幕录制', '工具'] },
    { pattern: /直播|推流|\bOBS\b|直播工具|直播软件/i, tags: ['直播', '推流', '创作'] },
    { pattern: /游戏|电竞|Steam|Epic|游戏平台/i, tags: ['游戏', '游戏平台', '娱乐'] },
    { pattern: /游戏加速器|加速器|网游加速|UU加速器/i, tags: ['游戏加速器', '网络加速', '游戏'] },
    
    // ===== 图片 / 图像相关 =====
    { pattern: /截图|截屏|Snipaste|截图工具|截屏工具/i, tags: ['截图', '截图工具', '效率'] },
    { pattern: /图片|图像|照片|图像处理|图片处理/i, tags: ['图片', '图像处理', '工具'] },
    { pattern: /图片压缩|压缩|tiny|TinyPNG|图片优化/i, tags: ['图片压缩', '优化', '工具'] },
    { pattern: /图片格式转换|格式转换|图片转换|格式工厂/i, tags: ['格式转换', '图像处理', '工具'] },
    { pattern: /抠图|去背景|背景移除|Remove.bg/i, tags: ['抠图', '去背景', '图像处理'] },
    
    // ===== 文档 / 办公相关 =====
    { pattern: /\bPDF\b|文档|阅读|PDF阅读器|PDF编辑/i, tags: ['PDF', '文档', '阅读'] },
    { pattern: /Markdown|\bMD\b|写作|Markdown编辑器|Typora/i, tags: ['Markdown', '写作', '笔记'] },
    { pattern: /思维导图|脑图|XMind|MindManager|思维工具/i, tags: ['思维导图', '脑图', '效率'] },
    { pattern: /表格|Excel|电子表格|数据处理|WPS/i, tags: ['表格', 'Excel', '办公'] },
    { pattern: /演示|\bPPT\b|幻灯片|PowerPoint|演示文稿/i, tags: ['PPT', '演示', '办公'] },
    { pattern: /协作文档|在线文档|腾讯文档|飞书文档|石墨文档/i, tags: ['协作文档', '在线文档', '团队协作'] },
    
    // ===== 学习 / 教育相关 =====
    { pattern: /学习|教育|课程|在线课程|网课/i, tags: ['学习', '教育', '在线学习'] },
    { pattern: /英语|语言|单词|背单词|语言学习/i, tags: ['语言学习', '英语', '单词'] },
    { pattern: /阅读|电子书|\bEPUB\b|电子书阅读器|Kindle/i, tags: ['阅读', '电子书', '学习'] },
    { pattern: /翻译|词典|翻译工具|有道|谷歌翻译|DeepL/i, tags: ['翻译', '词典', '语言工具'] },
    { pattern: /编程学习|编程入门|教程|在线编程|LeetCode/i, tags: ['编程学习', '开发', '学习'] },
    
    // ===== 生活 / 实用相关 =====
    { pattern: /健康|运动|健身|Keep|健身记录/i, tags: ['健康', '运动', '生活'] },
    { pattern: /理财|记账|财务|记账软件|随手记/i, tags: ['理财', '记账', '生活'] },
    { pattern: /天气|日历|提醒|日程|日程管理/i, tags: ['天气', '日程', '生活工具'] },
    { pattern: /地图|导航|出行|打车|高德|百度地图/i, tags: ['地图导航', '出行', '生活'] },
    
    // ===== 通讯 / 协作相关 =====
    { pattern: /聊天|通讯|消息|即时通讯|\bIM\b/i, tags: ['通讯', '聊天', '社交'] },
    { pattern: /邮件|Email|客户端|邮件客户端|Thunderbird/i, tags: ['邮件', '邮件客户端', '通讯'] },
    { pattern: /协作|团队|项目管理|团队协作|Trello|Jira/i, tags: ['团队协作', '项目管理', '效率'] },
    { pattern: /视频会议|会议|Zoom|腾讯会议|飞书会议/i, tags: ['视频会议', '远程办公', '协作'] },
    { pattern: /屏幕共享|共享屏幕|远程协作|协作工具/i, tags: ['屏幕共享', '远程协作', '团队协作'] },
    
    // ===== 内容 / 创作相关 =====
    { pattern: /自媒体|内容创作|创作者|公众号|短视频/i, tags: ['自媒体', '内容创作', '创作者'] },
    { pattern: /短视频|抖音|快手|视频创作|短视频制作/i, tags: ['短视频', '视频创作', '内容创作'] },
    { pattern: /文案|写作|文案写作|内容写作|AI写作/i, tags: ['文案', '写作', '内容创作'] },
    { pattern: /直播|主播|直播工具|直播软件|\bOBS\b/i, tags: ['直播', '主播', '内容创作'] },
    
    // ===== 电商 / 运营相关 =====
    { pattern: /电商|开店|淘宝|京东|拼多多|电商运营/i, tags: ['电商', '电商运营', '开店'] },
    { pattern: /运营|新媒体运营|用户运营|内容运营|活动运营/i, tags: ['运营', '新媒体运营', '互联网'] },
    { pattern: /数据分析|数据运营|\bBI\b|数据可视化|数据报表/i, tags: ['数据分析', '数据可视化', '运营'] },
    { pattern: /营销|推广|网络营销|数字营销|\bSEO\b/i, tags: ['营销', '推广', '运营'] },
    
    // ===== 区块链 / Web3 相关 =====
    { pattern: /区块链|Web3|加密货币|比特币|以太坊|\bBTC\b|\bETH\b/i, tags: ['区块链', 'Web3', '加密货币'] },
    { pattern: /钱包|数字钱包|加密钱包|MetaMask|imToken/i, tags: ['数字钱包', '区块链', 'Web3'] },
    { pattern: /\bNFT\b|数字藏品|非同质化代币/i, tags: ['NFT', '数字藏品', 'Web3'] },
    { pattern: /\bDeFi\b|去中心化金融|\bDEX\b|去中心化交易所/i, tags: ['DeFi', '去中心化金融', 'Web3'] },
    
    // ===== 云服务 / 服务器相关 =====
    { pattern: /云服务|云计算|云服务器|\bECS\b|云主机|\bVPS\b/i, tags: ['云服务', '云服务器', '云计算'] },
    { pattern: /\bCDN\b|加速|内容分发|网络加速/i, tags: ['CDN', '网络加速', '云服务'] },
    { pattern: /域名|\bDNS\b|域名解析|域名注册/i, tags: ['域名', 'DNS', '网络'] },
    { pattern: /对象存储|\bOSS\b|\bS3\b|云存储|对象存储服务/i, tags: ['对象存储', '云存储', '云服务'] },
  ];

  /**
   * 推荐标签
   * @param name 工具名称
   * @param description 工具描述
   * @param category 工具分类（可选）
   * @param limit 返回数量限制
   * @param userId 用户ID（可选，用于个性化推荐）
   * @param url 工具网址（可选，用于从域名提取关键词）
   */
  async recommendTags(
    name: string,
    description: string,
    category?: string,
    limit: number = 8,
    userId?: number,
    url?: string,
  ): Promise<TagRecommendation[]> {
    const recommendations: Map<string, TagRecommendation> = new Map();

    // 1. 基于名称的关键词匹配（权重更高）
    this.extractKeywords(name, 'name', recommendations, 1.0);

    // 2. 基于描述的关键词匹配
    this.extractKeywords(description, 'keyword', recommendations, 0.7);

    // 3. 基于网址的关键词匹配（从域名提取）
    if (url) {
      const domainKeywords = this.extractDomainKeywords(url);
      if (domainKeywords.length > 0) {
        domainKeywords.forEach(keyword => {
          this.extractKeywords(keyword, 'keyword', recommendations, 0.8);
        });
      }
    }

    // 4. 基于分类的推荐
    if (category) {
      this.addCategoryTags(category, recommendations, 0.5);
    }

    // 5. AI 增强推荐（如果启用了）
    if (this.aiEnabled && (name || description)) {
      try {
        await this.enhanceWithAI(name, description, recommendations);
      } catch (err) {
        console.warn('HuggingFace AI 推荐失败，使用关键词匹配结果:', err.message);
      }
    }

    // 6. 个性化推荐（如果有用户ID）
    if (userId) {
      try {
        await this.addPersonalizedTags(userId, recommendations);
      } catch (err) {
        console.warn('个性化推荐失败:', err.message);
      }
    }

    // 7. 转换为数组并排序
    const result = Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return result;
  }

  /**
   * 从网址中提取域名关键词
   * @param url 网址
   * @returns 关键词数组
   */
  private extractDomainKeywords(url: string): string[] {
    if (!url) return [];

    try {
      const hostname = new URL(url).hostname;
      // 移除 www 前缀
      const domain = hostname.replace(/^www\./, '');
      // 分割域名（如 deepseek.com -> ['deepseek', 'com']）
      const parts = domain.split('.');
      // 取主域名部分（去掉顶级域名）
      const mainParts = parts.slice(0, -1);
      
      const keywords: string[] = [];
      
      // 添加完整的主域名
      if (mainParts.length > 0) {
        keywords.push(mainParts.join(''));
        // 也添加每个部分
        mainParts.forEach(part => {
          if (part.length > 2) {
            keywords.push(part);
          }
        });
      }

      // 根据域名特征添加额外关键词
      if (domain.endsWith('.ai') || domain.includes('.ai.')) {
        keywords.push('AI');
      }
      if (domain.includes('github')) {
        keywords.push('开源', '代码');
      }
      if (domain.includes('gpt') || domain.includes('chat')) {
        keywords.push('AI', 'ChatGPT');
      }

      return keywords;
    } catch {
      return [];
    }
  }

  /**
   * 使用 HuggingFace AI 增强标签推荐
   * 使用零样本分类（Zero-shot classification）判断文本与标签的相关性
   */
  private async enhanceWithAI(
    name: string,
    description: string,
    recommendations: Map<string, TagRecommendation>,
  ): Promise<void> {
    if (!this.aiEnabled || !this.huggingfaceApiKey) return;

    const text = `${name} ${description}`.trim();
    if (!text) return;

    // 获取所有候选标签
    const allTags = this.getAllTags();
    
    // 零样本分类的候选标签（分批处理，避免太长）
    const candidateTags = allTags.slice(0, 50); // 最多50个候选标签

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.huggingfaceModel}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.huggingfaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            parameters: {
              candidate_labels: candidateTags,
              hypothesis_template: '这个工具是关于{}的',
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HuggingFace API 返回 ${response.status}`);
      }

      const data = await response.json();
      
      // 处理返回结果
      if (data && Array.isArray(data.labels) && Array.isArray(data.scores)) {
        for (let i = 0; i < data.labels.length; i++) {
          const tag = data.labels[i];
          const aiScore = data.scores[i];
          
          // AI 评分的权重设为 0.8，和关键词评分混合
          const existing = recommendations.get(tag);
          if (existing) {
            // 已有关键词匹配的，混合评分
            existing.score = Math.min(1, existing.score + aiScore * 0.5);
            if (aiScore > 0.5) {
              existing.source = 'ai';
            }
          } else if (aiScore > 0.3) {
            // AI 认为相关度超过 30% 的，添加到推荐
            recommendations.set(tag, {
              tag,
              score: aiScore * 0.8,
              source: 'ai',
            });
          }
        }
      }
    } catch (err) {
      console.warn('HuggingFace API 调用失败:', err.message);
      throw err;
    }
  }

  /**
   * 添加个性化推荐标签
   * 基于用户历史使用的标签做推荐
   */
  private async addPersonalizedTags(
    userId: number,
    recommendations: Map<string, TagRecommendation>,
  ): Promise<void> {
    if (!userId) return;

    try {
      // 获取用户的标签使用统计
      const userTagStats = await this.getUserTagStats(userId);
      if (!userTagStats || userTagStats.size === 0) return;

      // 1. 对已推荐的标签，增加个性化权重
      for (const [tag, existing] of recommendations) {
        const userUsage = userTagStats.get(tag);
        if (userUsage) {
          // 用户常用的标签，增加分数
          const boost = Math.min(0.3, userUsage.frequency * 0.1);
          existing.score = Math.min(1, existing.score + boost);
          // 如果个性化权重占比较高，标记来源
          if (boost > 0.15) {
            existing.source = 'personalized';
          }
        }
      }

      // 2. 添加用户常用但还没在推荐列表中的标签
      const sortedUserTags = Array.from(userTagStats.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5); // 最多添加5个用户常用标签

      for (const [tag, stats] of sortedUserTags) {
        if (!recommendations.has(tag) && stats.count >= 2) {
          // 用户使用过至少2次的标签，作为个性化推荐
          recommendations.set(tag, {
            tag,
            score: 0.4 + Math.min(0.2, stats.frequency * 0.05),
            source: 'personalized',
          });
        }
      }
    } catch (err) {
      console.warn('获取用户标签统计失败:', err.message);
    }
  }

  /**
   * 获取用户的标签使用统计
   * @param userId 用户ID
   * @returns Map<标签名, { count: 使用次数, frequency: 频率 }>
   */
  private async getUserTagStats(
    userId: number,
  ): Promise<Map<string, { count: number; frequency: number }>> {
    const tagStats = new Map<string, { count: number; frequency: number }>();

    try {
      // 查询用户的所有自定义工具
      const userTools = await this.toolRepository.find({
        where: { user_id: userId, is_custom: true },
        select: ['tags'],
      });

      if (!userTools || userTools.length === 0) {
        return tagStats;
      }

      // 统计每个标签的使用次数
      let totalTags = 0;
      for (const tool of userTools) {
        if (tool.tags && tool.tags.length > 0) {
          for (const tag of tool.tags) {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              const existing = tagStats.get(trimmedTag);
              if (existing) {
                existing.count++;
              } else {
                tagStats.set(trimmedTag, { count: 1, frequency: 0 });
              }
              totalTags++;
            }
          }
        }
      }

      // 计算频率
      if (totalTags > 0) {
        for (const stats of tagStats.values()) {
          stats.frequency = stats.count / totalTags;
        }
      }

      return tagStats;
    } catch (err) {
      console.warn('查询用户工具标签失败:', err.message);
      return tagStats;
    }
  }

  /**
   * 从文本中提取关键词标签
   */
  private extractKeywords(
    text: string,
    source: 'name' | 'keyword',
    recommendations: Map<string, TagRecommendation>,
    baseScore: number,
  ) {
    if (!text) return;

    this.logger.debug(`开始分析文本: "${text}", 来源: ${source}`);

    for (const { pattern, tags } of this.keywordTags) {
      if (pattern.test(text)) {
        this.logger.debug(`[标签调试 v2] 文本 "${text}" 匹配到正则: ${pattern}, 标签: ${tags.join(', ')}`);
        for (const tag of tags) {
          const existing = recommendations.get(tag);
          if (existing) {
            // 多次匹配，累加分数
            existing.score = Math.min(1, existing.score + baseScore * 0.3);
          } else {
            recommendations.set(tag, {
              tag,
              score: baseScore,
              source,
            });
          }
        }
      }
    }
  }

  /**
   * 添加分类相关标签
   */
  private addCategoryTags(
    category: string,
    recommendations: Map<string, TagRecommendation>,
    baseScore: number,
  ) {
    const tags = this.categoryTags[category];
    if (!tags) return;

    for (const tag of tags) {
      const existing = recommendations.get(tag);
      if (existing) {
        existing.score = Math.min(1, existing.score + baseScore * 0.5);
      } else {
        recommendations.set(tag, {
          tag,
          score: baseScore,
          source: 'category',
        });
      }
    }
  }

  /**
   * 获取所有可用标签（用于自动补全）
   */
  getAllTags(): string[] {
    const tags = new Set<string>();

    // 从分类标签中收集
    for (const categoryTags of Object.values(this.categoryTags)) {
      for (const tag of categoryTags) {
        tags.add(tag);
      }
    }

    // 从关键词标签中收集
    for (const { tags: keywordTags } of this.keywordTags) {
      for (const tag of keywordTags) {
        tags.add(tag);
      }
    }

    return Array.from(tags).sort();
  }
}
