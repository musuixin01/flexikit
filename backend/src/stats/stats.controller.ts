import { Controller, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ToolsService } from '../tools/tools.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  private readonly logger = new Logger(StatsController.name);
  constructor(private toolsService: ToolsService) {}

  @Post('view')
  async recordView(@Body('toolId') toolId: number) {
    await this.toolsService.incrementView(toolId);
    return { success: true };
  }

  @Post('click')
  async recordClick(@Body('toolId') toolId: number) {
    await this.toolsService.incrementClick(toolId);
    return { success: true };
  }

  @Post('search')
  recordSearch(@Body('query') query: string, @Request() req) {
    this.logger.log(`User ${req.user.userId} searched: ${query}`);
    return { success: true };
  }

  @Post('favorite')
  async recordFavorite(@Body('toolId') toolId: number, @Body('isFav') isFav: boolean) {
    await this.toolsService.incrementFavorite(toolId, isFav ? 1 : -1);
    return { success: true };
  }
}