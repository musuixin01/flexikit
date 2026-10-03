import api from './client';

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  avatarType: 'upload' | 'preset' | 'emoji';
  created_at: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatar?: string;
  avatarType?: 'upload' | 'preset' | 'emoji';
  email?: string;
}

export interface ServerDataExport {
  schemaVersion: 1;
  exportedAt: string;
  account: {
    id: number;
    username: string;
    email: string;
    displayName: string | null;
    avatar: string | null;
    avatarType: 'upload' | 'preset' | 'emoji' | null;
    createdAt: string;
  };
  tools: Array<{
    id: number;
    name: string;
    url: string;
    description: string | null;
    tags: string[] | null;
    category: string | null;
    icon: string | null;
    isCustom: boolean;
    localPath: string | null;
    cardColor: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  favorites: Array<{
    id: number;
    toolId: number;
    createdAt: string;
  }>;
  toolOrders: Array<{
    id: number;
    orderedIds: number[];
  }>;
  categories: Array<{
    id: number;
    name: string;
    displayOrder: number;
    createdAt: string;
  }>;
  authSessions: Array<{
    sessionId: string;
    clientType: string;
    clientInstanceId: string | null;
    clientName: string | null;
    expiresAt: string;
    revokedAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
  }>;
}

export const usersApi = {
  getProfile: () => api.get<UserProfileResponse>('/users/profile'),
  updateProfile: (data: UpdateProfileInput) => api.put<UserProfileResponse>('/users/profile', data),
  exportData: () => api.get<ServerDataExport>('/users/export-data'),
  deleteAccount: (confirmation: 'DELETE') => api.delete<{ message: string }>('/users/account', {
    data: { confirmation },
  }),
};
