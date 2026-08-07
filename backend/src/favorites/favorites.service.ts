import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    private toolsService: ToolsService,
  ) {}

  async getFavorites(userId: number): Promise<number[]> {
    const favs = await this.favoritesRepository.find({
      where: { user_id: userId },
      select: ['tool_id'] as any,
    });
    return favs.map(f => f.tool_id);
  }

  async addFavorite(userId: number, toolId: number): Promise<void> {
    const existing = await this.favoritesRepository.findOne({
      where: { user_id: userId, tool_id: toolId },
    });
    if (existing) return;
    const fav = this.favoritesRepository.create({ user_id: userId, tool_id: toolId });
    await this.favoritesRepository.save(fav);
    // 收藏计数 +1
    await this.toolsService.incrementFavorite(toolId, 1);
  }

  async removeFavorite(userId: number, toolId: number): Promise<void> {
    await this.favoritesRepository.delete({ user_id: userId, tool_id: toolId });
    // 收藏计数 -1
    await this.toolsService.incrementFavorite(toolId, -1);
  }

  async isFavorite(userId: number, toolId: number): Promise<boolean> {
    const count = await this.favoritesRepository.count({
      where: { user_id: userId, tool_id: toolId },
    });
    return count > 0;
  }
}