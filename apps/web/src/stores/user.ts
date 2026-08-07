import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { useToolsStore } from '@/stores/tools'

export interface UserProfile {
  id: number
  username: string
  email: string
  displayName: string
  avatar: string
  avatarType: 'upload' | 'preset' | 'emoji'
  created_at: string
}

/** 本地只缓存非敏感的用户资料，不存储密码 */
interface LocalProfileCache {
  email?: string
  displayName?: string
  avatar?: string
  avatarType?: 'upload' | 'preset' | 'emoji'
  created_at?: string
}

function safeParseProfiles(raw: string | null): Record<string, LocalProfileCache> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const LOCAL_PROFILE_KEY = 'flexikit-profiles'
const TOKEN_KEY = 'token'

export const PRESET_AVATARS = [
  { id: 'emoji-1', label: '😯', type: 'emoji' as const },
  { id: 'emoji-2', label: '😐', type: 'emoji' as const },
  { id: 'emoji-3', label: '😗', type: 'emoji' as const },
  { id: 'emoji-4', label: '😣', type: 'emoji' as const },
  { id: 'emoji-5', label: '😃', type: 'emoji' as const },
  { id: 'emoji-6', label: '😦', type: 'emoji' as const },
  { id: 'emoji-7', label: '😛', type: 'emoji' as const },
  { id: 'emoji-8', label: '😮', type: 'emoji' as const },
  { id: 'emoji-9', label: '😕', type: 'emoji' as const },
  { id: 'emoji-10', label: '😶', type: 'emoji' as const },
  { id: 'emoji-11', label: '😓', type: 'emoji' as const },
  { id: 'emoji-12', label: '😩', type: 'emoji' as const },
  { id: 'emoji-13', label: '🤤', type: 'emoji' as const },
  { id: 'emoji-14', label: '🤓', type: 'emoji' as const },
  { id: 'emoji-15', label: '🤠', type: 'emoji' as const },
  { id: 'emoji-16', label: '🤡', type: 'emoji' as const },
  { id: 'emoji-17', label: '🥳', type: 'emoji' as const },
  { id: 'emoji-18', label: '🤩', type: 'emoji' as const },
  { id: 'emoji-19', label: '🧐', type: 'emoji' as const },
  { id: 'emoji-20', label: '😺', type: 'emoji' as const },
]

export const PRESET_GRADIENT_AVATARS = [
  { id: 'grad-1', colors: ['#0071e3', '#5e5ce6'] },
  { id: 'grad-2', colors: ['#ff375f', '#ff9f0a'] },
  { id: 'grad-3', colors: ['#34c759', '#30b0c7'] },
  { id: 'grad-4', colors: ['#af52de', '#5e5ce6'] },
  { id: 'grad-5', colors: ['#ff6b35', '#ff375f'] },
  { id: 'grad-6', colors: ['#0db7ed', '#0071e3'] },
]

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const profile = ref<UserProfile | null>(null)
  const isLoggedIn = ref(false)
  /** 本地只缓存非敏感的用户资料，不存储密码 */
  const profileCache = ref<Record<string, LocalProfileCache>>(
    safeParseProfiles(localStorage.getItem(LOCAL_PROFILE_KEY))
  )

  const displayName = computed(() => profile.value?.displayName || profile.value?.username || '用户')
  const avatarDisplay = computed(() => {
    if (!profile.value) return '👤'
    if (profile.value.avatarType === 'emoji') return profile.value.avatar
    if (profile.value.avatarType === 'upload' && profile.value.avatar.startsWith('data:image')) {
      return profile.value.avatar
    }
    return profile.value.avatar || '👤'
  })

  function persistProfileCache() {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profileCache.value))
  }

  function isNetworkError(err: unknown): boolean {
    const e = err as { response?: unknown; code?: string }
    return !e?.response || e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED'
  }

  function formatErrorMessage(message: unknown): string {
    if (!message) return ''
    if (Array.isArray(message)) {
      return message.join('、')
    }
    if (typeof message === 'string') {
      return message
    }
    return '操作失败'
  }

  async function init() {
    if (!token.value) {
      isLoggedIn.value = false
      profile.value = null
      return
    }

    try {
      const res = await usersApi.getProfile()
      profile.value = res.data
      isLoggedIn.value = true
      if (profile.value) {
        // 只缓存非敏感信息
        profileCache.value[profile.value.username] = {
          email: profile.value.email,
          displayName: profile.value.displayName,
          avatar: profile.value.avatar,
          avatarType: profile.value.avatarType,
          created_at: profile.value.created_at,
        }
        persistProfileCache()
      }
    } catch (err) {
      // Token 无效或网络错误，清除登录状态
      token.value = null
      localStorage.removeItem(TOKEN_KEY)
      isLoggedIn.value = false
      profile.value = null
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authApi.login(username, password)
      const accessToken = res.data.access_token
      token.value = accessToken
      localStorage.setItem(TOKEN_KEY, accessToken)

      const userRes = await usersApi.getProfile()
      profile.value = userRes.data
      isLoggedIn.value = true
      if (profile.value) {
        // 只缓存非敏感信息，不存储密码
        profileCache.value[profile.value.username] = {
          email: profile.value.email,
          displayName: profile.value.displayName,
          avatar: profile.value.avatar,
          avatarType: profile.value.avatarType,
          created_at: profile.value.created_at,
        }
        persistProfileCache()
      }

      // 登录成功后，从后端加载用户的工具数据
      const toolsStore = useToolsStore()
      toolsStore.loadFromBackend().catch(() => {
        // 静默处理工具加载失败，不影响登录
      })

      return { success: true }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return {
        success: false,
        error: isNetworkError(err)
          ? '网络连接失败，请检查网络后重试'
          : formatErrorMessage(e.response?.data?.message) || '登录失败，请检查用户名和密码',
      }
    }
  }

  async function register(
    username: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authApi.register(username, email, password)
      const accessToken = res.data.access_token
      token.value = accessToken
      localStorage.setItem(TOKEN_KEY, accessToken)

      const userRes = await usersApi.getProfile()
      profile.value = userRes.data
      isLoggedIn.value = true
      if (profile.value) {
        // 只缓存非敏感信息，不存储密码
        profileCache.value[profile.value.username] = {
          email: profile.value.email,
          displayName: profile.value.displayName,
          avatar: profile.value.avatar,
          avatarType: profile.value.avatarType,
          created_at: profile.value.created_at,
        }
        persistProfileCache()
      }

      if (displayName && profile.value) {
        await usersApi.updateProfile({ displayName })
        profile.value = { ...profile.value, displayName }
        profileCache.value[profile.value.username] = {
          ...profileCache.value[profile.value.username],
          displayName,
        }
        persistProfileCache()
      }

      // 注册成功后，从后端加载用户的工具数据
      const toolsStore = useToolsStore()
      toolsStore.loadFromBackend().catch(() => {
        // 静默处理工具加载失败，不影响注册
      })

      return { success: true }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return {
        success: false,
        error: isNetworkError(err)
          ? '网络连接失败，请检查网络后重试'
          : formatErrorMessage(e.response?.data?.message) || '注册失败',
      }
    }
  }

  function logout() {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    isLoggedIn.value = false
    profile.value = null

    const toolsStore = useToolsStore()
    toolsStore.clearUserData()
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!isLoggedIn.value || !profile.value) {
      return { success: false, error: '请先登录' }
    }

    try {
      const res = await usersApi.updateProfile(updates)
      profile.value = res.data
      if (profile.value) {
        profileCache.value[profile.value.username] = {
          email: profile.value.email,
          displayName: profile.value.displayName,
          avatar: profile.value.avatar,
          avatarType: profile.value.avatarType,
          created_at: profile.value.created_at,
        }
        persistProfileCache()
      }
      return { success: true }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return {
        success: false,
        error: isNetworkError(err)
          ? '网络连接失败，修改未保存'
          : (e.response?.data?.message as string) || '更新资料失败',
      }
    }
  }

  async function setAvatar(data: string, type: 'upload' | 'preset' | 'emoji') {
    return updateProfile({ avatar: data, avatarType: type })
  }

  init()

  return {
    token,
    profile,
    isLoggedIn,
    displayName,
    avatarDisplay,
    login,
    register,
    logout,
    updateProfile,
    setAvatar,
    init,
  }
})
