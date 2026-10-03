import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { OptionalUserRequest } from '../common/types/authenticated-request';

@Controller('recommendations')
@UseGuards(OptionalJwtAuthGuard)
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get('explained')
  getExplainedRecommendations(
    @Request() req: OptionalUserRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId || null;
    const parsedLimit = limit === undefined ? 6 : Number(limit);
    return this.recommendationsService.getExplainedRecommendations(
      userId,
      parsedLimit,
    );
  }

  @Get()
  getRecommendations(
    @Request() req: OptionalUserRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId || null;
    const parsedLimit = limit === undefined ? 6 : Number(limit);
    return this.recommendationsService.getRecommendations(userId, parsedLimit);
  }
}
