import api from './client';
import type { WebsitePreview } from '@/types/tool';
import type { BackendTool } from './toolMapper';

export interface ToolsQueryParams {
  category?: string;
  search?: string;
  favorite?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateToolInput {
  name: string;
  url?: string;
  local_path?: string | null;
  description?: string;
  tags?: string[];
  category?: string;
  icon?: string;
  card_color?: string | null;
}

export type UpdateToolInput = Partial<CreateToolInput>;

export interface TagRecommendation {
  tag: string;
  score: number;
  source: 'category' | 'keyword' | 'name' | 'ai' | 'personalized';
}

interface ToolsListResponse {
  items: BackendTool[];
  total: number;
}

export const toolsApi = {
  getTools: (params?: ToolsQueryParams) => api.get<ToolsListResponse>('/tools', { params }),
  getRankings: (period: 'today' | 'week' | 'month' = 'week', limit = 12) =>
    api.get<BackendTool[]>('/tools/rankings', { params: { period, limit } }),
  getTool: (id: number) => api.get<BackendTool>(`/tools/${id}`),
  createTool: (data: CreateToolInput) => api.post<BackendTool>('/tools', data),
  updateTool: (id: number, data: UpdateToolInput) => api.put<BackendTool>(`/tools/${id}`, data),
  deleteTool: (id: number) => api.delete<void>(`/tools/${id}`),
  deleteBatch: (ids: number[]) => api.delete<void>('/tools/batch', { data: { ids } }),
  getLocalIcon: (filePath: string) =>
    api.get<{ icon: string | null }>('/tools/local-icon', { params: { path: filePath } }),
  getWebsitePreview: (url: string) =>
    api.get<WebsitePreview>('/tools/preview', { params: { url } }),
  recommendTags: (params: {
    name: string;
    description: string;
    url?: string;
    category?: string;
    limit?: number;
  }) => api.get<TagRecommendation[]>('/tools/recommend-tags', { params }),
};
