export interface User {
  id: number
  username: string
  email: string
  displayName?: string
  avatar?: string
  avatarType?: 'upload' | 'preset' | 'emoji'
  created_at?: string
}

export interface AuthResponse {
  access_token: string
  user: User
}
