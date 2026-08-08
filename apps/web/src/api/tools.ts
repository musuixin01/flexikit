import api from './index';
import type { WebsitePreview } from '@/types/tool';

export const toolsApi = {
  getTools: (params?: any) => api.get('/tools', { params }),
  getTool: (id: number) => api.get(`/tools/${id}`),
  createTool: (data: any) => api.post('/tools', data),
  updateTool: (id: number, data: any) => api.put(`/tools/${id}`, data),
  deleteTool: (id: number) => api.delete(`/tools/${id}`),
  deleteBatch: (ids: number[]) => api.delete('/tools/batch', { data: { ids } }),
  openTool: (id: number, fallbackPath?: string) =>
    api.post(`/tools/${id}/open`, null, { params: fallbackPath ? { path: fallbackPath } : {} }),
  getLocalIcon: (filePath: string) =>
    api.get('/tools/local-icon', { params: { path: filePath } }),
  getWebsitePreview: (url: string) =>
    api.get<WebsitePreview>('/tools/preview', { params: { url } }),
};
