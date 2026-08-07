import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Tool } from '../tools/tool.entity';
import { Favorite } from '../favorites/favorite.entity';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Tool)
    private toolsRepository: Repository<Tool>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
  ) {}

  async getRecommendations(userId: number | null, limit: number = 6): Promise<Tool[]> {
    // 未登录或没有收藏时，返回热门工具
    if (!userId) {
      return this.getPopularTools(limit);
    }

    const favs = await this.favoritesRepository.find({
      where: { user_id: userId },
      relations: ['tool'],
      take: 3,
      order: { created_at: 'DESC' },
    });

    if (favs.length === 0) {
      return this.getPopularTools(limit);
    }

    // TODO: 使用 pgvector 相似度查询
    // 暂时返回热门工具（排除已收藏的）
    const favoriteToolIds = favs.map(f => f.tool_id);
    const qb = this.toolsRepository.createQueryBuilder('tool');
    qb.where('tool.user_id IS NULL');
    if (favoriteToolIds.length > 0) {
      qb.andWhere('tool.id NOT IN (:...ids)', { ids: favoriteToolIds });
    }
    qb.orderBy('tool.created_at', 'DESC')
      .take(limit);
    return qb.getMany();
  }

  private async getPopularTools(limit: number): Promise<Tool[]> {
    // 按热度排序（浏览 + 点击 + 收藏）
    const qb = this.toolsRepository.createQueryBuilder('tool');
    qb.where('tool.user_id IS NULL')
      .addSelect('(tool.view_count * 0.3 + tool.click_count * 0.4 + tool.favorite_count * 0.3)', 'hot_score')
      .orderBy('hot_score', 'DESC')
      .addOrderBy('tool.created_at', 'DESC')
      .take(limit);
    return qb.getMany();
  }
}