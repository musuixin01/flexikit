import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Response } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { TagRecommendationService } from './tag-recommendation.service';
import { Response as ExpressResponse, Request as ExpressRequest } from 'express';

interface UserInfo {
  userId: number;
  username: string;
}

interface UserRequest extends ExpressRequest {
  user?: UserInfo;
}

@Controller('tools')
export class ToolsController {
  constructor(
    private toolsService: ToolsService,
    private tagRecommendationService: TagRecommendationService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Request() req: UserRequest, @Query() query: any) {
    // 未登录只返回内置工具；已登录返回内置工具 + 当前用户自定义工具。
    const userId = req.user?.userId || null;
    return this.toolsService.findAll(userId, query);
  }

  @Get('rankings')
  getRankings(@Query('period') period: string, @Query('limit') limit: number) {
    return this.toolsService.getRankings(period || 'today', limit || 10);
  }

  /**
   * 智能标签推荐
   * 根据工具名称、描述和网址自动推荐标签
   * 登录用户会基于历史使用习惯做个性化推荐
   */
  @Get('recommend-tags')
  @UseGuards(OptionalJwtAuthGuard)
  async recommendTags(
    @Request() req: UserRequest,
    @Query('name') name: string,
    @Query('description') description: string,
    @Query('url') url?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.userId || null;
    return this.tagRecommendationService.recommendTags(
      name || '',
      description || '',
      category,
      limit ? Number(limit) : 8,
      userId ?? undefined,
      url || '',
    );
  }

  /**
   * 获取所有可用标签（用于自动补全）
   */
  @Get('all-tags')
  getAllTags() {
    return this.tagRecommendationService.getAllTags();
  }

  // 公开端点：获取网站 favicon（后端解析，更稳定）
  @Get('favicon')
  async getFavicon(@Query('url') siteUrl: string, @Response() res: ExpressResponse) {
    if (!siteUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const result = await this.toolsService.getFavicon(siteUrl);
      if (result) {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存 1 天
        return res.send(result.data);
      }
    } catch {
      // 由下方统一返回 404，让前端继续尝试其他图标源。
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(404).end();
  }

  // 获取本地文件图标（需登录，仅用于自定义本地工具）
  @Get('local-icon')
  @UseGuards(JwtAuthGuard)
  async getLocalIcon(@Query('path') filePath: string) {
    return this.toolsService.getLocalIcon(filePath);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.toolsService.findOne(id);
  }

  // 以下操作需要登录，保留守卫
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateToolDto, @Request() req: UserRequest) {
    return this.toolsService.create(createDto, req.user!.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: number, @Body() updateDto: UpdateToolDto, @Request() req: UserRequest) {
    return this.toolsService.update(id, updateDto, req.user!.userId);
  }

  // 公开端点：打开工具
  @Post(':id/open')
  async openTool(@Param('id') id: number, @Query('path') fallbackPath?: string) {
    return this.toolsService.openTool(id, 0, fallbackPath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: number, @Request() req: UserRequest) {
    return this.toolsService.delete(id, req.user!.userId);
  }

  @Delete('batch')
  @UseGuards(JwtAuthGuard)
  deleteBatch(@Body('ids') ids: number[], @Request() req: UserRequest) {
    return this.toolsService.deleteBatch(ids, req.user!.userId);
  }
}
