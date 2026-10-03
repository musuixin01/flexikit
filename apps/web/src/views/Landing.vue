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
            <a href="#showcase">产品体验</a>
            <a href="#features">核心能力</a>
            <a href="#privacy">隐私设计</a>
            <router-link to="/discover">发现工具</router-link>
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
            FlexiKit · AI 工作伙伴与桌面工作台
          </div>
          <h1 class="hero-title">
            把<span class="gradient-text">工具、AI 与桌面</span><br />收进一个灵巧空间
          </h1>
          <p class="hero-desc">
            不是再加一个工具，而是把网页工具、本地应用、AI 助手与 Desktop Canvas
            收敛到同一个工作入口，让每天真正会用到的东西更快抵达。
          </p>
          <div class="hero-actions">
            <router-link to="/app" class="btn btn-primary btn-lg">
              打开 FlexiKit
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </router-link>
            <a href="#showcase" class="btn btn-outline btn-lg">
              看看它如何工作
            </a>
          </div>
          <div class="hero-meta" aria-label="FlexiKit 核心原则">
            <div class="meta-item"><span class="meta-dot"></span>本地优先</div>
            <div class="meta-item"><span class="meta-dot"></span>显式授权</div>
            <div class="meta-item"><span class="meta-dot"></span>自由定制</div>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-preview glass-card">
            <div class="preview-topbar">
              <div class="preview-dots"><span></span><span></span><span></span></div>
              <span class="preview-title">FlexiKit Workspace</span>
              <span class="preview-status"><i></i> Ready</span>
            </div>
            <div class="preview-shell">
              <aside class="preview-sidebar" aria-label="工作台预览导航">
                <span class="preview-mark">F</span>
                <button class="preview-side-item active" type="button" aria-label="工作台">⌂</button>
                <button class="preview-side-item" type="button" aria-label="发现">◇</button>
                <button class="preview-side-item" type="button" aria-label="AI 助手">✦</button>
                <span class="preview-side-spacer"></span>
                <button class="preview-side-item" type="button" aria-label="设置">◐</button>
              </aside>
              <div class="preview-main">
                <div class="preview-main-head">
                  <span>WORKSPACE</span>
                  <strong>今天，从这里开始</strong>
                </div>
                <div class="preview-command">
                  <span>⌕</span>
                  <span class="preview-command-copy">搜索工具、应用，或让 AI 帮你处理下一步</span>
                  <kbd>Ctrl K</kbd>
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
                    <span class="preview-copy">
                      <strong>{{ item.name }}</strong>
                      <small>{{ item.meta }}</small>
                    </span>
                  </button>
                </div>
                <div class="preview-assistant" aria-live="polite">
                  <span class="assistant-avatar">✦</span>
                  <span class="assistant-copy">
                    <small>AI ASSISTANT</small>
                    <strong>{{ previewTools[activePreview].prompt }}</strong>
                  </span>
                  <router-link to="/app" aria-label="进入 FlexiKit">↗</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 产品能力带 ===== -->
    <section id="showcase" class="product-strip">
      <div class="section-container">
        <div class="product-strip-grid glass-card">
          <article v-for="item in proofItems" :key="item.title" class="proof-item">
            <span class="proof-index">{{ item.index }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ===== 核心功能 ===== -->
    <section id="features" class="features">
      <div class="section-container">
        <div class="section-head section-head-left">
          <span class="section-tag">一个入口</span>
          <h2>不是更多功能，而是更少切换</h2>
          <p>把真正高频的工作流收敛到一个界面，让工具、AI 和桌面之间的跳转自然消失。</p>
        </div>
        <div class="features-grid">
          <article v-for="f in features" :key="f.title" class="feature-card glass-card">
            <div class="feature-card-top">
              <span class="feature-kicker">{{ f.kicker }}</span>
              <div class="feature-icon-wrap" :style="{ background: f.color + '14', color: f.color }">
                <span v-html="f.icon"></span>
              </div>
            </div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
            <div class="feature-note">{{ f.note }}</div>
          </article>
        </div>
      </div>
    </section>

    <!-- ===== 使用步骤 ===== -->
    <section id="how" class="how">
      <div class="section-container">
        <div class="section-head">
          <span class="section-tag">顺手就够了</span>
          <h2>从打开到顺手，没有学习成本</h2>
          <p>收进来、排成你的样子，再把重复判断交给 AI 与桌面工作流。</p>
        </div>
        <div class="steps">
          <div v-for="(step, i) in steps" :key="step.title" class="step-card glass-card">
            <div class="step-number">0{{ i + 1 }}</div>
            <div class="step-icon" v-html="step.icon"></div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 隐私与边界 ===== -->
    <section id="privacy" class="why trust-section">
      <div class="section-container">
        <div class="section-head section-head-left">
          <span class="section-tag">Privacy by design</span>
          <h2>效率提升，不应该用隐私来交换</h2>
          <p>FlexiKit 把授权边界做成产品体验的一部分：能留在本地的就留在本地，需要读取的内容由你主动触发。</p>
        </div>
        <div class="why-grid trust-grid">
          <div class="why-card glass-card">
            <div class="why-check">01</div>
            <div>
              <strong>本机行为，本机使用</strong>
              <p>工具打开、收藏等个性化行为用于本机推荐，不上传为云端行为画像。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">02</div>
            <div>
              <strong>文件与剪贴板按需授权</strong>
              <p>只有你主动选择文件或点击读取剪贴板时，AI 才获得本次上下文。</p>
            </div>
          </div>
          <div class="why-card glass-card">
            <div class="why-check">03</div>
            <div>
              <strong>BYOK 密钥由设备保管</strong>
              <p>桌面端 API Key 使用本机安全存储，只在请求瞬间读取，不进入普通业务数据。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="cta">
      <div class="section-container">
        <div class="cta-card">
          <div class="cta-glow"></div>
          <span class="cta-eyebrow">YOUR WORKSPACE, YOUR RULES</span>
          <h2>把每天真正会用到的东西，放回一个入口</h2>
          <p>先从工作台开始，再按你的习惯一点点把工具、AI 与桌面工作流收进来。</p>
          <div class="cta-buttons">
            <router-link to="/app" class="btn btn-primary btn-lg">
              进入工作台
            </router-link>
            <router-link to="/discover" class="btn btn-outline btn-lg">
              发现工具
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
            <p class="footer-tagline">工具、AI 与桌面工作流的统一入口</p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'

const user = useUserStore()
const ui = useUiStore()

const themeIcon = ref('🌙')
const isScrolled = ref(false)
const activePreview = ref(0)
const themeToggleLabel = computed(() => themeIcon.value === '☀️' ? '切换至深色模式' : '切换至浅色模式')

const previewTools = [
  { icon: '⌘', name: '快速启动', meta: '本地与 Web', prompt: '我可以帮你从常用入口开始，减少来回切换。' },
  { icon: '✦', name: 'AI 助手', meta: '上下文可控', prompt: '把当前工具或你授权的内容交给我，我来处理下一步。' },
  { icon: '◇', name: '智能发现', meta: '推荐可解释', prompt: '根据你的本机偏好与公开热度，找到更合适的工具。' },
  { icon: '▦', name: 'Desktop Canvas', meta: '桌面工作流', prompt: '把高频组件直接放到桌面，让工作流真正贴近你。' },
]

const proofItems = [
  { index: '01', title: 'Desktop Canvas', desc: '把启动器、待办、搜索、AI 等组件直接放进桌面工作流。' },
  { index: '02', title: 'AI Assistant', desc: '工具、文件与剪贴板上下文都由你决定何时授权。' },
  { index: '03', title: 'Smart Discovery', desc: '融合公开热度与本机偏好，推荐结果同时给出解释。' },
  { index: '04', title: 'Privacy First', desc: '本机行为不上传，敏感上下文不默认持久化。' },
]

const features = [
  { kicker: 'DESKTOP CANVAS', icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h8v3H8z"/></svg>', title: '桌面不再只是放图标', desc: '把 Launcher、Todo、Search、AI Prompt 等组件直接组合成自己的桌面工作台。', note: '可拖拽 · 可缩放 · 多显示器/DPI 适配', color: '#0071e3' },
  { kicker: 'AI ASSISTANT', icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/></svg>', title: 'AI 是工作伙伴，不是另一个聊天页', desc: '按需带入当前工具、文件或剪贴板上下文，Provider 与 BYOK 都由你自己选择。', note: '上下文显式授权 · 对话默认仅本次会话', color: '#6366f1' },
  { kicker: 'UNIFIED LAUNCHER', icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16M12 4v16"/><circle cx="12" cy="12" r="9"/></svg>', title: '网页工具和本地应用，一个入口', desc: '收藏、分类、搜索、快速启动都回到同一个地方，不再记住一堆位置。', note: 'Web + Local · 快速搜索 · 自定义布局', color: '#ff9500' },
  { kicker: 'SMART DISCOVERY', icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/><path d="M8.5 11.5l1.8 1.8 3.6-4.1"/></svg>', title: '推荐不只给结果，也告诉你为什么', desc: '公开热度、语义相似与本机偏好协同工作，同时保留清晰的推荐解释。', note: '本机偏好不上传 · 推荐原因可见', color: '#30b0c7' },
]

const steps = [
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h10M4 17h13"/><path d="M18 10l2 2-2 2"/></svg>', title: '把高频入口收进来', desc: '网页工具、本地应用和常用入口先统一，不再分散在书签、桌面与启动器里。' },
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>', title: '排成你的工作方式', desc: '分类、拖拽、主题与 Desktop Canvas 都围绕你的习惯组织，而不是逼你适应软件。' },
  { icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"/><path d="M5 18h14"/></svg>', title: '把下一步交给 AI', desc: '需要时再授权当前工具、文件或剪贴板，让 AI 在明确边界里继续你的工作流。' },
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

onMounted(() => {
  updateThemeIcon()
  window.addEventListener('scroll', onScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
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
  transition: color .3s cubic-bezier(.25,.1,.25,1);
}
.nav-links a:hover { color: var(--text-primary); }
.nav-right { display: flex; align-items: center; gap: 10px; }
.nav-icon {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 10px; background: var(--btn-bg);
  cursor: pointer; font-size: 1.1rem; transition: background .3s cubic-bezier(.25,.1,.25,1);
}
.nav-icon:hover { background: var(--btn-bg-hover); }

/* ===== 按钮 ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 12px; font-size: 0.88rem;
  font-weight: 600; text-decoration: none; cursor: pointer;
  transition: all .3s cubic-bezier(.25,.1,.25,1); border: none; font-family: inherit;
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
  transition: transform .3s cubic-bezier(.25,.1,.25,1);
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
  transition: all .3s cubic-bezier(.25,.1,.25,1);
}
.preview-item:hover { transform: translateY(-2px); }
.preview-icon { font-size: 1.6rem; }

/* ===== Features ===== */
.features { padding: 80px 0; }
.features-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;
}
.feature-card {
  border-radius: 20px; padding: 30px 26px;
  transition: all .3s cubic-bezier(.25,.1,.25,1);
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
  transition: all .3s cubic-bezier(.25,.1,.25,1);
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
.footer-col a { display: block; font-size: 0.85rem; color: var(--text-secondary); text-decoration: none; margin-bottom: 10px; transition: color .3s cubic-bezier(.25,.1,.25,1); }
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
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .steps { grid-template-columns: 1fr; }
  .steps::before { display: none; }
  .why-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .section-container { padding: 0 16px; }
  .hero { padding: 100px 16px 50px; }
  .hero-title { font-size: 1.9rem; }
  .hero-actions { flex-direction: column; }
  .hero-desc { font-size: 0.95rem; }
  .hero-meta { flex-wrap: wrap; gap: 12px; }
  .features-grid { grid-template-columns: 1fr; }
  .why-grid { grid-template-columns: 1fr; }
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
.features,
.how,
.why,
.cta { scroll-margin-top: 96px; }
.features,
.how,
.why { padding-block: 64px; }
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
}
/* ===== Landing V2 · premium product narrative ===== */
.landing-page {
  position: relative;
  overflow: clip;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 78% 8%, color-mix(in srgb, var(--primary) 12%, transparent) 0, transparent 30%),
    radial-gradient(circle at 14% 30%, color-mix(in srgb, var(--accent) 9%, transparent) 0, transparent 28%),
    linear-gradient(180deg, var(--body-bg) 0%, color-mix(in srgb, var(--bg-tertiary) 72%, var(--body-bg)) 100%);
}
.landing-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .18;
  background-image:
    linear-gradient(color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--text-primary) 5%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,.35), transparent 58%);
  z-index: 0;
}
.landing-nav {
  top: 12px;
  left: 16px;
  right: 16px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 82%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--glass-bg) 74%, transparent);
  box-shadow: 0 10px 34px rgba(15, 23, 42, .055), inset 0 1px 0 rgba(255,255,255,.18);
}
.landing-nav.scrolled {
  background: color-mix(in srgb, var(--glass-bg) 92%, transparent);
  border-color: color-mix(in srgb, var(--glass-border) 94%, transparent);
  box-shadow: 0 16px 46px rgba(15, 23, 42, .09), inset 0 1px 0 rgba(255,255,255,.2);
}
.nav-container {
  height: 60px;
  width: min(1320px, calc(100% - 28px));
  padding-inline: 2px;
}
.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(15,23,42,.08);
}
.brand-text {
  color: var(--text-primary);
  background: none;
  font-weight: 760;
  letter-spacing: -.025em;
}
.nav-links { gap: 24px; }
.nav-links a { font-size: .82rem; font-weight: 580; }
.nav-icon,
.btn {
  transition:
    transform .3s cubic-bezier(.25,.1,.25,1),
    box-shadow .3s cubic-bezier(.25,.1,.25,1),
    background .3s cubic-bezier(.25,.1,.25,1),
    border-color .3s cubic-bezier(.25,.1,.25,1);
}
.btn {
  min-height: 42px;
  border-radius: 14px;
}
.btn-primary {
  background: var(--primary);
  box-shadow: 0 10px 28px color-mix(in srgb, var(--primary) 24%, transparent), inset 0 1px 0 rgba(255,255,255,.24);
}
.btn-primary:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 16px 34px color-mix(in srgb, var(--primary) 28%, transparent), inset 0 1px 0 rgba(255,255,255,.25);
}
.btn-outline {
  background: color-mix(in srgb, var(--glass-bg) 72%, transparent);
  border-color: color-mix(in srgb, var(--glass-border) 88%, transparent);
  backdrop-filter: blur(20px) saturate(150%);
}
.btn-outline:hover {
  transform: translateY(-2px);
  background: color-mix(in srgb, var(--btn-bg-hover) 80%, transparent);
}
.btn-lg {
  min-height: 52px;
  padding: 14px 22px;
  border-radius: 16px;
  font-size: .9rem;
}
.hero {
  min-height: 820px;
  padding: 132px 20px 88px;
  align-items: center;
}
.hero-container {
  width: min(1320px, calc(100% - 24px));
  max-width: 1320px;
  grid-template-columns: minmax(0, 1fr) minmax(500px, .94fr);
  gap: clamp(54px, 7vw, 104px);
}
.hero-left { max-width: 680px; }
.hero-badge {
  margin-bottom: 22px;
  padding: 8px 13px;
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--glass-border));
  background: color-mix(in srgb, var(--glass-bg) 74%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
  backdrop-filter: blur(18px) saturate(150%);
  color: var(--text-secondary);
  font-size: .76rem;
  letter-spacing: .025em;
}
.badge-dot {
  width: 6px;
  height: 6px;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary) 11%, transparent);
  animation: landingPulse 2.6s cubic-bezier(.25,.1,.25,1) infinite;
}
@keyframes landingPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .52; transform: scale(.86); }
}
.hero-title {
  max-width: 760px;
  margin-bottom: 24px;
  font-size: clamp(3rem, 5.2vw, 5.35rem);
  line-height: 1.035;
  letter-spacing: -.058em;
  font-weight: 790;
  text-wrap: balance;
}
.gradient-text {
  background:
    linear-gradient(102deg,
      var(--primary) 0%,
      color-mix(in srgb, var(--primary) 58%, var(--accent)) 46%,
      var(--accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
}
.hero-desc {
  max-width: 620px;
  margin-bottom: 30px;
  color: var(--text-secondary);
  font-size: clamp(1rem, 1.35vw, 1.12rem);
  line-height: 1.82;
}
.hero-actions { gap: 10px; margin-bottom: 26px; }
.hero-meta { gap: 18px; }
.meta-item {
  gap: 8px;
  color: var(--text-tertiary);
  font-size: .76rem;
  letter-spacing: .015em;
}
.meta-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 72%, var(--text-secondary));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 8%, transparent);
}
.hero-bg-orb { filter: blur(96px); }
.orb-1 {
  width: 560px; height: 560px; top: -160px; right: -80px;
  opacity: .42;
  animation: orbFloatA 12s cubic-bezier(.25,.1,.25,1) infinite alternate;
}
.orb-2 {
  width: 360px; height: 360px; left: -120px; bottom: 20px;
  opacity: .34;
  animation: orbFloatB 14s cubic-bezier(.25,.1,.25,1) infinite alternate;
}
.orb-3 {
  width: 260px; height: 260px; left: 44%; top: 46%;
  opacity: .28;
}
@keyframes orbFloatA { to { transform: translate3d(-42px, 32px, 0) scale(1.06); } }
@keyframes orbFloatB { to { transform: translate3d(34px, -28px, 0) scale(.94); } }

.hero-preview {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  transform: perspective(1100px) rotateY(-3deg) rotateX(1.3deg);
  background: color-mix(in srgb, var(--glass-bg) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, transparent);
  box-shadow:
    0 36px 100px rgba(15,23,42,.14),
    0 8px 28px rgba(15,23,42,.08),
    inset 0 1px 0 rgba(255,255,255,.34);
  transition:
    transform .45s cubic-bezier(.25,.1,.25,1),
    box-shadow .45s cubic-bezier(.25,.1,.25,1);
}
.hero-preview:hover {
  transform: perspective(1100px) rotateY(0) rotateX(0) translateY(-4px);
  box-shadow:
    0 44px 120px rgba(15,23,42,.17),
    0 10px 30px rgba(15,23,42,.08),
    inset 0 1px 0 rgba(255,255,255,.36);
}
.preview-topbar {
  min-height: 52px;
  padding: 0 16px;
  gap: 12px;
  background: color-mix(in srgb, var(--btn-bg) 52%, transparent);
}
.preview-title {
  flex: 1;
  font-size: .72rem;
  letter-spacing: .02em;
}
.preview-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: .66rem;
  font-weight: 650;
}
.preview-status i {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent);
}
.preview-shell {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  min-height: 430px;
}
.preview-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 16px 10px;
  border-right: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--btn-bg) 48%, transparent);
}
.preview-mark {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  margin-bottom: 8px;
  border-radius: 11px;
  color: #fff;
  background: var(--primary);
  font-size: .82rem;
  font-weight: 800;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 22%, transparent);
}
.preview-side-item {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-tertiary);
  background: transparent;
  font: inherit;
  cursor: default;
}
.preview-side-item.active {
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 18%, transparent);
  background: color-mix(in srgb, var(--primary) 9%, transparent);
}
.preview-side-spacer { flex: 1; }
.preview-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px 24px 22px;
}
.preview-main-head { display: grid; gap: 4px; }
.preview-main-head span,
.assistant-copy small {
  color: var(--text-tertiary);
  font-size: .61rem;
  font-weight: 700;
  letter-spacing: .12em;
}
.preview-main-head strong {
  color: var(--text-primary);
  font-size: 1.18rem;
  letter-spacing: -.02em;
}
.preview-command {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 13px;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--body-bg) 58%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
  color: var(--text-tertiary);
}
.preview-command-copy {
  min-width: 0;
  overflow: hidden;
  font-size: .72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-command kbd {
  padding: 3px 7px;
  border: 1px solid var(--divider);
  border-radius: 7px;
  color: var(--text-tertiary);
  background: var(--btn-bg);
  font-family: inherit;
  font-size: .6rem;
}
.preview-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0;
}
.preview-item {
  min-height: 82px;
  align-items: flex-start;
  flex-direction: row;
  justify-content: flex-start;
  gap: 11px;
  padding: 13px;
  border-radius: 15px;
  background: color-mix(in srgb, var(--glass-bg) 72%, transparent);
}
.preview-item:hover,
.preview-item:focus-visible,
.preview-item.active {
  transform: translateY(-2px) scale(1.01);
  border-color: color-mix(in srgb, var(--primary) 26%, transparent);
  background: color-mix(in srgb, var(--primary) 8%, var(--glass-bg));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary) 9%, transparent);
}
.preview-icon {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  width: 36px; height: 36px;
  border-radius: 11px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 9%, var(--btn-bg));
  font-size: 1rem;
  font-weight: 750;
}
.preview-copy { display: grid; gap: 3px; min-width: 0; text-align: left; }
.preview-copy strong { color: var(--text-primary); font-size: .75rem; font-weight: 680; }
.preview-copy small { color: var(--text-tertiary); font-size: .62rem; }
.preview-assistant {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  margin-top: auto;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--glass-border));
  border-radius: 16px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--primary) 8%, var(--glass-bg)),
      color-mix(in srgb, var(--accent) 5%, var(--glass-bg)));
}
.assistant-avatar {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 48%, var(--accent)));
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary) 16%, transparent);
}
.assistant-copy { display: grid; gap: 3px; min-width: 0; }
.assistant-copy strong {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: .68rem;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-assistant a {
  display: grid;
  place-items: center;
  width: 30px; height: 30px;
  border-radius: 9px;
  color: var(--primary);
  text-decoration: none;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.product-strip { position: relative; z-index: 2; padding: 0 0 74px; }
.product-strip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  overflow: hidden;
  border-radius: 22px;
  background: color-mix(in srgb, var(--glass-bg) 78%, transparent);
}
.proof-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  min-height: 128px;
  padding: 24px 22px;
  border-right: 1px solid var(--glass-border);
}
.proof-item:last-child { border-right: 0; }
.proof-index {
  color: var(--primary);
  font-size: .62rem;
  font-weight: 760;
  letter-spacing: .08em;
}
.proof-item strong {
  display: block;
  margin-bottom: 7px;
  color: var(--text-primary);
  font-size: .84rem;
  font-weight: 680;
}
.proof-item p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: .73rem;
  line-height: 1.55;
}

.features,
.how,
.why,
.cta { position: relative; z-index: 1; }
.features { padding: 90px 0 72px; }
.section-head-left {
  max-width: 760px;
  text-align: left;
}
.section-head-left p { margin-inline: 0; max-width: 650px; }
.section-head h2 {
  font-size: clamp(2rem, 3.4vw, 3.4rem);
  line-height: 1.12;
  letter-spacing: -.045em;
  font-weight: 750;
  text-wrap: balance;
}
.section-head p { line-height: 1.72; }
.section-tag {
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  background: color-mix(in srgb, var(--primary) 7%, transparent);
  color: var(--primary);
  font-size: .65rem;
  letter-spacing: .1em;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.feature-card {
  grid-column: span 6;
  min-height: 286px;
  padding: 28px;
  overflow: hidden;
  border-radius: 24px;
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--glass-bg) 92%, transparent),
      color-mix(in srgb, var(--btn-bg) 58%, transparent));
  box-shadow: 0 12px 40px rgba(15,23,42,.055), inset 0 1px 0 rgba(255,255,255,.18);
}
.feature-card:nth-child(1),
.feature-card:nth-child(4) { grid-column: span 7; }
.feature-card:nth-child(2),
.feature-card:nth-child(3) { grid-column: span 5; }
.feature-card:hover {
  transform: translateY(-4px) scale(1.006);
  border-color: color-mix(in srgb, var(--primary) 20%, var(--glass-border));
  box-shadow: 0 20px 54px rgba(15,23,42,.09), inset 0 1px 0 rgba(255,255,255,.2);
}
.feature-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 46px;
}
.feature-kicker {
  color: var(--text-tertiary);
  font-size: .64rem;
  font-weight: 720;
  letter-spacing: .11em;
}
.feature-icon-wrap {
  width: 50px; height: 50px;
  margin: 0;
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent);
}
.feature-card h3 {
  max-width: 520px;
  margin-bottom: 10px;
  font-size: clamp(1.2rem, 2vw, 1.72rem);
  line-height: 1.22;
  letter-spacing: -.028em;
}
.feature-card p {
  max-width: 540px;
  margin: 0;
  color: var(--text-secondary);
  font-size: .88rem;
  line-height: 1.68;
}
.feature-note {
  margin-top: 20px;
  color: var(--text-tertiary);
  font-size: .69rem;
  letter-spacing: .01em;
}

.how { padding: 86px 0; }
.steps { gap: 14px; }
.steps::before { display: none; }
.step-card {
  min-height: 300px;
  padding: 28px;
  text-align: left;
  border-radius: 22px;
  background: color-mix(in srgb, var(--glass-bg) 78%, transparent);
}
.step-card:hover { transform: translateY(-3px); }
.step-number {
  width: auto; height: auto;
  margin: 0 0 52px;
  justify-content: flex-start;
  color: var(--text-tertiary);
  background: transparent;
  font-size: .64rem;
  letter-spacing: .12em;
}
.step-icon { justify-content: flex-start; margin-bottom: 20px; color: var(--primary); }
.step-card h3 {
  margin-bottom: 10px;
  font-size: 1.08rem;
  letter-spacing: -.015em;
}
.step-card p { font-size: .82rem; line-height: 1.7; }

.trust-section { padding: 88px 0; }
.trust-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
.trust-grid .why-card {
  min-height: 210px;
  padding: 24px;
  align-items: flex-start;
  border-radius: 22px;
  background: color-mix(in srgb, var(--glass-bg) 76%, transparent);
}
.trust-grid .why-check {
  width: 34px; height: 34px;
  border-radius: 11px;
  font-size: .62rem;
  letter-spacing: .04em;
}
.trust-grid .why-card strong {
  margin: 4px 0 9px;
  font-size: .95rem;
}
.trust-grid .why-card p { font-size: .79rem; line-height: 1.68; }

.cta { padding: 88px 0 104px; }
.cta-card {
  padding: 76px 44px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 75% 20%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 38%),
    radial-gradient(circle at 20% 100%, color-mix(in srgb, var(--primary) 13%, transparent), transparent 42%),
    color-mix(in srgb, var(--glass-bg) 80%, transparent);
  box-shadow: 0 24px 70px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.24);
}
.cta-eyebrow {
  position: relative;
  display: inline-block;
  margin-bottom: 18px;
  color: var(--primary);
  font-size: .65rem;
  font-weight: 760;
  letter-spacing: .13em;
}
.cta-card h2 {
  max-width: 820px;
  margin: 0 auto 14px;
  font-size: clamp(2rem, 4.2vw, 4rem);
  line-height: 1.08;
  letter-spacing: -.05em;
  text-wrap: balance;
}
.cta-card p {
  max-width: 620px;
  margin: 0 auto 30px;
  line-height: 1.7;
}
.footer {
  margin-top: 0;
  background: color-mix(in srgb, var(--body-bg) 68%, transparent);
}
.footer-tagline { max-width: 260px; line-height: 1.55; }

@media (max-width: 1080px) {
  .hero { min-height: auto; padding-top: 126px; }
  .hero-container { grid-template-columns: 1fr; gap: 52px; }
  .hero-left { max-width: 820px; }
  .hero-right { max-width: 760px; width: 100%; margin: 0 auto; }
  .hero-title { max-width: 860px; }
  .product-strip-grid { grid-template-columns: repeat(2, 1fr); }
  .proof-item:nth-child(2) { border-right: 0; }
  .proof-item:nth-child(-n+2) { border-bottom: 1px solid var(--glass-border); }
  .feature-card,
  .feature-card:nth-child(n) { grid-column: span 6; }
}
@media (max-width: 720px) {
  .landing-nav { top: 8px; left: 8px; right: 8px; border-radius: 16px; }
  .nav-container { width: 100%; height: 58px; padding-inline: 10px; }
  .nav-right .btn-ghost { display: none; }
  .hero { padding: 112px 14px 64px; }
  .hero-container { width: 100%; gap: 42px; }
  .hero-title { font-size: clamp(2.5rem, 12vw, 4rem); letter-spacing: -.052em; }
  .hero-desc { font-size: .98rem; line-height: 1.72; }
  .hero-actions { flex-direction: row; flex-wrap: wrap; }
  .hero-actions .btn { flex: 1 1 180px; justify-content: center; }
  .hero-meta { gap: 12px; }
  .hero-preview { transform: none; border-radius: 22px; }
  .hero-preview:hover { transform: translateY(-2px); }
  .preview-shell { grid-template-columns: 52px minmax(0, 1fr); min-height: 390px; }
  .preview-sidebar { padding-inline: 7px; }
  .preview-main { padding: 18px 16px 16px; }
  .preview-command kbd { display: none; }
  .preview-command { grid-template-columns: auto 1fr; }
  .preview-grid { grid-template-columns: 1fr; }
  .preview-item { min-height: 66px; }
  .preview-item:nth-child(n+4) { display: none; }
  .preview-assistant { margin-top: 2px; }
  .product-strip { padding-bottom: 48px; }
  .product-strip-grid { grid-template-columns: 1fr; }
  .proof-item {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--glass-border);
  }
  .proof-item:last-child { border-bottom: 0; }
  .features, .how, .trust-section { padding-block: 62px; }
  .section-head { margin-bottom: 30px; }
  .section-head h2 { font-size: clamp(2rem, 9vw, 2.8rem); }
  .features-grid { grid-template-columns: 1fr; }
  .feature-card,
  .feature-card:nth-child(n) { grid-column: auto; min-height: 260px; padding: 24px; }
  .feature-card-top { margin-bottom: 36px; }
  .steps, .trust-grid { grid-template-columns: 1fr; }
  .step-card { min-height: 0; }
  .step-number { margin-bottom: 34px; }
  .trust-grid .why-card { min-height: 0; }
  .cta { padding: 62px 0 80px; }
  .cta-card { padding: 52px 22px; }
  .cta-buttons { width: 100%; align-items: stretch; }
  .cta-buttons .btn { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-bg-orb,
  .badge-dot { animation: none !important; }
  .hero-preview,
  .feature-card,
  .step-card,
  .btn,
  .nav-icon,
  .preview-item { transition-duration: .01ms !important; }
}

</style>
