import api from './client'
import type { BackendTool } from './toolMapper'

export interface RecommendationExplanation {
  kind: 'similar_favorite' | 'popular'
  seedToolName?: string
}

export interface ExplainedRecommendation {
  tool: BackendTool
  explanation: RecommendationExplanation
}

export const recommendationsApi = {
  getRecommendations: (limit = 6) =>
    api.get<BackendTool[]>('/recommendations', { params: { limit } }),
  getExplainedRecommendations: (limit = 6) =>
    api.get<ExplainedRecommendation[]>('/recommendations/explained', {
      params: { limit },
    }),
}
