<template>
  <div :class="['top-navbar', { visible: showMobileNavBar }]" id="topNavbar">
    <div class="nav-left">
      <!-- Logo 区域：forceShowLogo 为 true 或满足条件时显示 -->
      <div
        class="nav-logo-wrapper"
        id="navLogoWrapper"
        :style="{ display: showNavLogo ? 'flex' : 'none' }"
      >
        <img src="/icon/icon_256x256.ico" alt="FlexiKit" class="nav-logo-img">
        <span class="nav-logo-text">FlexiKit</span>
      </div>
      <div class="nav-links">
        <router-link to="/app" class="nav-link">首页</router-link>
        <router-link to="/discover" class="nav-link">发现</router-link>
        <router-link to="/about" class="nav-link">产品介绍</router-link>
      </div>
    </div>

    <div class="nav-right">
      <!-- 搜索框 -->
      <div class="nav-search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          id="navSearchInput"
          :value="ui.searchQuery"
          @input="onNavSearch"
          placeholder="搜索工具…"
          autocomplete="off"
        >
      </div>

      <!-- 主题切换 -->
      <button class="nav-icon" id="navThemeToggle" @click="onToggleTheme" aria-label="主题切换">
        {{ themeIconText }}
      </button>

      <!-- 设置按钮 -->
      <button class="nav-icon" @click="ui.toggleSettingsPanel()" aria-label="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      <!-- 收藏 -->
      <button class="nav-icon" id="navFavBtn" v-if="showFavorites" @click="onToggleFav">
        ⭐ <span id="navFavCount">{{ tools.favoriteTools.size }}</span>
      </button>

      <!-- 用户区 -->
      <div v-if="user.isLoggedIn" class="user-menu-wrapper" ref="userMenuRef">
        <button class="nav-icon user-avatar-btn" @click="showUserMenu = !showUserMenu">
          <span v-if="user.profile?.avatarType === 'emoji'" class="user-avatar-emoji">
            {{ user.profile?.avatar || '👤' }}
          </span>
          <img
            v-else-if="user.profile?.avatarType === 'upload' && user.profile?.avatar?.startsWith('data:image')"
            :src="user.profile.avatar"
            class="user-avatar-img"
            alt="avatar"
          >
          <span v-else class="user-avatar-emoji">👤</span>
          <span style="font-size:.75rem;">{{ user.displayName || user.profile?.username }}</span>
        </button>

        <!-- 下拉菜单 -->
        <div v-if="showUserMenu" class="user-dropdown">
          <div class="dropdown-header">
            <span v-if="user.profile?.avatarType === 'emoji'" style="font-size:28px;">
              {{ user.profile?.avatar || '👤' }}
            </span>
            <img
              v-else-if="user.profile?.avatarType === 'upload' && user.profile?.avatar?.startsWith('data:image')"
              :src="user.profile.avatar"
              style="width:36px;height:36px;border-radius:50%;object-fit:cover;"
            >
            <span v-else style="font-size:28px;">👤</span>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:var(--text-primary);">
                {{ user.displayName || user.profile?.username }}
              </div>
              <div style="font-size:.68rem;color:var(--text-tertiary);">
                @{{ user.profile?.username }}
              </div>
            </div>
          </div>
          <button class="dropdown-item-btn" @click="goProfile">👤 个人中心</button>
          <button class="dropdown-item-btn" @click="openProfile">✨ 编辑资料</button>
          <button class="dropdown-item-btn" @click="handleLogout">🚪 退出登录</button>
        </div>
      </div>

      <!-- 未登录：显示登录按钮 -->
      <router-link v-else to="/login" class="nav-icon" style="text-decoration:none;">
        👤 登录
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToolsStore } from '@/stores/tools'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'

// ========== Props ==========
const props = defineProps<{
  forceShowLogo?: boolean  // 强制显示 Logo（用于无侧边栏页面）
  showSearch?: boolean     // 是否显示搜索框
  showFavorites?: boolean  // 是否显示收藏按钮
  showNavLinks?: boolean   // 是否显示导航链接
}>()

// 默认值
const showSearch = computed(() => props.showSearch !== false)
const showFavorites = computed(() => props.showFavorites !== false)
const showNavLinks = computed(() => props.showNavLinks !== false)

const tools = useToolsStore()
const ui = useUiStore()
const user = useUserStore()
const router = useRouter()

// ========== 状态 ==========
const themeIconText = ref('🌙')
const showMobileNavBar = ref(true)
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// ========== Logo 显示逻辑 ==========
const showNavLogo = computed(() => {
  if (props.forceShowLogo) return true
  return ui.isMobile || ui.sidebarCollapsed
})

// ========== 搜索 ==========
function onNavSearch(e: Event) {
  const val = (e.target as HTMLInputElement).value
  ui.searchQuery = val
}

// ========== 主题 ==========
function updateThemeIcon() {
  let theme = document.documentElement.getAttribute('data-theme') || 'auto'
  let effective = theme
  if (theme === 'auto') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  themeIconText.value = effective === 'dark' ? '🌙' : '☀️'
}

function onToggleTheme() {
  let current = document.documentElement.getAttribute('data-theme') || 'auto'
  let currentEff = current === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : current
  const newTheme = currentEff === 'dark' ? 'light' : 'dark'
  ui.setTheme(newTheme as 'light' | 'dark')
  updateThemeIcon()
}

// ========== 收藏 ==========
function onToggleFav() {
  ui.showOnlyFav = !ui.showOnlyFav
  ui.showToast(ui.showOnlyFav ? '仅显示收藏的工具' : '已显示全部工具')
}

// ========== 用户菜单 ==========
function goProfile() {
  showUserMenu.value = false
  router.push('/profile')
}

function openProfile() {
  showUserMenu.value = false
  router.push('/login?tab=profile')
}

function handleLogout() {
  showUserMenu.value = false
  user.logout()
  ui.showToast('已退出登录')
  router.push('/login')
}

// 点击外部关闭下拉菜单
function onClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    showUserMenu.value = false
  }
}

// ========== 移动端滚动控制 ==========
function handleScroll() {
  if (!ui.isMobile) {
    showMobileNavBar.value = true
    return
  }
  const sidebar = document.getElementById('sidebar')
  if (!sidebar) return
  const scrollY = window.scrollY || window.pageYOffset || 0
  if (!sidebar.classList.contains('collapsed')) {
    showMobileNavBar.value = scrollY > 300
  } else {
    showMobileNavBar.value = true
  }
}

// ========== 生命周期 ==========
let observer: MutationObserver | null = null
let darkMediaQuery: MediaQueryList | null = null

onMounted(() => {
  updateThemeIcon()
  handleScroll()

  observer = new MutationObserver(updateThemeIcon)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkMediaQuery.addEventListener('change', () => {
    if (document.documentElement.getAttribute('data-theme') === 'auto') {
      updateThemeIcon()
    }
  })

  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('touchmove', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll)
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (darkMediaQuery) darkMediaQuery.removeEventListener('change', () => {})
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('touchmove', handleScroll)
  window.removeEventListener('resize', handleScroll)
  document.removeEventListener('click', onClickOutside)
})

// 监听侧边栏折叠变化
watch(() => ui.sidebarCollapsed, () => {
  nextTick(handleScroll)
})
</script>

<style scoped>
.top-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 8px 20px;
  margin-bottom: 20px;
  height: 56px;
  box-shadow: var(--glass-shadow);
  position: sticky;
  top: 0;
  z-index: 20;
  transition: opacity 0.3s ease;
}

/* 移动端隐藏 */
@media (max-width: 860px) {
  .top-navbar {
    display: none;
    margin-bottom: 12px;
  }
  .top-navbar.visible {
    display: flex;
    flex-wrap: wrap;
    height: auto;
    padding: 12px 16px;
    gap: 12px;
    border-radius: 16px;
  }
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-logo-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-logo-img {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}
.nav-logo-text {
  font-size: 1.2rem;
  font-weight: 700;
  background: var(--logo-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: -0.5px;
}
.nav-links {
  display: flex;
  gap: 8px;
}
.nav-link {
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 10px;
  transition: all 0.2s;
}
.nav-link:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.nav-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-search-wrapper {
  position: relative;
  width: 220px;
}
.nav-search-wrapper .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
}
#navSearchInput {
  width: 100%;
  height: 36px;
  border: none;
  background: var(--input-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 0 12px 0 36px;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: all 0.2s;
}
#navSearchInput:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  outline: none;
}
.nav-icon {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.nav-icon:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
#navFavCount {
  font-size: 0.7rem;
  background: var(--accent);
  color: #fff;
  border-radius: 20px;
  padding: 0 5px;
  min-width: 18px;
  text-align: center;
  margin-left: 2px;
}

/* ===== 用户头像 ===== */
.user-menu-wrapper {
  position: relative;
}
.user-avatar-btn {
  gap: 6px;
  padding: 4px 12px 4px 8px;
}
.user-avatar-emoji {
  font-size: 1.4rem;
  line-height: 1;
}
.user-avatar-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

/* ===== 用户下拉菜单 ===== */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--modal-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 8px 0;
  box-shadow: var(--card-hover-shadow);
  z-index: 100;
  animation: dropdownIn 0.2s ease;
}
@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 14px 16px;
  border-bottom: 1px solid var(--divider);
}
.dropdown-item-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 16px;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}
.dropdown-item-btn:hover {
  background: var(--accent-soft);
  color: var(--text-primary);
}

/* ===== 响应式 ===== */
@media (max-width: 860px) {
  .nav-left {
    gap: 12px;
  }
  .nav-logo-text {
    font-size: 1rem;
  }
  .nav-search-wrapper {
    width: 180px;
  }
  .nav-icon {
    padding: 4px 12px;
  }
}
@media (max-width: 640px) {
  .nav-right {
    gap: 8px;
  }
  .nav-search-wrapper {
    width: 140px;
  }
}
</style>