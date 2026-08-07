import api from './index';

export const categoriesApi = {
  getCategories: () => api.get('/categories'),
  createCategory: (data: { name: string; icon?: string }) => api.post('/categories', data),
  updateCategory: (id: number, data: { name?: string; icon?: string }) => api.put(`/categories/${id}`, data),
  updateOrder: (order: string[]) => api.put('/categories/order', { order }),
};
