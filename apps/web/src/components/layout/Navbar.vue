<template>
  <div :class="['top-navbar', { visible: showMobileNavBar }]" id="topNavbar">
    <div class="nav-left">
      <button
        v-if="!ui.isMobile && ui.sidebarCollapsed"
        class="nav-sidebar-toggle"
        type="button"
        aria-label="展开侧边栏"
        title="展开侧边栏"
        @click="expandSidebar"
      >
        <img :src="sidebarToggleIcon" alt="" aria-hidden="true">
      </button>
      <!-- Logo 区域：forceShowLogo 为 true 或满足条件时显示 -->
      <div
        class="nav-logo-wrapper"
        id="navLogoWrapper"
        :style="{ display: showNavLogo ? 'flex' : 'none' }"
      >
        <img src="/icon/icon_256x256.ico" alt="FlexiKit" class="nav-logo-img">
        <span class="nav-logo-text">FlexiKit</span>
      </div>
      <div v-if="showNavLinks" class="nav-links">
        <router-link to="/app" class="nav-link">首页</router-link>
        <router-link to="/discover" class="nav-link">发现</router-link>
        <router-link to="/about" class="nav-link">产品介绍</router-link>
      </div>
    </div>

    <div class="nav-right">
      <!-- 搜索框 -->
      <div v-if="showSearch" class="nav-search-wrapper">
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

      <div class="nav-control-cluster" role="group" aria-label="快捷操作">
        <!-- 主题切换 -->
        <button
        class="nav-icon nav-glass-action theme-action"
        :class="{ dark: isDarkTheme }"
        id="navThemeToggle"
        type="button"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        @click="onToggleTheme"
      >
        <span class="theme-glyph" aria-hidden="true">
          <svg class="sun-glyph" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3.7" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
          </svg>
          <svg class="moon-glyph" viewBox="0 0 24 24">
            <path d="M20.2 15.2A8.7 8.7 0 0 1 8.8 3.8 8.7 8.7 0 1 0 20.2 15.2Z" />
          </svg>
        </span>
      </button>

        <!-- 设置按钮 -->
        <button class="nav-icon nav-glass-action settings-action" type="button" @click="ui.toggleSettingsPanel()" aria-label="设置" title="外观与布局设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

        <!-- 收藏 -->
        <button
        v-if="showFavorites"
        class="nav-icon nav-glass-action favorite-action"
        :class="{ active: ui.showOnlyFav }"
        id="navFavBtn"
        type="button"
        :aria-pressed="ui.showOnlyFav"
        :aria-label="ui.showOnlyFav ? '显示全部工具' : '仅显示收藏工具'"
        :title="ui.showOnlyFav ? '显示全部工具' : '仅显示收藏工具'"
        @click="onToggleFav"
      >
        <svg class="favorite-glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3.2 2.72 5.51 6.08.88-4.4 4.29 1.04 6.05L12 17.07l-5.44 2.86 1.04-6.05-4.4-4.29 6.08-.88L12 3.2Z" />
        </svg>
        <span id="navFavCount">{{ tools.favoriteTools.size }}</span>
        </button>
      </div>

      <!-- 用户区 -->
      <div v-if="user.isLoggedIn" class="user-menu-wrapper" ref="userMenuRef">
        <button class="nav-icon user-avatar-btn nav-account-action" @click="showUserMenu = !showUserMenu">
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
      <router-link v-else to="/login" class="nav-icon nav-account-action" style="text-decoration:none;">
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
const props = withDefaults(defineProps<{
  forceShowLogo?: boolean  // 强制显示 Logo（用于无侧边栏页面）
  showSearch?: boolean     // 是否显示搜索框
  showFavorites?: boolean  // 是否显示收藏按钮
  showNavLinks?: boolean   // 是否显示导航链接
}>(), {
  forceShowLogo: false,
  showSearch: true,
  showFavorites: true,
  showNavLinks: true,
})

// 默认值
const showSearch = computed(() => props.showSearch !== false)
const showFavorites = computed(() => props.showFavorites !== false)
const showNavLinks = computed(() => props.showNavLinks !== false)

const tools = useToolsStore()
const ui = useUiStore()
const user = useUserStore()
const router = useRouter()

// ========== 状态 ==========
const isDarkTheme = ref(false)
const showMobileNavBar = ref(true)
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// ========== Logo 显示逻辑 ==========
const showNavLogo = computed(() => {
  if (props.forceShowLogo) return true
  return ui.isMobile || ui.sidebarCollapsed
})

const themeToggleLabel = computed(() => isDarkTheme.value ? '切换至亮色模式' : '切换至暗色模式')

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
  isDarkTheme.value = effective === 'dark'
}

const sidebarToggleIcon = computed(() => isDarkTheme.value
  ? '/icon/sidebar_white.png'
  : '/icon/sidebar_black.png')

function expandSidebar() {
  ui.sidebarCollapsed = false
  localStorage.setItem('flexikit-sidebar-collapsed', 'false')
  nextTick(handleScroll)
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
  transition: opacity 0.3s cubic-bezier(.25,.1,.25,1);
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
.nav-sidebar-toggle {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--btn-bg);
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 24%, transparent);
  transition: background .3s cubic-bezier(.25,.1,.25,1), border-color .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1);
}
.nav-sidebar-toggle img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.nav-sidebar-toggle:hover {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 28%, var(--glass-border));
}
.nav-sidebar-toggle:active {
  transform: scale(.98);
}
.nav-sidebar-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: 2px;
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
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(.25,.1,.25,1);
}
.nav-link:hover {
  background: linear-gradient(145deg, rgb(255 255 255 / 18%), transparent 52%), color-mix(in srgb, var(--primary) 7%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 15%, var(--glass-border));
  color: var(--accent);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 7%, transparent), inset 0 1px 0 rgb(255 255 255 / 22%);
  transform: translateY(-1px) scale(1.02);
}
.nav-link.router-link-active {
  background: linear-gradient(145deg, rgb(255 255 255 / 24%), transparent 50%), var(--accent-soft);
  border-color: color-mix(in srgb, var(--primary) 24%, var(--glass-border));
  color: var(--accent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 28%);
}
.nav-link:active { transform: scale(.98); }
.nav-link:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary) 52%, transparent); outline-offset: 2px; }

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-control-cluster {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 42px;
  padding: 3px;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 18%), transparent 48%),
    color-mix(in srgb, var(--glass-bg) 72%, transparent);
  border: 1px solid color-mix(in srgb, white 24%, var(--glass-border));
  border-radius: 15px;
  box-shadow:
    0 8px 24px rgb(15 23 42 / 6%),
    inset 0 1px 0 rgb(255 255 255 / 30%),
    inset 0 0 0 1px rgb(255 255 255 / 5%);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
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
  background: linear-gradient(145deg, rgb(255 255 255 / 15%), transparent 50%), var(--input-bg);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid color-mix(in srgb, white 16%, var(--glass-border));
  border-radius: 12px;
  padding: 0 12px 0 36px;
  font-size: 0.85rem;
  color: var(--text-primary);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 18%);
  transition: all 0.3s cubic-bezier(.25,.1,.25,1);
}
#navSearchInput:hover { border-color: color-mix(in srgb, var(--primary) 20%, var(--glass-border)); }
#navSearchInput:focus {
  border-color: color-mix(in srgb, var(--primary) 58%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent), 0 8px 24px color-mix(in srgb, var(--primary) 7%, transparent), inset 0 1px 0 rgb(255 255 255 / 28%);
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
  transition: all 0.3s cubic-bezier(.25,.1,.25,1);
  text-decoration: none;
}
.nav-icon:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.nav-icon.nav-glass-action {
  position: relative;
  isolation: isolate;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  padding: 0;
  overflow: hidden;
  color: color-mix(in srgb, var(--text-primary) 78%, var(--primary));
  background:
    linear-gradient(145deg, rgb(255 255 255 / 28%), transparent 46%),
    color-mix(in srgb, var(--glass-bg) 76%, transparent);
  border: 1px solid color-mix(in srgb, white 32%, var(--glass-border));
  border-radius: 13px;
  box-shadow:
    0 8px 24px rgb(15 23 42 / 7%),
    0 1px 0 rgb(255 255 255 / 46%) inset,
    0 0 0 1px rgb(255 255 255 / 8%) inset;
  backdrop-filter: blur(20px) saturate(165%);
  -webkit-backdrop-filter: blur(20px) saturate(165%);
  transition: color .3s cubic-bezier(.25,.1,.25,1), background .3s cubic-bezier(.25,.1,.25,1), border-color .3s cubic-bezier(.25,.1,.25,1), box-shadow .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1);
}
.nav-control-cluster .nav-icon.nav-glass-action {
  min-width: 34px;
  width: 34px;
  height: 34px;
  background: transparent;
  border-color: transparent;
  border-radius: 11px;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.nav-control-cluster .nav-icon.nav-glass-action::before { opacity: 0; }
.nav-control-cluster .nav-icon.nav-glass-action:hover {
  background: linear-gradient(145deg, rgb(255 255 255 / 30%), transparent 52%), color-mix(in srgb, var(--primary) 9%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 16%, var(--glass-border));
  box-shadow: 0 5px 14px color-mix(in srgb, var(--primary) 8%, transparent), inset 0 1px 0 rgb(255 255 255 / 34%);
  transform: scale(1.02);
}
.nav-control-cluster .nav-icon.nav-glass-action:active { transform: scale(.98); }
.nav-icon.nav-glass-action::before {
  content: '';
  position: absolute;
  z-index: -1;
  width: 30px;
  height: 24px;
  top: -13px;
  left: 4px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 28%, white), transparent 70%);
  filter: blur(5px);
  opacity: .38;
  pointer-events: none;
  transition: opacity .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1);
}
.nav-icon.nav-glass-action:hover {
  color: var(--primary);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 38%), transparent 48%),
    color-mix(in srgb, var(--primary) 9%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 30%, white 24%);
  box-shadow:
    0 10px 28px color-mix(in srgb, var(--primary) 13%, transparent),
    0 1px 0 rgb(255 255 255 / 58%) inset,
    0 0 0 1px color-mix(in srgb, var(--primary) 9%, transparent) inset;
  transform: scale(1.02) translateY(-1px);
}
.nav-icon.nav-glass-action:hover::before { opacity: .72; transform: translateX(4px); }
.nav-icon.nav-glass-action:active { transform: scale(.98); }
.nav-icon.nav-glass-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 52%, transparent);
  outline-offset: 2px;
}

.theme-glyph {
  position: relative;
  display: block;
  width: 19px;
  height: 19px;
}
.theme-glyph svg {
  position: absolute;
  inset: 0;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: opacity .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1);
}
.sun-glyph { opacity: 1; transform: rotate(0deg) scale(1); }
.moon-glyph { opacity: 0; transform: rotate(-24deg) scale(.68); }
.theme-action.dark .sun-glyph { opacity: 0; transform: rotate(42deg) scale(.68); }
.theme-action.dark .moon-glyph { opacity: 1; transform: rotate(0deg) scale(1); }

.nav-icon.favorite-action {
  min-width: 57px;
  gap: 6px;
  padding: 0 8px 0 10px;
}
.nav-control-cluster .nav-icon.favorite-action {
  width: auto;
  min-width: 53px;
  padding: 0 7px 0 8px;
}
.favorite-glyph {
  width: 18px;
  height: 18px;
  fill: transparent;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: fill .3s cubic-bezier(.25,.1,.25,1), stroke .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1), filter .3s cubic-bezier(.25,.1,.25,1);
}
.favorite-action.active {
  color: var(--primary);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 40%), transparent 46%),
    color-mix(in srgb, var(--primary) 12%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 34%, white 22%);
  box-shadow:
    0 9px 26px color-mix(in srgb, var(--primary) 15%, transparent),
    0 1px 0 rgb(255 255 255 / 58%) inset,
    0 0 0 1px color-mix(in srgb, var(--primary) 12%, transparent) inset;
}
.nav-control-cluster .favorite-action.active {
  background: linear-gradient(145deg, rgb(255 255 255 / 28%), transparent 50%), color-mix(in srgb, var(--primary) 11%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 20%, var(--glass-border));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 32%);
}
.favorite-action.active .favorite-glyph {
  fill: currentColor;
  stroke: color-mix(in srgb, var(--primary) 76%, white);
  filter: drop-shadow(0 3px 5px color-mix(in srgb, var(--primary) 26%, transparent));
  transform: scale(1.04);
}
#navFavCount {
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-primary) 42%, transparent);
  border: 1px solid color-mix(in srgb, white 30%, var(--glass-border));
  border-radius: 99px;
  box-shadow: 0 1px 0 rgb(255 255 255 / 36%) inset;
  font-size: .66rem;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 1;
  text-align: center;
  transition: color .3s cubic-bezier(.25,.1,.25,1), background .3s cubic-bezier(.25,.1,.25,1);
}
.favorite-action.active #navFavCount { color: var(--primary); background: color-mix(in srgb, var(--primary) 11%, var(--glass-bg)); }

.nav-account-action {
  min-height: 38px;
  padding: 0 13px;
  background: linear-gradient(145deg, rgb(255 255 255 / 15%), transparent 52%), color-mix(in srgb, var(--glass-bg) 66%, transparent);
  border: 1px solid color-mix(in srgb, white 18%, var(--glass-border));
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 20%);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}
.nav-account-action:hover {
  background: linear-gradient(145deg, rgb(255 255 255 / 24%), transparent 52%), color-mix(in srgb, var(--primary) 7%, var(--glass-bg));
  border-color: color-mix(in srgb, var(--primary) 20%, var(--glass-border));
  box-shadow: 0 6px 17px color-mix(in srgb, var(--primary) 7%, transparent), inset 0 1px 0 rgb(255 255 255 / 30%);
  transform: translateY(-1px) scale(1.02);
}
.nav-account-action:active { transform: scale(.98); }
.nav-account-action:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary) 52%, transparent); outline-offset: 2px; }

:global([data-theme="dark"]) .top-navbar {
  background: linear-gradient(145deg, rgb(255 255 255 / 3.5%), transparent 38%), var(--glass-bg);
  border-color: rgb(255 255 255 / 7.5%);
  box-shadow: 0 14px 40px rgb(0 0 0 / 18%), inset 0 1px 0 rgb(255 255 255 / 7%);
}
:global([data-theme="dark"]) .nav-control-cluster {
  background: linear-gradient(145deg, rgb(255 255 255 / 4.5%), transparent 52%), rgb(255 255 255 / 1.8%);
  border-color: rgb(255 255 255 / 7%);
  box-shadow: 0 7px 20px rgb(0 0 0 / 13%), inset 0 1px 0 rgb(255 255 255 / 6%);
}
:global([data-theme="dark"]) .nav-account-action,
:global([data-theme="dark"]) #navSearchInput {
  background: linear-gradient(145deg, rgb(255 255 255 / 4.5%), transparent 52%), rgb(255 255 255 / 2.5%);
  border-color: rgb(255 255 255 / 6.5%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%);
}
:global([data-theme="dark"]) .nav-link.router-link-active {
  background: linear-gradient(145deg, rgb(255 255 255 / 5.5%), transparent 52%), color-mix(in srgb, var(--primary) 7%, transparent);
  border-color: color-mix(in srgb, var(--primary) 20%, rgb(255 255 255 / 4%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 7%);
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
  animation: dropdownIn 0.3s cubic-bezier(.25,.1,.25,1);
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
  transition: background 0.3s cubic-bezier(.25,.1,.25,1), color 0.3s cubic-bezier(.25,.1,.25,1);
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
  .top-navbar.visible {
    padding: 10px;
    gap: 10px;
  }
  .nav-left {
    width: 100%;
    min-width: 0;
    gap: 8px;
  }
  .nav-logo-wrapper {
    flex: 0 0 auto;
  }
  .nav-logo-img {
    width: 24px;
    height: 24px;
  }
  .nav-logo-text {
    font-size: .96rem;
  }
  .nav-links {
    min-width: 0;
    margin-left: auto;
    gap: 2px;
  }
  .nav-link {
    padding: 7px 8px;
    font-size: .76rem;
    white-space: nowrap;
  }
  .nav-right {
    width: 100%;
    min-width: 0;
    gap: 6px;
  }
  .nav-search-wrapper {
    width: auto;
    min-width: 0;
    flex: 1 1 auto;
  }
  .nav-icon {
    flex: 0 0 auto;
    min-width: 36px;
    min-height: 36px;
    padding: 6px 9px;
    justify-content: center;
    white-space: nowrap;
  }
}
</style>
