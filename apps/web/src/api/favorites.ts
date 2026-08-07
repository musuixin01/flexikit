import api from './index';

export const favoritesApi = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (toolId: number) => api.post(`/favorites/${toolId}`),
  removeFavorite: (toolId: number) => api.delete(`/favorites/${toolId}`),
};
