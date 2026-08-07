import api from './index';

export const statsApi = {
  recordView: (toolId: number) =>
    api.post('/stats/view', { toolId }),

  recordClick: (toolId: number) =>
    api.post('/stats/click', { toolId }),

  recordSearch: (query: string) =>
    api.post('/stats/search', { query }),

  recordFavorite: (toolId: number, isFav: boolean) =>
    api.post('/stats/favorite', { toolId, isFav }),
};
