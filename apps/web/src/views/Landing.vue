<template>
  <div class="landing-page">
    <!-- ===== 导航栏 ===== -->
    <nav class="landing-nav" :class="{ scrolled: isScrolled }">
      <div class="nav-container">
        <div class="nav-left">
          <router-link to="/" class="nav-brand" aria-label="返回 FlexiKit 首页">
            <img src="/icon/icon_256x256.ico" alt="FlexiKit" class="brand-logo" />
            <span class="brand-text">FlexiKit</span>
          </router-link>
          <div class="nav-links">
            <a href="#features">功能</a>
            <a href="#how">使用步骤</a>
            <router-link to="/discover">发现工具</router-link>
            <router-link to="/about">产品介绍</router-link>
          </div>
        </div>
        <div class="nav-right">
          <button class="nav-icon" @click="toggleTheme" :title="themeToggleLabel" :aria-label="themeToggleLabel">
            {{ themeIcon }}
          </button>
          <template v-if="user.isLoggedIn">
            <router-link to="/app" class="btn btn-ghost">进入工具箱</router-link>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-ghost">登录</router-link>
            <router-link to="/login?tab=register" class="btn btn-primary">免费注册</router-link>
          </template>
        </div>
      </div>
    </nav>

    <!-- ===== Hero ===== -->
    <section class="hero">
      <div class="hero-bg-orb orb-1"></div>
      <div class="hero-bg-orb orb-2"></div>
      <div class="hero-bg-orb orb-3"></div>
      <div class="hero-container">
        <div class="hero-left">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            v1.0 正式发布 · 永久免费
          </div>
          <h1 class="hero-title">
            你的<span class="gradient-text">全能工具箱</span><br />一站管理，效率翻倍
          </h1>
          <p class="hero-desc">
            FlexiKit 灵巧箱 — 集工具管理、智能推荐、个性化定制于一身。
            拖拽排序、多主题切换、本地应用启动，让每一次操作都行云流水。
          </p>
          <div class="hero-actions">
            <router-link to="/app" class="btn btn-primary btn-lg">
              免费开始使用
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </router-link>
            <router-link to="/about" class="btn btn-outline btn-lg">
              了解更多
            </router-link>
          </div>
          <div class="hero-meta">
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              无需信用卡
            </div>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              数据安全
            </div>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              3 分钟上手
            </div>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-preview glass-card">
            <div class="preview-topbar">
              <div class="preview-dots"><span></span><span></span><span></span></div>
              <span class="preview-title">我的工具箱</span>
            </div>
            <div class="preview-grid">
              <button
                v-for="(item, index) in previewTools"
                :key="item.name"
                class="preview-item"
                :class="{ active: activePreview === index }"
                type="button"
                @mouseenter="activePreview = index"
                @focus="activePreview = index"
                @click="activePreview = index"
              >
                <span class="preview-icon">{{ item.icon }}</span>
                <span class="preview-name">{{ item.name }}</span>
              </button>
            </div>
            <div class="preview-feedback" aria-live="polite">
              <span>当前预览</span>
              <strong>{{ previewTools[activePreview].name }}</strong>
              <router-link to="/app">进入工具箱体验 →</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 数据统计 ===== -->
    <section id="stats" class="stats">
      <div class="section-container">
        <div class="stats-grid">
          <div class="stat-card glass-card" v-for="stat in stats" :key="stat.label">
            <div class="stat-value">
              <span ref="statRefs">{{ animatedStats[stat.label] ?? 0 }}</span>
              <span class="stat-unit">{{ stat.suffix }}</span>
            </div>
            <p class="stat-label">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 核心功能 ===== -->
    <section id="features" class="features">
      <div class="section-container">
        <div class="section-head">
          <span class="section-tag">核心功能</span>
          <h2>你所需要的一切，尽在掌握</h2>
          <p>从添加到整理，从搜索到发现 — FlexiKit 让工具管理变成享受。</p>
        </div>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card glass-card">
            <div class="feature-icon-wrap" :style="{ background: f.color + '18', color: f.color }">
              <span v-html="f.icon"></span>
            </div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 使用步骤 ===== -->
    <section id="how" class="how">
      <div class="section-container">
        <div class="section-head">
          <span class="section-tag">快速上手</span>
          <h2>三步开启高效之旅</h2>
          <p>注册、添加、整理 —— 不到 3 分钟就能搭建你的专属工具箱。</p>
        </div>
        <div class="steps">
          <div v-for="(step, i) in steps" :key="step.title" class="step-card glass-card">
            <div class="step-number">{{ i + 1 }}</div>
            <div class="step-icon" v-html="step.icon"></div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 为什么选择我们 ===== -->
    <section class="why">
      <div class="section-container">
        <div class="section-head">
          <span class="section-tag">为什么 FlexiKit</span>
          <h2>不只是书签，是效率引擎</h2>
        </div>
        <div class="why-grid">
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>完全免费</strong>
              <p>无隐藏收费、无功能限制。开源 MIT 协议，永远免费使用。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>隐私优先</strong>
              <p>数据加密存储，支持一键导出和彻底删除。你的数据你做主。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>AI 智能推荐</strong>
              <p>基于向量相似度的智能推荐引擎，发现你真正需要的工具。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>极致可定制</strong>
              <p>8 种主题色、毛玻璃强度、卡片大小、圆角 — 每处细节由你决定。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>本地应用支持</strong>
              <p>不止网页链接，一键启动本地程序，打通线上与线下的效率闭环。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">✓</div>
            <div>
              <strong>跨设备同步</strong>
              <p>云端账号同步你的工具箱布局、收藏和偏好，换设备不换体验。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 技术栈 ===== -->
    <section class="tech">
      <div class="section-container">
        <div class="section-head">
          <span class="section-tag">技术架构</span>
          <h2>现代技术栈，稳固可靠</h2>
        </div>
        <div class="tech-grid">
          <div v-for="t in techStack" :key="t.name" class="tech-card glass-card">
            <div class="tech-icon" v-html="t.icon"></div>
            <div class="tech-name">{{ t.name }}</div>
            <div class="tech-role">{{ t.role }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="cta">
      <div class="section-container">
        <div class="cta-card">
          <div class="cta-glow"></div>
          <h2>准备好提升效率了吗？</h2>
          <p>加入数千名用户，用 FlexiKit 重新定义你的工作流。</p>
          <div class="cta-buttons">
            <router-link to="/app" class="btn btn-primary btn-lg">
              🚀 免费开始使用
            </router-link>
            <router-link to="/about" class="btn btn-outline btn-lg">
              了解更多
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 页脚 ===== -->
    <footer class="footer">
      <div class="section-container">
        <div class="footer-grid">
          <div class="footer-col">
            <div class="footer-brand">
              <img src="/icon/icon_256x256.ico" alt="FlexiKit" class="footer-logo-img" />
              <span>FlexiKit · 灵巧箱</span>
            </div>
            <p class="footer-tagline">高度可自定义的通用工具箱</p>
          </div>
          <div class="footer-col">
            <h4>产品</h4>
            <router-link to="/app">工具箱</router-link>
            <router-link to="/discover">发现工具</router-link>
            <router-link to="/about">产品介绍</router-link>
          </div>
          <div class="footer-col">
            <h4>法律</h4>
            <router-link to="/terms">用户协议</router-link>
            <router-link to="/privacy">隐私政策</router-link>
            <router-link to="/data">数据管理</router-link>
          </div>
          <div class="footer-col">
            <h4>资源</h4>
            <a href="https://github.com/baimuxi/flexikit" target="_blank">GitHub</a>
            <a href="mailto:support@flexikit.com">联系支持</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 FlexiKit. MIT License. All rights reserved.</p>
          <a class="beian-link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
            <!-- ICP 备案号：沪ICP备XXXXXXXX号-X -->
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'

const user = useUserStore()
const ui = useUiStore()

const themeIcon = ref('🌙')
const isScrolled = ref(false)
const animatedStats = reactive<Record<string, number>>({})
const activePreview = ref(0)
const themeToggleLabel = computed(() => themeIcon.value === '☀️' ? '切换至深色模式' : '切换至浅色模式')

const previewTools = [
  { icon: '🔧', name: '开发工具' },
  { icon: '🎨', name: '设计资源' },
  { icon: '⚡', name: '快速启动' },
  { icon: '📦', name: '项目管理' },
  { icon: '🚀', name: '效率提升' },
  { icon: '💡', name: '灵感笔记' },
]

const stats = [
  { label: '内置工具', value: 200, suffix: '+' },
  { label: '活跃用户', value: 5000, suffix: '+' },
  { label: '支持分类', value: 12, suffix: ' 类' },
  { label: '运行天数', value: 365, suffix: ' 天' },
]

const features = [
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', title: '本地应用', desc: '一键启动本地程序，打通桌面与浏览器的效率闭环。', color: '#0071e3' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', title: '智能推荐', desc: 'AI 向量引擎匹配你的偏好，发现更多优质工具。', color: '#6366f1' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', title: '收藏管理', desc: '一键收藏常用工具，按分类和标签快速筛选定位。', color: '#ff9500' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', title: '即时搜索', desc: '按名称、标签、URL 闪电搜索，键盘即一切。', color: '#34c759' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>', title: '拖拽排序', desc: '自由拖拽调整工具和分类顺序，一切按你的习惯来。', color: '#af52de' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', title: '多主题适配', desc: '浅色/深色/跟随系统，8 色主题 + 毛玻璃自定义。', color: '#30b0c7' },
]

const steps = [
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>', title: '注册账户', desc: '只需邮箱和用户名，30 秒完成注册，永久免费。' },
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', title: '添加工具', desc: '添加你常用的网站、应用和脚本，支持自定义图标和标签。' },
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="4 17 10 11 4 17"/><line x1="12" y1="17" x2="20" y2="17"/><path d="M12 12h8"/><path d="M4 7h16"/></svg>', title: '整理归类', desc: '拖拽排序、分类管理、批量操作，打造你的专属工作流程。' },
]

const techStack = [
  { name: 'Vue 3', role: '前端框架', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#42b883" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { name: 'TypeScript', role: '类型安全', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="1" y="1" width="22" height="22" rx="3" stroke="#3178c6" stroke-width="2"/><text x="6" y="17" font-size="10" fill="#3178c6" font-weight="bold">TS</text></svg>' },
  { name: 'NestJS', role: '后端框架', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l10 6v8l-10 6-10-6V8l10-6z" stroke="#e0234e" stroke-width="2"/><text x="7" y="15" font-size="7" fill="#e0234e" font-weight="bold">N</text></svg>' },
  { name: 'PostgreSQL', role: '数据库', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="#336791" stroke-width="2"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="#336791" stroke-width="2"/></svg>' },
  { name: 'Docker', role: '容器化', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="11" rx="2" stroke="#2496ed" stroke-width="2"/><rect x="6" y="4" width="4" height="3" rx="1" stroke="#2496ed" stroke-width="1.5"/><rect x="13" y="4" width="4" height="3" rx="1" stroke="#2496ed" stroke-width="1.5"/><circle cx="7" cy="12" r="1" fill="#2496ed"/><circle cx="11" cy="12" r="1" fill="#2496ed"/><circle cx="15" cy="12" r="1" fill="#2496ed"/></svg>' },
  { name: 'Redis', role: '缓存层', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="12 2 22 8.5 12 15 2 8.5" stroke="#dc382d" stroke-width="2"/><polygon points="12 15 22 8.5 22 15.5 12 22" stroke="#dc382d" stroke-width="2"/><polygon points="12 15 2 8.5 2 15.5 12 22" stroke="#dc382d" stroke-width="2"/></svg>' },
]

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme') || 'auto'
  const effective = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  themeIcon.value = effective === 'dark' ? '🌙' : '☀️'
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'auto'
  const currentEff = current === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : current
  ui.setTheme(currentEff === 'dark' ? 'light' : 'dark')
  updateThemeIcon()
}

function onScroll() {
  isScrolled.value = window.scrollY > 20
}

// 数字递增动画
function animateStats() {
  stats.forEach(stat => {
    const key = stat.label
    let current = 0
    const target = stat.value
    const duration = 1500
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      animatedStats[key] = current
      if (current >= target) {
        animatedStats[key] = target
        clearInterval(timer)
      }
    }, 16)
  })
}

let statsObserver: IntersectionObserver | null = null

onMounted(() => {
  updateThemeIcon()
  window.addEventListener('scroll', onScroll)
  statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateStats()
      statsObserver?.disconnect()
    }
  }, { threshold: 0.3 })
  const statsEl = document.getElementById('stats')
  if (statsEl) statsObserver.observe(statsEl)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  statsObserver?.disconnect()
})
</script>

<style scoped>
/* ===== 全局变量 ===== */
.landing-page {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(180deg, var(--body-bg) 0%, var(--bg-tertiary) 100%);
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}

.section-head {
  text-align: center;
  margin-bottom: 56px;
}
.section-tag {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.section-head h2 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}
.section-head p {
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 540px;
  margin: 0 auto;
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

/* ===== 导航栏 ===== */
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: transparent;
  transition: all 0.3s;
}
.landing-nav.scrolled {
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-left { display: flex; align-items: center; gap: 40px; }
.nav-brand { display: flex; align-items: center; gap: 10px; }
.brand-logo { width: 34px; height: 34px; border-radius: 8px; }
.brand-text {
  font-size: 1.2rem;
  font-weight: 700;
  background: var(--logo-gradient);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
.nav-links { display: flex; gap: 28px; }
.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 500;
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--text-primary); }
.nav-right { display: flex; align-items: center; gap: 10px; }
.nav-icon {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 10px; background: var(--btn-bg);
  cursor: pointer; font-size: 1.1rem; transition: background 0.2s;
}
.nav-icon:hover { background: var(--btn-bg-hover); }

/* ===== 按钮 ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 12px; font-size: 0.88rem;
  font-weight: 600; text-decoration: none; cursor: pointer;
  transition: all 0.2s; border: none; font-family: inherit;
}
.btn-primary {
  background: var(--accent); color: #fff;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,113,227,0.3); }
.btn-outline {
  background: transparent; color: var(--text-primary);
  border: 1px solid var(--border);
}
.btn-outline:hover { background: var(--btn-bg-hover); border-color: var(--text-tertiary); }
.btn-ghost {
  background: var(--btn-bg); color: var(--text-primary);
}
.btn-ghost:hover { background: var(--btn-bg-hover); }
.btn-lg { padding: 14px 28px; font-size: 0.95rem; border-radius: 14px; }

/* ===== Hero ===== */
.hero {
  position: relative;
  padding: 140px 32px 100px;
  overflow: hidden;
}
.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.hero-bg-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
}
.orb-1 { width: 500px; height: 500px; background: var(--orb-color); top: -100px; right: -100px; opacity: 0.6; }
.orb-2 { width: 300px; height: 300px; background: rgba(94,92,230,.12); bottom: 0; left: -60px; opacity: 0.5; }
.orb-3 { width: 200px; height: 200px; background: rgba(255,55,95,.08); top: 50%; left: 40%; opacity: 0.4; }

.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: 20px; background: var(--accent-soft);
  color: var(--accent); font-size: 0.82rem; font-weight: 600; margin-bottom: 24px;
}
.badge-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

.hero-title {
  font-size: 3.2rem; font-weight: 800; line-height: 1.15;
  letter-spacing: -0.03em; margin-bottom: 20px;
}
.gradient-text {
  background: var(--logo-gradient);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
.hero-desc {
  font-size: 1.05rem; color: var(--text-secondary);
  line-height: 1.7; margin-bottom: 32px; max-width: 480px;
}
.hero-actions { display: flex; gap: 14px; margin-bottom: 28px; }
.hero-meta { display: flex; gap: 20px; }
.meta-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.8rem; color: var(--text-tertiary);
}

/* Hero Preview Card */
.hero-preview {
  border-radius: 20px; overflow: hidden;
  transform: perspective(800px) rotateY(-4deg) rotateX(2deg);
  transition: transform 0.4s;
}
.hero-preview:hover { transform: perspective(800px) rotateY(0) rotateX(0); }
.preview-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--glass-border);
}
.preview-dots { display: flex; gap: 5px; }
.preview-dots span { width: 10px; height: 10px; border-radius: 50%; }
.preview-dots span:nth-child(1) { background: #ff5f57; }
.preview-dots span:nth-child(2) { background: #febc2e; }
.preview-dots span:nth-child(3) { background: #28c840; }
.preview-title { font-size: 0.8rem; color: var(--text-tertiary); font-weight: 500; }
.preview-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 14px; padding: 22px;
}
.preview-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 14px 6px; border-radius: 12px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  transition: all 0.2s;
}
.preview-item:hover { transform: translateY(-2px); }
.preview-icon { font-size: 1.6rem; }
.preview-name { font-size: 0.72rem; color: var(--text-secondary); text-align: center; }

/* ===== Stats ===== */
.stats { padding: 60px 0; }
.stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
}
.stat-card {
  border-radius: 18px; padding: 28px 20px; text-align: center;
  transition: transform 0.3s;
}
.stat-card:hover { transform: translateY(-3px); }
.stat-value {
  font-size: 2.4rem; font-weight: 800; letter-spacing: -0.02em;
  background: var(--logo-gradient);
  -webkit-background-clip: text; background-clip: text;
  color: transparent; margin-bottom: 6px;
}
.stat-unit { font-size: 1.2rem; font-weight: 600; }
.stat-label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }

/* ===== Features ===== */
.features { padding: 80px 0; }
.features-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;
}
.feature-card {
  border-radius: 20px; padding: 30px 26px;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--card-hover-shadow);
  border-color: var(--accent-soft);
}
.feature-icon-wrap {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
}
.feature-card h3 { font-size: 1.05rem; font-weight: 650; margin-bottom: 8px; }
.feature-card p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55; }

/* ===== How ===== */
.how { padding: 80px 0; }
.steps {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  position: relative;
}
.steps::before {
  content: ''; position: absolute; top: 56px; left: 16%; right: 16%;
  height: 2px; background: linear-gradient(90deg, transparent, var(--border), transparent);
  z-index: 0;
}
.step-card {
  border-radius: 20px; padding: 32px 24px; text-align: center;
  position: relative; z-index: 1;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.step-card:hover { transform: translateY(-4px); }
.step-number {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--accent); color: #fff; font-weight: 700; font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.step-icon { color: var(--accent); margin-bottom: 14px; display: flex; justify-content: center; }
.step-card h3 { font-size: 1.05rem; font-weight: 650; margin-bottom: 8px; }
.step-card p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.55; }

/* ===== Why ===== */
.why { padding: 80px 0; }
.why-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.why-card {
  border-radius: 16px; padding: 22px 20px; display: flex; gap: 14px;
  transition: all 0.3s;
}
.why-card:hover { transform: translateY(-2px); border-color: var(--accent-soft); }
.why-check {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.8rem;
}
.why-card strong { font-size: 0.9rem; color: var(--text-primary); display: block; margin-bottom: 4px; }
.why-card p { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }

/* ===== Tech ===== */
.tech { padding: 80px 0; }
.tech-grid {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px;
}
.tech-card {
  border-radius: 18px; padding: 24px 12px; text-align: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tech-card:hover { transform: translateY(-4px); border-color: var(--accent-soft); }
.tech-icon { margin-bottom: 10px; display: flex; justify-content: center; }
.tech-name { font-size: 0.88rem; font-weight: 650; margin-bottom: 2px; }
.tech-role { font-size: 0.72rem; color: var(--text-tertiary); }

/* ===== CTA ===== */
.cta { padding: 80px 0; }
.cta-card {
  position: relative; border-radius: 28px; padding: 64px 40px;
  text-align: center; overflow: hidden;
  background: linear-gradient(135deg, var(--accent-soft) 0%, var(--glass-bg) 40%, var(--glass-bg) 100%);
  border: 1px solid var(--glass-border);
}
.cta-glow {
  position: absolute; width: 400px; height: 400px;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  top: -60px; right: -100px; pointer-events: none; opacity: 0.5;
}
.cta-card h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; position: relative; }
.cta-card p { font-size: 1rem; color: var(--text-secondary); margin-bottom: 28px; position: relative; }
.cta-buttons { display: flex; gap: 14px; justify-content: center; position: relative; }

/* ===== Footer ===== */
.footer { padding: 64px 0 32px; border-top: 1px solid var(--divider); margin-top: 40px; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
.footer-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.footer-logo-img { width: 28px; height: 28px; border-radius: 6px; }
.footer-brand span { font-size: 1rem; font-weight: 650; }
.footer-tagline { font-size: 0.82rem; color: var(--text-tertiary); margin: 0; }
.footer-col h4 { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 16px; }
.footer-col a { display: block; font-size: 0.85rem; color: var(--text-secondary); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
.footer-col a:hover { color: var(--accent); }
.footer-bottom { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--divider); text-align: center; }
.footer-bottom p { font-size: 0.78rem; color: var(--text-tertiary); margin: 0 0 6px; }
.beian-link { font-size: 0.72rem; color: var(--text-tertiary); text-decoration: none; }

/* ===== Responsive ===== */
@media (max-width: 968px) {
  .hero-container { grid-template-columns: 1fr; gap: 40px; }
  .hero { padding: 120px 20px 60px; }
  .hero-title { font-size: 2.4rem; }
  .hero-preview { transform: none; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .steps { grid-template-columns: 1fr; }
  .steps::before { display: none; }
  .why-grid { grid-template-columns: repeat(2, 1fr); }
  .tech-grid { grid-template-columns: repeat(3, 1fr); }
  .footer-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .section-container { padding: 0 16px; }
  .hero { padding: 100px 16px 50px; }
  .hero-title { font-size: 1.9rem; }
  .hero-actions { flex-direction: column; }
  .hero-desc { font-size: 0.95rem; }
  .hero-meta { flex-wrap: wrap; gap: 12px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stat-value { font-size: 1.8rem; }
  .features-grid { grid-template-columns: 1fr; }
  .why-grid { grid-template-columns: 1fr; }
  .tech-grid { grid-template-columns: repeat(2, 1fr); }
  .cta-card { padding: 40px 20px; }
  .cta-buttons { flex-direction: column; align-items: center; }
  .footer-grid { grid-template-columns: 1fr; gap: 24px; }
  .nav-links { display: none; }
}
/* ===== 统一布局与交互优化 ===== */
.nav-brand { text-decoration: none; }
.nav-container,
.hero-container,
.section-container { width: min(1580px, calc(100% - 32px)); max-width: 1580px; }
.landing-nav { transition: background .3s cubic-bezier(.25,.1,.25,1), border-color .3s cubic-bezier(.25,.1,.25,1), box-shadow .3s cubic-bezier(.25,.1,.25,1); }
.landing-nav.scrolled { box-shadow: 0 12px 40px rgba(15, 23, 42, .06); }
.nav-links a,
.nav-links :deep(a) { position: relative; }
.nav-links a::after,
.nav-links :deep(a)::after { content: ''; position: absolute; left: 50%; right: 50%; bottom: -8px; height: 2px; border-radius: 2px; background: var(--primary); transition: left .3s cubic-bezier(.25,.1,.25,1), right .3s cubic-bezier(.25,.1,.25,1); }
.nav-links a:hover::after,
.nav-links :deep(a):hover::after { left: 0; right: 0; }
.hero { padding: 112px 16px 58px; min-height: min(740px, 90vh); display: flex; align-items: center; }
.hero-container { width: 100%; grid-template-columns: minmax(0, 1.05fr) minmax(440px, .95fr); gap: clamp(48px, 7vw, 96px); }
.hero-desc { max-width: 650px; }
.hero-preview { transform: perspective(900px) rotateY(-2deg) rotateX(1deg); box-shadow: 0 24px 70px rgba(15, 23, 42, .10), inset 0 1px 0 rgba(255,255,255,.36); }
.preview-grid { padding-bottom: 16px; }
.preview-item { border: 1px solid transparent; color: inherit; font: inherit; cursor: pointer; }
.preview-item:hover,
.preview-item:focus-visible,
.preview-item.active { transform: translateY(-2px); border-color: color-mix(in srgb, var(--primary) 28%, transparent); background: color-mix(in srgb, var(--primary) 9%, var(--btn-bg)); outline: none; box-shadow: 0 8px 22px color-mix(in srgb, var(--primary) 10%, transparent); }
.preview-feedback { margin: 0 22px 20px; padding: 12px 14px; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; border-radius: 14px; background: var(--btn-bg); border: 1px solid var(--divider); }
.preview-feedback span { font-size: .72rem; color: var(--text-tertiary); }
.preview-feedback strong { font-size: .84rem; color: var(--text-primary); }
.preview-feedback a { font-size: .76rem; color: var(--primary); text-decoration: none; font-weight: 650; }
.stats,
.features,
.how,
.why,
.tech,
.cta { scroll-margin-top: 96px; }
.features,
.how,
.why,
.tech { padding-block: 64px; }
.section-head { margin-bottom: 36px; }
.glass-card,
.btn,
.nav-icon { transition-duration: .3s; transition-timing-function: cubic-bezier(.25,.1,.25,1); }
.btn:active,
.nav-icon:active,
.preview-item:active { transform: scale(.98); }
@media (max-width: 968px) {
  .hero { min-height: auto; }
  .hero-container { grid-template-columns: 1fr; }
  .hero-right { max-width: 680px; width: 100%; margin: 0 auto; }
}
@media (max-width: 640px) {
  .nav-container,
  .hero-container,
  .section-container { width: 100%; }
  .nav-links { display: none; }
  .nav-container { height: 64px; padding-inline: 12px; }
  .nav-left { min-width: 0; }
  .nav-right { gap: 6px; }
  .nav-right .btn { min-height: 40px; padding: 8px 11px; font-size: .78rem; white-space: nowrap; }
  .nav-icon { width: 40px; height: 40px; padding: 0; flex: 0 0 40px; }
  .brand-logo { width: 26px; height: 26px; }
  .brand-text { font-size: 1.05rem; }
  .hero { padding-top: 108px; }
  .preview-feedback { grid-template-columns: 1fr auto; }
  .preview-feedback span { display: none; }
}
</style>
