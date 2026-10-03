import api from './client';

export const favoritesApi = {
  getFavorites: () => api.get<number[]>('/favorites'),
  addFavorite: (toolId: number) => api.post<void>(`/favorites/${toolId}`),
  removeFavorite: (toolId: number) => api.delete<void>(`/favorites/${toolId}`),
};
