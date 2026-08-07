import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Controller('recommendations')
@UseGuards(OptionalJwtAuthGuard)
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get()
  getRecommendations(@Request() req, @Query('limit') limit?: number) {
    const userId = req.user?.userId || null;
    return this.recommendationsService.getRecommendations(userId, limit || 6);
  }
}