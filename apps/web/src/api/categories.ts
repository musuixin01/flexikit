import api from './client';

export interface CategoryResponse {
  id: number;
  user_id: number | null;
  name: string;
  display_order: number;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export const categoriesApi = {
  getCategories: () => api.get<CategoryResponse[]>('/categories'),
  createCategory: (data: CreateCategoryInput) => api.post<CategoryResponse>('/categories', data),
  updateCategory: (id: number, data: UpdateCategoryInput) => api.put<CategoryResponse>(`/categories/${id}`, data),
  updateOrder: (order: number[]) => api.put<void>('/categories/order', { order }),
};
