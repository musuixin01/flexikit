import type { Tool } from './tool'

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface FavoriteResponse {
  id: number
  toolId: number
  tool: Tool
}
