import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.userId);
  }

  @Post(':toolId')
  addFavorite(@Param('toolId') toolId: number, @Request() req) {
    return this.favoritesService.addFavorite(req.user.userId, toolId);
  }

  @Delete(':toolId')
  removeFavorite(@Param('toolId') toolId: number, @Request() req) {
    return this.favoritesService.removeFavorite(req.user.userId, toolId);
  }
}