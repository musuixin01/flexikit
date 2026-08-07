<template>
  <div class="app-layout profile-page">
    <main class="main-content full-width">
      <Navbar force-show-logo />

      <div class="profile-container">
        <!-- 已登录状态 -->
        <template v-if="user.isLoggedIn">
          <!-- 顶部用户信息卡片 -->
          <div class="profile-header-card">
            <div class="user-avatar-wrapper">
              <span v-if="user.profile?.avatarType === 'emoji'" class="avatar-emoji">
                {{ user.profile?.avatar || '👤' }}
              </span>
              <img
                v-else-if="user.profile?.avatarType === 'upload' && user.profile?.avatar?.startsWith('data:image')"
                :src="user.profile.avatar"
                class="avatar-img"
                alt="avatar"
              >
              <span v-else class="avatar-emoji">👤</span>
            </div>
            <div class="user-info">
              <h2>{{ user.displayName || user.profile?.username || '未命名' }}</h2>
              <p class="username">@{{ user.profile?.username }}</p>
              <p class="email">{{ user.profile?.email || '未绑定邮箱' }}</p>
              <p class="join-date">加入于 {{ formattedJoinDate }}</p>
            </div>
            <div class="user-actions">
              <button class="action-btn primary" @click="goEditProfile">✏️ 编辑资料</button>
              <button class="action-btn danger" @click="handleLogout">🚪 退出</button>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon">📦</span>
              <span class="stat-number">{{ toolList.length }}</span>
              <span class="stat-label">工具总数</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">⭐</span>
              <span class="stat-number">{{ favoriteSet.size }}</span>
              <span class="stat-label">收藏数</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">📂</span>
              <span class="stat-number">{{ categoriesCount }}</span>
              <span class="stat-label">分类数</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">✏️</span>
              <span class="stat-number">{{ customToolsCount }}</span>
              <span class="stat-label">自定义工具</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">👀</span>
              <span class="stat-number">{{ todayViews }}</span>
              <span class="stat-label">今日访问</span>
            </div>
          </div>

          <!-- 主网格 -->
          <div class="profile-grid">
            <!-- 左栏 -->
            <div class="profile-left">
              <!-- 收藏管理 -->
              <section class="section-card">
                <h3 class="section-title">⭐ 收藏管理</h3>
                <div v-if="favoriteTools.length === 0" class="empty-state">暂无收藏</div>
                <div v-else class="favorite-list">
                  <div v-for="tool in favoriteTools.slice(0, 5)" :key="tool.id" class="favorite-item">
                    <span class="fav-icon">{{ tool.icon || '🔗' }}</span>
                    <span class="fav-name">{{ tool.name }}</span>
                    <button class="fav-remove" @click="removeFavorite(tool)">✕</button>
                  </div>
                  <div v-if="favoriteTools.length > 5" class="more-link" @click="viewAllFavorites">
                    查看全部 {{ favoriteTools.length }} 项 →
                  </div>
                </div>
                <button class="link-btn" @click="openAllFavorites">一键打开全部收藏</button>
              </section>

              <!-- 历史记录 -->
              <section class="section-card">
                <h3 class="section-title">📜 历史记录</h3>
                <div class="history-tabs">
                  <button class="tab-btn" :class="{ active: historyTab === 'tools' }" @click="historyTab = 'tools'">访问</button>
                  <button class="tab-btn" :class="{ active: historyTab === 'search' }" @click="historyTab = 'search'">搜索</button>
                  <button class="tab-btn" :class="{ active: historyTab === 'click' }" @click="historyTab = 'click'">点击</button>
                </div>
                <div v-if="historyTab === 'tools'" class="history-list">
                  <div v-for="item in historyTools" :key="item.id" class="history-item">
                    <span>{{ item.name }}</span>
                    <span class="history-time">{{ item.time }}</span>
                  </div>
                  <div v-if="historyTools.length === 0" class="empty-state">暂无访问记录</div>
                </div>
                <div v-else-if="historyTab === 'search'" class="history-list">
                  <div v-for="item in historySearches" :key="item.id" class="history-item">
                    <span>🔍 {{ item.query }}</span>
                    <span class="history-time">{{ item.time }}</span>
                  </div>
                  <div v-if="historySearches.length === 0" class="empty-state">暂无搜索记录</div>
                </div>
                <div v-else class="history-list">
                  <div v-for="item in historyClicks" :key="item.id" class="history-item">
                    <span>{{ item.name }}</span>
                    <span class="history-time">{{ item.time }}</span>
                  </div>
                  <div v-if="historyClicks.length === 0" class="empty-state">暂无点击记录</div>
                </div>
                <button class="link-btn" @click="clearHistory">清空历史</button>
              </section>

              <!-- 工具快捷区 -->
              <section class="section-card">
                <h3 class="section-title">🚀 工具快捷区</h3>
                <div class="quick-tools">
                  <div v-for="tool in quickTools" :key="tool.id" class="quick-tool" @click="openTool(tool.url)">
                    <span class="quick-icon">{{ tool.icon || '🔗' }}</span>
                    <span class="quick-name">{{ tool.name }}</span>
                  </div>
                  <button class="add-quick-btn" @click="addQuickTool">+ 添加</button>
                </div>
              </section>
            </div>

            <!-- 右栏 -->
            <div class="profile-right">
              <!-- 账户设置 -->
              <section class="section-card">
                <h3 class="section-title">🔐 账户设置</h3>
                <div class="setting-item">
                  <span>修改密码</span>
                  <button class="setting-btn" @click="changePassword">修改</button>
                </div>
                <div class="setting-item">
                  <span>绑定邮箱</span>
                  <button class="setting-btn" @click="bindEmail">绑定</button>
                </div>
                <div class="setting-item danger">
                  <span>注销账号</span>
                  <button class="setting-btn danger" @click="deleteAccount">注销</button>
                </div>
              </section>

              <!-- 使用统计 -->
              <section class="section-card">
                <h3 class="section-title">📊 使用统计</h3>
                <div class="stats-detail">
                  <div class="stat-row">
                    <span>今日使用</span>
                    <span class="stat-value">{{ todayUsage }} 次</span>
                  </div>
                  <div class="stat-row">
                    <span>本周使用</span>
                    <span class="stat-value">{{ weekUsage }} 次</span>
                  </div>
                </div>
                <h4 class="sub-title">常用工具排行</h4>
                <div class="rank-list">
                  <div v-for="(tool, index) in topTools" :key="tool.id" class="rank-item">
                    <span class="rank-number">{{ index + 1 }}</span>
                    <span class="rank-name">{{ tool.name }}</span>
                    <span class="rank-count">{{ tool.count }} 次</span>
                  </div>
                  <div v-if="topTools.length === 0" class="empty-state">暂无数据</div>
                </div>
                <h4 class="sub-title">访问时间分布</h4>
                <div class="time-chart">
                  <div v-for="hour in 24" :key="hour" class="bar-container" :title="`${hour}:00-${hour+1}:00`">
                    <div class="bar" :style="{ height: getBarHeight(hour) + '%' }"></div>
                  </div>
                </div>
              </section>

              <!-- 我的偏好 -->
              <section class="section-card">
                <h3 class="section-title">🎯 我的工具偏好</h3>
                <div class="preference-item">
                  <span>常用分类</span>
                  <div class="tag-group">
                    <span v-for="cat in topCategories" :key="cat" class="tag">{{ cat }}</span>
                    <span v-if="topCategories.length === 0" class="empty-state">暂无数据</span>
                  </div>
                </div>
                <div class="preference-item">
                  <span>常用标签</span>
                  <div class="tag-group">
                    <span v-for="tag in topTags" :key="tag" class="tag">{{ tag }}</span>
                    <span v-if="topTags.length === 0" class="empty-state">暂无数据</span>
                  </div>
                </div>
                <div class="preference-item">
                  <span>推荐偏好</span>
                  <div class="tag-group">
                    <span v-for="rec in recommendations" :key="rec" class="tag rec">{{ rec }}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </template>

        <!-- 未登录状态 -->
        <div v-else class="not-logged-in">
          <div class="login-prompt">
            <span class="prompt-icon">👤</span>
            <h2>请先登录</h2>
            <p>登录后查看个人数据与统计信息</p>
            <router-link to="/login" class="login-link">去登录</router-link>
          </div>
        </div>
      </div>
    </main>
  </div>

  <ToastMessage />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToolsStore } from '@/stores/tools'
import { useUiStore } from '@/stores/ui'
import Navbar from '@/components/layout/Navbar.vue'
import ToastMessage from '@/components/common/ToastMessage.vue'

const user = useUserStore()
const tools = useToolsStore()
const ui = useUiStore()
const router = useRouter()

// ===== 安全计算属性 =====
const toolList = computed(() => tools.tools || [])
const favoriteSet = computed(() => tools.favoriteTools || new Set())

const formattedJoinDate = computed(() => {
  if (!user.profile?.created_at) return '未知'
  const date = new Date(user.profile.created_at)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
})

const categoriesCount = computed(() => {
  const cats = new Set(toolList.value.map(t => t.category))
  return cats.size
})

const customToolsCount = computed(() => {
  return toolList.value.filter(t => t.is_custom).length
})

// ===== 收藏管理 =====
const favoriteTools = computed(() => {
  const favKeys = favoriteSet.value
  return toolList.value.filter(t => favKeys.has(t.is_custom ? `custom:${t.name}` : `builtin:${t.name}`))
})

async function removeFavorite(tool: any) {
  const key = tool.is_custom ? `custom:${tool.name}` : `builtin:${tool.name}`
  await tools.toggleFavorite(key)
}

function viewAllFavorites() {
  ui.showToast('查看全部收藏（功能开发中）')
}

function openAllFavorites() {
  favoriteTools.value.forEach(t => window.open(t.url, '_blank'))
  ui.showToast('已打开所有收藏')
}

// ===== 历史记录（模拟数据） =====
const historyTab = ref<'tools' | 'search' | 'click'>('tools')
const historyTools = ref([
  { id: 1, name: 'Snipaste', time: '10分钟前' },
  { id: 2, name: 'draw.io', time: '1小时前' },
])
const historySearches = ref([
  { id: 1, query: 'AI 工具', time: '30分钟前' },
  { id: 2, query: '截图', time: '2小时前' },
])
const historyClicks = ref([
  { id: 1, name: 'Cursor', time: '15分钟前' },
])
function clearHistory() {
  historyTools.value = []
  historySearches.value = []
  historyClicks.value = []
  ui.showToast('历史已清空')
}

// ===== 快捷区 =====
const quickTools = ref([
  { id: 1, name: 'Snipaste', url: 'https://www.snipaste.com/', icon: '📷' },
  { id: 2, name: 'draw.io', url: 'https://app.diagrams.net/', icon: '📊' },
])
function openTool(url: string) {
  window.open(url, '_blank')
}
function addQuickTool() {
  ui.showToast('添加快捷工具（可在设置中配置）')
}

// ===== 统计（模拟数据） =====
const todayViews = ref(12)
const todayUsage = ref(8)
const weekUsage = ref(45)

const topTools = ref([
  { id: 1, name: 'Snipaste', count: 23 },
  { id: 2, name: 'draw.io', count: 18 },
  { id: 3, name: 'Cursor', count: 12 },
])

function getBarHeight(hour: number) {
  const base = [15, 12, 8, 5, 3, 2, 1, 2, 5, 10, 20, 35, 50, 60, 70, 75, 80, 85, 90, 85, 75, 60, 40, 25]
  return base[hour] || 10
}

// ===== 偏好 =====
const topCategories = computed(() => {
  const catCount = new Map()
  toolList.value.forEach(t => {
    const cat = t.category || '未分类'
    catCount.set(cat, (catCount.get(cat) || 0) + 1)
  })
  return Array.from(catCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat)
})

const topTags = computed(() => {
  const tagCount = new Map()
  toolList.value.forEach(t => {
    (t.tags || []).forEach((tag: string) => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
    })
  })
  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
})

const recommendations = ref(['AI 工具', '设计工具', '开发工具'])

// ===== 账户操作 =====
function goEditProfile() {
  router.push('/login?tab=profile')
}

function handleLogout() {
  user.logout()
  ui.showToast('已退出登录')
  router.push('/login')
}

function changePassword() {
  ui.showToast('修改密码功能开发中')
}

function bindEmail() {
  ui.showToast('绑定邮箱功能开发中')
}

function deleteAccount() {
  if (confirm('确定要注销账号吗？此操作不可撤销！')) {
    ui.showToast('账号已注销（模拟）')
  }
}

// 组件挂载时不强制跳转，由用户决定
onMounted(() => {
  // 仅用于初始化，不进行任何跳转
})
</script>

<style scoped>
/* ===== 页面布局 ===== */
.profile-page {
  display: block;
  padding: 20px;
}
.main-content.full-width {
  max-width: 1200px;
  margin: 0 auto;
}
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ===== 未登录提示 ===== */
.not-logged-in {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
.login-prompt {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: var(--glass-shadow);
}
.prompt-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}
.login-prompt h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.login-prompt p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.login-link {
  display: inline-block;
  padding: 10px 32px;
  background: var(--accent);
  color: #fff;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}
.login-link:hover {
  opacity: 0.9;
}

/* ===== 顶部用户卡片 ===== */
.profile-header-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 28px 32px;
  box-shadow: var(--glass-shadow);
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.user-avatar-wrapper {
  flex-shrink: 0;
}
.avatar-emoji {
  font-size: 64px;
  line-height: 1;
}
.avatar-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}
.user-info {
  flex: 1;
  min-width: 180px;
}
.user-info h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.user-info .username {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
}
.user-info .email {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin: 0;
}
.user-info .join-date {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0;
}
.user-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.action-btn {
  padding: 8px 20px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--btn-bg);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.action-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--text-primary);
}
.action-btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.action-btn.primary:hover {
  opacity: 0.9;
}
.action-btn.danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: var(--danger);
}

/* ===== 统计卡片 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
.stat-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--glass-shadow);
}
.stat-icon {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 2px;
}
.stat-number {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}
.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* ===== 主网格 ===== */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 卡片通用 ===== */
.section-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: var(--glass-shadow);
  margin-bottom: 24px;
}
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}
.sub-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 16px 0 8px;
}
.empty-state {
  color: var(--text-tertiary);
  text-align: center;
  padding: 12px 0;
  font-size: 0.85rem;
}

/* ===== 收藏列表 ===== */
.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorite-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.fav-icon {
  font-size: 1.2rem;
}
.fav-name {
  flex: 1;
  color: var(--text-primary);
}
.fav-remove {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 0.8rem;
}
.fav-remove:hover {
  color: var(--danger);
}
.more-link {
  color: var(--accent);
  cursor: pointer;
  font-size: 0.85rem;
  text-align: right;
  padding-top: 4px;
}
.more-link:hover {
  text-decoration: underline;
}
.link-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 8px 0 0;
}
.link-btn:hover {
  text-decoration: underline;
}

/* ===== 历史记录 ===== */
.history-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  background: var(--btn-bg);
  border-radius: 10px;
  padding: 3px;
}
.tab-btn {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: var(--glass-bg);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.history-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 4px 0;
  color: var(--text-secondary);
}
.history-time {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

/* ===== 快捷工具 ===== */
.quick-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.quick-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--btn-bg);
  border-radius: 20px;
  border: 1px solid var(--divider);
  cursor: pointer;
  transition: all 0.2s;
}
.quick-tool:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.quick-icon {
  font-size: 1.2rem;
}
.quick-name {
  font-size: 0.8rem;
  color: var(--text-primary);
}
.add-quick-btn {
  padding: 6px 14px;
  border: 1px dashed var(--divider);
  border-radius: 20px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 0.8rem;
}
.add-quick-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ===== 账户设置 ===== */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--divider);
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-item span {
  color: var(--text-secondary);
}
.setting-item.danger span {
  color: var(--danger);
}
.setting-btn {
  padding: 4px 16px;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: var(--btn-bg);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
}
.setting-btn:hover {
  background: var(--btn-bg-hover);
}
.setting-btn.danger {
  color: var(--danger);
  border-color: var(--danger-soft);
}
.setting-btn.danger:hover {
  background: var(--danger-soft);
}

/* ===== 使用统计 ===== */
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
.stat-value {
  font-weight: 600;
  color: var(--text-primary);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.rank-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--btn-bg);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.rank-name {
  flex: 1;
  color: var(--text-primary);
}
.rank-count {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.time-chart {
  display: flex;
  align-items: flex-end;
  height: 80px;
  gap: 2px;
  margin-top: 8px;
}
.bar-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}
.bar {
  width: 100%;
  background: var(--accent);
  border-radius: 3px 3px 0 0;
  transition: height 0.3s;
  min-height: 2px;
  opacity: 0.7;
}
.bar:hover {
  opacity: 1;
}

/* ===== 偏好 ===== */
.preference-item {
  margin-bottom: 12px;
}
.preference-item > span {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  padding: 2px 12px;
  background: var(--btn-bg);
  border-radius: 16px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.tag.rec {
  background: var(--accent-soft);
  color: var(--accent);
}

/* ===== 响应式 ===== */
@media (max-width: 700px) {
  .profile-header-card {
    flex-direction: column;
    text-align: center;
  }
  .user-actions {
    width: 100%;
    justify-content: center;
  }
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .section-card {
    padding: 16px;
  }
}
@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
