import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getFavorites(req.user.userId);
  }

  @Post(':toolId')
  addFavorite(@Param('toolId', ParseIntPipe) toolId: number, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.addFavorite(req.user.userId, toolId);
  }

  @Delete(':toolId')
  removeFavorite(@Param('toolId', ParseIntPipe) toolId: number, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.removeFavorite(req.user.userId, toolId);
  }
}