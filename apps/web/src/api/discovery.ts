import api from './index';

export interface DiscoveryTool {
  id: number;
  name: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  source: string;
  source_url: string;
  hot_score: number;
  upvotes: number;
  comments: number;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

export const discoveryApi = {
  // 获取发现工具列表
  getTools: (params?: {
    source?: string;
    category?: string;
    search?: string;
    sort?: 'hot' | 'new' | 'upvotes';
    limit?: number;
    offset?: number;
  }) => api.get('/discovery', { params }),

  // 智能推荐
  getRecommendations: (limit: number = 6, source?: string) =>
    api.get('/discovery/recommendations', { params: { limit, source } }),

  // 排行榜
  getRankings: (period: string = 'all', limit: number = 10, source?: string) =>
    api.get('/discovery/rankings', { params: { period, limit, source } }),

  // 最新发现
  getLatest: (limit: number = 10, offset: number = 0, source?: string) =>
    api.get('/discovery/latest', { params: { limit, offset, source } }),

  // 获取所有来源平台
  getSources: () => api.get('/discovery/sources'),
};
