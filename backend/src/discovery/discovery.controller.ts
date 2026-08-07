import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  /**
   * 获取发现工具列表
   */
  @Get()
  findAll(@Query() query) {
    return this.discoveryService.findAll(query);
  }

  /**
   * 获取推荐工具
   */
  @Get('recommendations')
  getRecommendations(
    @Query('limit') limit: number,
    @Query('source') source: string,
  ) {
    return this.discoveryService.getRecommendations(limit || 6, source);
  }

  /**
   * 获取排行榜
   */
  @Get('rankings')
  getRankings(
    @Query('period') period: string,
    @Query('limit') limit: number,
    @Query('source') source: string,
  ) {
    return this.discoveryService.getRankings(period || 'all', limit || 10, source);
  }

  /**
   * 获取最新发现
   */
  @Get('latest')
  getLatest(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Query('source') source: string,
  ) {
    return this.discoveryService.getLatest(limit || 10, offset || 0, source);
  }

  /**
   * 获取所有来源平台
   */
  @Get('sources')
  getSources() {
    return this.discoveryService.getSources();
  }
}
