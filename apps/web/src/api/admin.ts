import axios from 'axios'
import api from './client'

export type AdminPermission =
  | 'admin.overview.read'
  | 'admin.users.read'
  | 'admin.ai-usage.read'
  | 'admin.audit.read'
  | 'admin.users.status.write'
  | 'admin.users.delete.write'
  | 'admin.users.role.write'

export type AdminAccessMode = 'persistent-admin' | 'bootstrap-admin'
export type AdminUserRole = 'user' | 'admin'
export type AdminUserStatus = 'active' | 'suspended'

export interface AdminAccess {
  userId: number
  username: string
  accessMode: AdminAccessMode
  permissions: AdminPermission[]
}

export type AdminAccessCheckResult =
  | { status: 'allowed'; access: AdminAccess }
  | { status: 'unauthenticated' | 'denied'; access: null }

export interface AdminOverview {
  totalUsers: number
  newUsersLast7Days: number
  totalTools: number
  totalFavorites: number
  activeSessions: number
  activeUsers: number
  suspendedUsers: number
  adminUsers: number
  aiUsageTracking: 'active'
}

export interface AdminUserListItem {
  id: number
  username: string
  email: string
  displayName: string | null
  role: AdminUserRole
  status: AdminUserStatus
  createdAt: string
}

export interface AdminUserSessionSummary {
  clientType: string
  clientName: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  status: 'active' | 'revoked' | 'expired'
}

export interface AdminUserDetail extends AdminUserListItem {
  toolCount: number
  favoriteCount: number
  sessionCount: number
  activeSessionCount: number
  recentSessions: AdminUserSessionSummary[]
}

export interface AdminUserListResult {
  items: AdminUserListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminAiUsageProviderBreakdown {
  providerId: string
  modelId: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: string
  unpricedRequestCount: number
}

export interface AdminAiUsageSummary {
  trackingStatus: 'active'
  source: 'provider-reported'
  pricingCatalogVersion: string
  currency: 'USD'
  costScope: 'token-request-only'
  requestCount: number
  platformRequestCount: number
  byokRequestCount: number
  pricedRequestCount: number
  unpricedRequestCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedInputTokens: number
  reasoningTokens: number
  estimatedCostUsd: string
  platformEstimatedCostUsd: string
  byokEstimatedCostUsd: string
  byProviderModel: AdminAiUsageProviderBreakdown[]
  message: string
}

export interface AdminAuditEventItem {
  id: number
  actorUserId: number
  actorUsername: string
  accessMode: AdminAccessMode
  action: string
  targetUserId: number | null
  targetUsername: string | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
}

export interface AdminAuditEventListResult {
  items: AdminAuditEventItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminDeleteUserResult {
  deletedUserId: number
  username: string
}

export const adminApi = {
  async inspectAccess(): Promise<AdminAccessCheckResult> {
    try {
      const response = await api.get<AdminAccess>('/admin/access')
      return { status: 'allowed', access: response.data }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { status: 'unauthenticated', access: null }
        }
        if (error.response?.status === 403) {
          return { status: 'denied', access: null }
        }
      }
      throw error
    }
  },

  async checkAccess(): Promise<AdminAccess | null> {
    const result = await adminApi.inspectAccess()
    return result.status === 'allowed' ? result.access : null
  },

  getOverview: () => api.get<AdminOverview>('/admin/overview'),

  listUsers: (params: { page: number; pageSize: number; search?: string }) =>
    api.get<AdminUserListResult>('/admin/users', { params }),

  getUserDetail: (userId: number) =>
    api.get<AdminUserDetail>(`/admin/users/${userId}`),

  updateUserStatus: (userId: number, status: AdminUserStatus) =>
    api.patch<AdminUserDetail>(`/admin/users/${userId}/status`, { status }),

  updateUserRole: (userId: number, role: AdminUserRole) =>
    api.patch<AdminUserDetail>(`/admin/users/${userId}/role`, { role }),

  deleteUser: (userId: number, confirmationUsername: string) =>
    api.delete<AdminDeleteUserResult>(`/admin/users/${userId}`, {
      data: { confirmationUsername },
    }),

  listAuditEvents: (params: { page: number; pageSize: number }) =>
    api.get<AdminAuditEventListResult>('/admin/audit-events', { params }),

  getAiUsageStatus: () =>
    api.get<AdminAiUsageSummary>('/admin/ai-usage'),
}
