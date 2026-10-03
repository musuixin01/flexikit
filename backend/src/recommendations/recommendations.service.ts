import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool } from '../tools/tool.entity';
import { Favorite } from '../favorites/favorite.entity';
import {
  ToolVectorSearchService,
  type ToolVectorSearchMatch,
} from '../embedding/tool-vector-search.service';

const DEFAULT_RECOMMENDATION_LIMIT = 6;
const MAX_RECOMMENDATION_LIMIT = 20;
const MAX_SEMANTIC_SEEDS = 3;
const VECTOR_EXCLUSION_LIMIT = 100;

export type RecommendationExplanationKind = 'similar_favorite' | 'popular';

export interface RecommendationExplanation {
  kind: RecommendationExplanationKind;
  seedToolName?: string;
}

export interface ExplainedRecommendation {
  tool: Tool;
  explanation: RecommendationExplanation;
}

interface RankedSemanticCandidate {
  tool: Tool;
  similarity: number;
  seedRank: number;
  candidateRank: number;
  seedToolName: string;
}

interface RecommendationCandidate {
  tool: Tool;
  explanation: RecommendationExplanation;
}

function boundedRecommendationLimit(value: number): number {
  if (
    !Number.isInteger(value)
    || value < 1
    || value > MAX_RECOMMENDATION_LIMIT
  ) {
    throw new BadRequestException('推荐数量必须在 1 到 20 之间');
  }
  return value;
}

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolsRepository: Repository<Tool>,
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    private readonly vectorSearch: ToolVectorSearchService,
  ) {}

  async getRecommendations(
    userId: number | null,
    limit: number = DEFAULT_RECOMMENDATION_LIMIT,
  ): Promise<Tool[]> {
    const candidates = await this.getRecommendationCandidates(userId, limit);
    return candidates.map(({ tool }) => tool);
  }

  async getExplainedRecommendations(
    userId: number | null,
    limit: number = DEFAULT_RECOMMENDATION_LIMIT,
  ): Promise<ExplainedRecommendation[]> {
    return this.getRecommendationCandidates(userId, limit);
  }

  private async getRecommendationCandidates(
    userId: number | null,
    limit: number,
  ): Promise<RecommendationCandidate[]> {
    const boundedLimit = boundedRecommendationLimit(limit);
    if (!userId) {
      const popular = await this.getPopularTools(boundedLimit);
      return popular.map((tool) => ({
        tool,
        explanation: { kind: 'popular' },
      }));
    }

    const favoriteRows = await this.favoritesRepository.find({
      where: { user_id: userId },
      select: { tool_id: true },
    });
    const favoriteToolIds = [
      ...new Set(favoriteRows.map((favorite) => favorite.tool_id)),
    ];
    if (favoriteToolIds.length === 0) {
      const popular = await this.getPopularTools(boundedLimit);
      return popular.map((tool) => ({
        tool,
        explanation: { kind: 'popular' },
      }));
    }

    const seeds = await this.favoritesRepository
      .createQueryBuilder('favorite')
      .innerJoinAndSelect('favorite.tool', 'tool')
      .where('favorite.user_id = :userId', { userId })
      .andWhere('tool.user_id IS NULL')
      .orderBy('favorite.created_at', 'DESC')
      .addOrderBy('favorite.id', 'DESC')
      .take(MAX_SEMANTIC_SEEDS)
      .getMany();

    const semantic = await this.getSemanticCandidates(
      seeds,
      favoriteToolIds,
      boundedLimit,
    );
    const selected: RecommendationCandidate[] = semantic
      .slice(0, boundedLimit)
      .map(({ tool, seedToolName }) => ({
        tool,
        explanation: {
          kind: 'similar_favorite',
          seedToolName,
        },
      }));
    if (selected.length >= boundedLimit) {
      return selected;
    }

    const fallback = await this.getPopularTools(
      boundedLimit - selected.length,
      userId,
      selected.map(({ tool }) => tool.id),
    );
    return [
      ...selected,
      ...fallback.map((tool) => ({
        tool,
        explanation: { kind: 'popular' as const },
      })),
    ].slice(0, boundedLimit);
  }

  private async getSemanticCandidates(
    seeds: readonly Favorite[],
    favoriteToolIds: readonly number[],
    limit: number,
  ): Promise<RankedSemanticCandidate[]> {
    if (seeds.length === 0) return [];

    const favoriteIdSet = new Set(favoriteToolIds);
    const queryExclusions = favoriteToolIds.slice(0, VECTOR_EXCLUSION_LIMIT);
    const candidatePoolSize = Math.min(50, Math.max(12, limit * 4));
    const candidates = new Map<number, RankedSemanticCandidate>();

    for (let seedRank = 0; seedRank < seeds.length; seedRank += 1) {
      const seed = seeds[seedRank];
      let matches: ToolVectorSearchMatch[];
      try {
        matches = await this.vectorSearch.searchPublicToolsSimilarToTool(
          seed.tool_id,
          {
            limit: candidatePoolSize,
            excludeToolIds: queryExclusions,
          },
        );
      } catch {
        continue;
      }

      for (
        let candidateRank = 0;
        candidateRank < matches.length;
        candidateRank += 1
      ) {
        const match = matches[candidateRank];
        if (favoriteIdSet.has(match.tool.id)) continue;

        const existing = candidates.get(match.tool.id);
        if (
          !existing
          || match.cosineSimilarity > existing.similarity
          || (
            match.cosineSimilarity === existing.similarity
            && (
              seedRank < existing.seedRank
              || (
                seedRank === existing.seedRank
                && candidateRank < existing.candidateRank
              )
            )
          )
        ) {
          candidates.set(match.tool.id, {
            tool: match.tool,
            similarity: match.cosineSimilarity,
            seedRank,
            candidateRank,
            seedToolName: seed.tool.name.trim().slice(0, 120),
          });
        }
      }
    }

    return [...candidates.values()].sort((left, right) => (
      right.similarity - left.similarity
      || left.seedRank - right.seedRank
      || left.candidateRank - right.candidateRank
      || left.tool.id - right.tool.id
    ));
  }

  private async getPopularTools(
    limit: number,
    excludeFavoriteUserId?: number,
    excludeToolIds: readonly number[] = [],
  ): Promise<Tool[]> {
    const qb = this.toolsRepository.createQueryBuilder('tool');
    qb.where('tool.user_id IS NULL');

    if (excludeFavoriteUserId !== undefined) {
      qb.andWhere(
        'NOT EXISTS (SELECT 1 FROM favorites favorite '
        + 'WHERE favorite.user_id = :favoriteUserId '
        + 'AND favorite.tool_id = tool.id)',
        { favoriteUserId: excludeFavoriteUserId },
      );
    }

    if (excludeToolIds.length > 0) {
      qb.andWhere('tool.id NOT IN (:...excludeToolIds)', {
        excludeToolIds,
      });
    }

    qb.addSelect(
        '(tool.view_count * 0.3 + tool.click_count * 0.4 '
        + '+ tool.favorite_count * 0.3)',
        'hot_score',
      )
      .orderBy('hot_score', 'DESC')
      .addOrderBy('tool.created_at', 'DESC')
      .take(limit);
    return qb.getMany();
  }
}
