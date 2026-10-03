import api from './client';

interface StatsMutationResponse {
  success: boolean;
}

export const statsApi = {
  recordView: (toolId: number) =>
    api.post<StatsMutationResponse>('/stats/view', { toolId }),

  recordClick: (toolId: number) =>
    api.post<StatsMutationResponse>('/stats/click', { toolId }),

  recordSearch: (query: string) =>
    api.post<StatsMutationResponse>('/stats/search', { query }),

  recordFavorite: (toolId: number, isFav: boolean) =>
    api.post<StatsMutationResponse>('/stats/favorite', { toolId, isFav }),
};
