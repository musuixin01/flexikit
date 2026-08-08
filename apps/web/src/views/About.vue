<template>
  <div class="about-page">
    <!-- ===== 导航 ===== -->
    <nav class="about-nav" :class="{ scrolled: isScrolled }">
      <div class="nav-container">
        <router-link to="/" class="nav-brand">
          <img src="/icon/icon_256x256.ico" alt="FlexiKit" class="brand-logo" />
          <span class="brand-text">FlexiKit</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/discover">发现</router-link>
          <a href="#capabilities">核心能力</a>
          <router-link to="/app" class="nav-cta">进入工具箱</router-link>
        </div>
      </div>
    </nav>

    <!-- ===== Hero ===== -->
    <section class="hero">
      <div class="hero-bg-orb orb-1"></div>
      <div class="hero-bg-orb orb-2"></div>
      <div class="about-container">
        <div class="hero-content">
          <div class="hero-logo">
            <img src="/icon/icon_256x256.ico" alt="FlexiKit" />
          </div>
          <h1>FlexiKit <span class="chinese">灵巧箱</span></h1>
          <p class="hero-sub">高度可自定义的通用工具箱 — 为开发者和设计师而生</p>
          <p class="hero-desc">
            FlexiKit 不只是一个工具合集，它是你的<span class="accent">数字工作台</span>。
            将分散在浏览器书签栏、桌面快捷方式和各类启动器中的应用整合进一个统一、智能、高度可定制的界面，
            让每一次操作都行云流水。
          </p>
          <div class="hero-tags">
            <span>v1.0</span><span>MIT 开源</span><span>永久免费</span><span>Vue 3 + NestJS</span>
          </div>
          <div class="hero-actions">
            <router-link to="/app" class="btn-primary">免费开始使用</router-link>
            <a href="#story" class="btn-secondary">了解设计理念</a>
          </div>
        </div>
      </div>
    </section>

    <nav class="about-subnav" aria-label="产品介绍页目录">
      <a href="#story" :class="{ active: activeSection === 'story' }">产品故事</a>
      <a href="#principles" :class="{ active: activeSection === 'principles' }">设计原则</a>
      <a href="#capabilities" :class="{ active: activeSection === 'capabilities' }">核心能力</a>
      <a href="#architecture" :class="{ active: activeSection === 'architecture' }">技术架构</a>
      <a href="#roadmap" :class="{ active: activeSection === 'roadmap' }">发展路线</a>
      <a href="#faq" :class="{ active: activeSection === 'faq' }">常见问题</a>
    </nav>

    <!-- ===== 产品故事 ===== -->
    <section id="story" class="story">
      <div class="about-container">
        <div class="story-card glass-card">
          <div class="story-grid">
            <div class="story-text">
              <span class="section-tag">产品故事</span>
              <h2>为什么打造 FlexiKit？</h2>
              <p>
                在日常工作中，我们每天要在数十个工具之间切换：代码编辑器、API 测试工具、设计资源站、
                文档库、项目管理面板……浏览器书签栏越堆越满，桌面快捷方式散落各处，每次找到一个工具都要翻半天。
              </p>
              <p>
                于是 FlexiKit 诞生了 —— 一个能将<strong>网页链接</strong>、<strong>本地应用</strong>和<strong>常用脚本</strong>
                统一管理的开源工具箱。通过拖拽排序、智能分类和 AI 推荐，它让你的工具触手可及，工作流不再被打断。
              </p>
              <p>
                我们坚持 <span class="accent">MIT 协议永久免费</span>，托管于
                <a href="https://github.com/baimuxi/flexikit" target="_blank">GitHub 开源社区</a>。
                代码透明、数据可控、无广告无追踪 —— 这是我们对用户的承诺。
              </p>
            </div>
            <div class="story-highlights">
              <div v-for="h in storyHighlights" :key="h.title" class="highlight-item glass-card">
                <div class="hl-icon" v-html="h.icon"></div>
                <div>
                  <strong>{{ h.title }}</strong>
                  <p>{{ h.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 设计哲学 ===== -->
    <section id="principles" class="philosophy">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">设计哲学</span>
          <h2>四个原则驱动每一个像素</h2>
        </div>
        <div class="phil-grid">
          <div v-for="p in philosophy" :key="p.title" class="phil-card glass-card">
            <div class="phil-number" :style="{ color: p.color }">{{ p.num }}</div>
            <h3>{{ p.title }}</h3>
            <p>{{ p.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 核心功能（两列展开） ===== -->
    <section id="capabilities" class="features">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">核心能力</span>
          <h2>九大功能，覆盖全场景</h2>
        </div>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card glass-card">
            <div class="feature-icon" :style="{ background: f.color + '18', color: f.color }" v-html="f.icon"></div>
            <div class="feature-body">
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
              <ul v-if="f.details">
                <li v-for="d in f.details" :key="d">{{ d }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 技术架构 ===== -->
    <section id="architecture" class="architecture">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">技术架构</span>
          <h2>现代化全栈，生产级品质</h2>
        </div>
        <div class="arch-layers">
          <div class="arch-layer glass-card">
            <div class="arch-layer-label">前端层</div>
            <div class="arch-tags">
              <span v-for="t in archFrontend" :key="t">{{ t }}</span>
            </div>
          </div>
          <div class="arch-arrow">↓</div>
          <div class="arch-layer glass-card">
            <div class="arch-layer-label">API 网关层</div>
            <div class="arch-tags">
              <span v-for="t in archGateway" :key="t">{{ t }}</span>
            </div>
          </div>
          <div class="arch-arrow">↓</div>
          <div class="arch-layer glass-card">
            <div class="arch-layer-label">数据层</div>
            <div class="arch-tags">
              <span v-for="t in archData" :key="t">{{ t }}</span>
            </div>
          </div>
          <div class="arch-arrow">↓</div>
          <div class="arch-layer glass-card">
            <div class="arch-layer-label">部署层</div>
            <div class="arch-tags">
              <span v-for="t in archDeploy" :key="t">{{ t }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 对比 ===== -->
    <section id="comparison" class="compare">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">为什么 FlexiKit</span>
          <h2>与传统工具管理方式的区别</h2>
        </div>
        <div class="compare-table glass-card">
          <div class="compare-row compare-header">
            <div class="compare-cell">特性</div>
            <div class="compare-cell">FlexiKit</div>
            <div class="compare-cell">浏览器书签</div>
            <div class="compare-cell">Notion / 飞书</div>
          </div>
          <div v-for="row in compareRows" :key="row.feature" class="compare-row">
            <div class="compare-cell label">{{ row.feature }}</div>
            <div class="compare-cell" v-html="row.flexikit"></div>
            <div class="compare-cell" v-html="row.bookmark"></div>
            <div class="compare-cell" v-html="row.notion"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 路线图 ===== -->
    <section id="roadmap" class="roadmap">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">发展路线</span>
          <h2>我们正在做什么</h2>
        </div>
        <div class="timeline">
          <div v-for="(item, i) in timeline" :key="item.date" class="tl-item" :class="{ done: item.done, current: item.current }">
            <div class="tl-marker">
              <div class="tl-dot" :class="{ active: item.done || item.current }"></div>
              <div v-if="i < timeline.length - 1" class="tl-line" :class="{ active: item.done }"></div>
            </div>
            <div class="tl-card glass-card">
              <div class="tl-badge" :class="{ done: item.done, current: item.current }">
                {{ item.done ? '✓ 已完成' : item.current ? '⚡ 进行中' : '📋 计划中' }}
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
              <span class="tl-date">{{ item.date }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FAQ ===== -->
    <section id="faq" class="faq">
      <div class="about-container">
        <div class="section-head">
          <span class="section-tag">常见问题</span>
          <h2>你可能想问</h2>
        </div>
        <div class="faq-grid">
          <div v-for="(item, i) in faqs" :key="i" class="faq-item glass-card" :class="{ open: openFaq === i }">
            <button class="faq-q" type="button" :aria-expanded="openFaq === i" :aria-controls="`faq-answer-${i}`" @click="toggleFaq(i)">
              <span>{{ item.q }}</span>
              <svg class="faq-arrow" :class="{ rotated: openFaq === i }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div :id="`faq-answer-${i}`" class="faq-a" v-show="openFaq === i">
              <p>{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="cta">
      <div class="about-container">
        <div class="cta-card glass-card">
          <div class="cta-glow"></div>
          <h2>准备好升级工作流了吗？</h2>
          <p>免费、开源、无广告。加入 FlexiKit，打造你的专属工具箱。</p>
          <router-link to="/app" class="btn-primary">🚀 免费开始使用</router-link>
        </div>
      </div>
    </section>

    <!-- ===== 页脚 ===== -->
    <footer class="footer">
      <div class="about-container">
        <div class="footer-grid">
          <div class="footer-col brand-col">
            <div class="footer-brand-row">
              <img src="/icon/icon_256x256.ico" alt="FlexiKit" />
              <span>FlexiKit · 灵巧箱</span>
            </div>
            <p>MIT 协议 · 永久免费 · 开源社区驱动</p>
          </div>
          <div class="footer-col">
            <h4>导航</h4>
            <router-link to="/">首页</router-link>
            <router-link to="/app">工具箱</router-link>
            <router-link to="/discover">发现</router-link>
          </div>
          <div class="footer-col">
            <h4>法律</h4>
            <router-link to="/terms">用户协议</router-link>
            <router-link to="/privacy">隐私政策</router-link>
            <router-link to="/data">数据管理</router-link>
          </div>
          <div class="footer-col">
            <h4>社区</h4>
            <a href="https://github.com/baimuxi/flexikit" target="_blank">GitHub</a>
            <a href="mailto:support@flexikit.com">联系支持</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 FlexiKit. MIT License.</p>
          <a class="beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">
            <!-- ICP 备案号 -->
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const openFaq = ref<number | null>(null)
const activeSection = ref('story')
const sectionIds = ['story', 'principles', 'capabilities', 'architecture', 'roadmap', 'faq'] as const
let sectionObserver: IntersectionObserver | null = null

function onScroll() { isScrolled.value = window.scrollY > 20 }
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
    if (visible?.target.id) activeSection.value = visible.target.id
  }, { rootMargin: '-24% 0px -58% 0px', threshold: [0.08, 0.2, 0.45] })
  sectionIds.forEach((id) => {
    const section = document.getElementById(id)
    if (section) sectionObserver?.observe(section)
  })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  sectionObserver?.disconnect()
})

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

// ===== 数据 =====
const storyHighlights = [
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', title: '开源透明', desc: 'MIT 协议，代码完全公开，零后门零追踪' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title: '数据自主', desc: '一键导出全量数据，随时删除账户不留痕' },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 17"/><line x1="12" y1="17" x2="20" y2="17"/><path d="M12 12h8"/><path d="M4 7h16"/></svg>', title: '高度可定制', desc: '8 色主题、毛玻璃强度、圆角、卡片大小随意调' },
]

const philosophy = [
  { num: '01', title: '触手可及', desc: '工具不应该是藏在多层菜单后的宝藏。第一原则：任何工具最多两次点击可达。', color: '#0071e3' },
  { num: '02', title: '安静不打扰', desc: '无弹窗、无广告、无推送通知。界面在需要时出现，不需要时隐入背景。', color: '#6366f1' },
  { num: '03', title: '尊重用户数据', desc: '你是数据的主人。加密存储、自主导出、彻底删除 — 所有权利归你。', color: '#ff375f' },
  { num: '04', title: '美而实用', desc: '毛玻璃、流畅动画、像素级对齐。好的设计不是为了炫技，而是让操作更直观。', color: '#34c759' },
]

const features = [
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', title: '本地应用', desc: '不止网页链接。添加桌面程序路径，一键从浏览器启动本地应用 — 打通线上线下效率闭环。', color: '#0071e3', details: ['支持 .exe / .app / shell 脚本', '自定义工作目录和启动参数'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', title: '智能推荐', desc: 'pgvector 向量嵌入 + 余弦相似度匹配，根据你的使用习惯自动发现相关工具。', color: '#ff9500', details: ['基于浏览和收藏行为的向量匹配', '发现广场浏览社区精选工具集'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>', title: '拖拽排序', desc: '原生 HTML5 Drag & Drop，流畅动画过渡。自由重排工具和分类，一切按你的使用频率来。', color: '#af52de', details: ['工具卡片自由拖拽重排', '分类顺序自定义', '批量选择模式快速操作'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', title: '即时搜索', desc: '按名称、标签、URL 多维度搜索。支持快捷键聚焦，键盘即一切。', color: '#34c759', details: ['名称 / 标签 / URL 三维搜索', '搜索结果实时高亮', '键盘导航全程支持'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', title: '数据同步', desc: '云端账号同步工具箱布局、收藏和偏好。换设备不换体验，数据跟着你走。', color: '#6366f1', details: ['跨设备同步工具和设置', '一键导出/导入 JSON 备份'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>', title: '发现广场', desc: '浏览社区分享的优质工具集合，探索新工具、新技术、新资源。', color: '#ff3b30', details: ['社区精选工具集合浏览', '工具详情页查看描述和标签'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', title: '多主题适配', desc: '浅色 / 深色 / 跟随系统三种模式，8 种预设主题色 + 自定义取色器。', color: '#30b0c7', details: ['3 种主题模式 + 8 色预设', '自定义颜色选择器', '毛玻璃强度 0-100% 可调'] },
  { icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>', title: '布局自定义', desc: '卡片大小、网格列数、侧边栏位置、圆角大小，每处细节由你决定。', color: '#ff375f', details: ['3-6 列网格 + 3 档卡片大小', '侧边栏左/右切换', '圆角 8-24px 滑块调节'] },
]

const archFrontend = ['Vue 3', 'TypeScript', 'Pinia', 'Vite', 'Vue Router']
const archGateway = ['NestJS', 'JWT 认证', 'Role Guards', 'CORS / CSRF', 'SSRF 防护']
const archData = ['PostgreSQL', 'TypeORM', 'pgvector', 'Redis', '文件存储']
const archDeploy = ['Docker', 'Docker Compose', 'Nginx', 'GitHub Actions']

const compareRows = [
  { feature: '本地应用启动', flexikit: '✅ 一键启动 .exe / .app', bookmark: '❌ 不支持', notion: '❌ 不支持' },
  { feature: '拖拽排序', flexikit: '✅ 原生拖拽 + 动画', bookmark: '⚠️ 手动拖拽标签', notion: '⚠️ 需手动拖拽 block' },
  { feature: 'AI 智能推荐', flexikit: '✅ pgvector 向量匹配', bookmark: '❌ 无', notion: '❌ 无' },
  { feature: '多主题自定义', flexikit: '✅ 8 色 + 毛玻璃可调', bookmark: '⚠️ 仅系统主题', notion: '⚠️ 仅浅色/深色' },
  { feature: '布局自定义', flexikit: '✅ 列数/大小/圆角可调', bookmark: '❌ 不可调', notion: '⚠️ 有限的视图选项' },
  { feature: '数据导出', flexikit: '✅ 一键 JSON 导出', bookmark: '⚠️ HTML 导出', notion: '⚠️ 需手动导出' },
  { feature: '开源免费', flexikit: '✅ MIT 协议', bookmark: '✅ 浏览器内置', notion: '❌ 付费订阅' },
  { feature: '隐私保护', flexikit: '✅ 无追踪/可删账户', bookmark: '⚠️ 浏览器同步', notion: '❌ 数据在第三方' },
]

const timeline = [
  { date: '2025 Q4', title: '项目启动', desc: '确定技术选型（Vue 3 + NestJS），搭建基础架构，实现工具 CRUD 和分类管理', done: true },
  { date: '2026 Q1', title: '核心功能', desc: '拖拽排序、收藏系统、多主题切换、数据导入导出、用户认证系统', done: true },
  { date: '2026 Q2', title: '智能增强', desc: 'AI 向量推荐引擎、工具发现广场、布局与主题自定义面板、毛玻璃设计语言', done: true },
  { date: '2026 Q3', title: '社区生态', desc: '工具市场（社区分享）、评论与评分系统、RSS 订阅集成', done: false, current: true },
  { date: '2026 Q4', title: '多端覆盖', desc: 'PWA 离线支持、桌面客户端（Tauri）、移动端适配', done: false },
  { date: '2027', title: '生态扩展', desc: '插件系统、第三方 API 接入、企业版功能', done: false },
]

const faqs = [
  { q: 'FlexiKit 是免费的吗？', a: '是的，FlexiKit 采用 MIT 开源协议，完全免费。无隐藏收费、无功能限制、无广告。核心功能永久免费使用，未来可能的增值服务（如企业版）不会影响现有免费功能。' },
  { q: '我的数据安全吗？', a: '你的数据使用 bcrypt 加密存储密码，JWT 令牌保护 API 访问，HTTPS 加密传输。我们不会出售或分享你的数据。你可以在"数据管理"页面随时导出或删除全部数据。' },
  { q: '支持哪些平台？', a: '当前支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。2026 Q4 将推出桌面客户端（Windows/macOS/Linux），同时 PWA 离线支持也在开发中。' },
  { q: '可以添加本地应用程序吗？', a: '可以！FlexiKit 支持添加本地应用路径，点击卡片即可一键启动桌面程序。支持自定义工作目录和启动参数，这是区别于传统书签管理器的核心特性之一。' },
  { q: '如何贡献代码？', a: '项目托管在 GitHub（github.com/baimuxi/flexikit），欢迎提交 Issue 和 PR。前端使用 Vue 3 + TypeScript，后端使用 NestJS。你也可以通过改进文档、分享工具集合来参与社区建设。' },
  { q: '智能推荐是如何工作的？', a: '我们使用 pgvector 将工具的特征（名称、描述、标签、分类）向量化后存储。当你浏览或收藏某些工具时，系统计算余弦相似度，返回向量空间中最近的推荐结果。' },
  { q: '可以自部署吗？', a: '当然！项目提供完整的 Docker Compose 配置，包含前端、后端、PostgreSQL 和 Redis。只需 clone 仓库后 docker-compose up 即可在本地或服务器上运行。' },
  { q: '如何处理功能请求？', a: '欢迎在 GitHub Issues 提交功能请求。我们按照社区投票和路线图优先级排序，核心功能每季度发布一个大版本。' },
]
</script>

<style scoped>
/* ===== 全局 ===== */
.about-page {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(180deg, var(--body-bg) 0%, var(--bg-tertiary) 100%);
}
.about-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
.section-head {
  text-align: center;
  margin-bottom: 48px;
}
.section-tag {
  display: inline-block; font-size: 0.76rem; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--accent); background: var(--accent-soft);
  padding: 4px 14px; border-radius: 20px; margin-bottom: 14px;
}
.section-head h2 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); }
.accent { color: var(--accent); font-weight: 600; }

/* ===== Nav ===== */
.about-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  transition: all 0.3s; backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}
.about-nav.scrolled {
  background: var(--glass-bg); border-bottom: 1px solid var(--glass-border);
}
.nav-container {
  max-width: 1200px; margin: 0 auto; padding: 0 32px;
  height: 64px; display: flex; align-items: center; justify-content: space-between;
}
.nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand-logo { width: 34px; height: 34px; border-radius: 8px; }
.brand-text {
  font-size: 1.15rem; font-weight: 700;
  background: var(--logo-gradient);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.nav-links { display: flex; gap: 28px; }
.nav-links a {
  color: var(--text-secondary); text-decoration: none;
  font-size: 0.88rem; font-weight: 500; transition: color 0.2s;
}
.nav-links a:hover { color: var(--text-primary); }

/* ===== Hero ===== */
.hero {
  position: relative; padding: 120px 0 64px; text-align: center; overflow: hidden;
}
.hero-bg-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
}
.orb-1 { width: 500px; height: 500px; background: var(--orb-color); top: -120px; left: 50%; transform: translateX(-50%); opacity: 0.5; }
.orb-2 { width: 300px; height: 300px; background: rgba(94,92,230,.08); bottom: -60px; right: -60px; opacity: 0.4; }
.hero-content { position: relative; z-index: 1; }
.hero-logo {
  width: 80px; height: 80px; border-radius: 22px; margin: 0 auto 20px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.hero-logo img { width: 54px; height: 54px; border-radius: 14px; object-fit: contain; }
.hero h1 {
  font-size: 2.8rem; font-weight: 800; letter-spacing: -0.03em;
  margin-bottom: 10px; color: var(--text-primary);
}
.chinese { background: var(--logo-gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-sub {
  font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 18px;
}
.hero-desc {
  font-size: 0.98rem; color: var(--text-secondary); line-height: 1.8;
  max-width: 640px; margin: 0 auto 22px;
}
.hero-tags { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.hero-tags span {
  padding: 4px 16px; border-radius: 14px;
  background: var(--btn-bg); border: 1px solid var(--divider);
  font-size: 0.76rem; color: var(--text-tertiary);
}

/* ===== Story ===== */
.story { padding: 40px 0 60px; }
.story-card { border-radius: 24px; padding: 44px; }
.story-grid {
  display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: start;
}
.story-text h2 { font-size: 1.6rem; font-weight: 700; margin-bottom: 18px; }
.story-text p {
  font-size: 0.95rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 14px;
}
.story-text a { color: var(--accent); text-decoration: none; }
.story-highlights { display: flex; flex-direction: column; gap: 12px; }
.highlight-item {
  border-radius: 16px; padding: 18px 20px; display: flex; gap: 14px;
  transition: all 0.3s;
}
.highlight-item:hover { transform: translateX(4px); border-color: var(--accent-soft); }
.hl-icon { flex-shrink: 0; color: var(--accent); display: flex; align-items: flex-start; padding-top: 2px; }
.highlight-item strong { font-size: 0.9rem; color: var(--text-primary); display: block; margin-bottom: 3px; }
.highlight-item p { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.45; }

/* ===== Philosophy ===== */
.philosophy { padding: 60px 0; }
.phil-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;
}
.phil-card {
  border-radius: 20px; padding: 28px 22px; text-align: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.phil-card:hover { transform: translateY(-4px); border-color: var(--accent-soft); }
.phil-number {
  font-size: 2.2rem; font-weight: 800; letter-spacing: -0.04em;
  margin-bottom: 10px;
}
.phil-card h3 { font-size: 1rem; font-weight: 650; margin-bottom: 10px; color: var(--text-primary); }
.phil-card p { font-size: 0.84rem; color: var(--text-secondary); line-height: 1.55; margin: 0; }

/* ===== Features ===== */
.features { padding: 60px 0; }
.features-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px;
}
.feature-card {
  border-radius: 20px; padding: 26px 24px; display: flex; gap: 18px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.feature-card:hover { transform: translateY(-3px); border-color: var(--accent-soft); }
.feature-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.feature-body { flex: 1; }
.feature-body h3 { font-size: 1rem; font-weight: 650; margin: 0 0 6px; color: var(--text-primary); }
.feature-body p { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.55; margin-bottom: 10px; }
.feature-body ul {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.feature-body li {
  font-size: 0.72rem; color: var(--text-tertiary);
  background: var(--btn-bg); border: 1px solid var(--divider);
  padding: 3px 10px; border-radius: 8px;
}

/* ===== Architecture ===== */
.architecture { padding: 60px 0; }
.arch-layers {
  max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 0;
}
.arch-layer {
  border-radius: 18px; padding: 22px 26px; text-align: center;
}
.arch-layer-label {
  font-size: 0.76rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--accent); margin-bottom: 12px;
}
.arch-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.arch-tags span {
  padding: 4px 14px; border-radius: 12px;
  background: var(--btn-bg); border: 1px solid var(--divider);
  font-size: 0.78rem; color: var(--text-secondary);
}
.arch-arrow {
  text-align: center; font-size: 1.2rem; color: var(--text-tertiary);
  padding: 4px 0;
}

/* ===== Compare ===== */
.compare { padding: 60px 0; }
.compare-table {
  border-radius: 20px; overflow: hidden;
}
.compare-row {
  display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 0;
}
.compare-row:not(:last-child) { border-bottom: 1px solid var(--divider); }
.compare-header {
  background: var(--accent-soft); font-weight: 700; font-size: 0.82rem;
}
.compare-cell {
  padding: 14px 16px; font-size: 0.82rem; color: var(--text-secondary);
  display: flex; align-items: center;
}
.compare-header .compare-cell { color: var(--text-primary); }
.compare-cell.label { font-weight: 600; color: var(--text-primary); }

/* ===== Roadmap ===== */
.roadmap { padding: 60px 0; }
.timeline { max-width: 700px; margin: 0 auto; }
.tl-item { display: flex; gap: 20px; }
.tl-marker {
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  width: 20px; padding-top: 16px;
}
.tl-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--text-tertiary); border: 3px solid var(--bg-secondary);
  transition: all 0.3s;
}
.tl-dot.active { background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.tl-line { width: 2px; flex: 1; min-height: 44px; background: var(--border); margin: 4px 0; }
.tl-line.active { background: var(--accent); }
.tl-card {
  flex: 1; border-radius: 16px; padding: 20px 22px; margin-bottom: 16px;
  transition: all 0.3s;
}
.tl-card:hover { transform: translateX(4px); border-color: var(--accent-soft); }
.tl-badge {
  display: inline-block; font-size: 0.68rem; font-weight: 600;
  padding: 2px 10px; border-radius: 10px; margin-bottom: 10px;
  background: var(--btn-bg); color: var(--text-tertiary);
}
.tl-badge.done { background: rgba(52,199,89,.12); color: #34c759; }
.tl-badge.current { background: var(--accent-soft); color: var(--accent); }
.tl-card h3 { font-size: 1rem; font-weight: 650; margin-bottom: 6px; color: var(--text-primary); }
.tl-card p { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.55; margin-bottom: 8px; }
.tl-date { font-size: 0.72rem; color: var(--text-tertiary); font-weight: 500; }

/* ===== FAQ ===== */
.faq { padding: 60px 0; }
.faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.faq-item { border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s; height: fit-content; }
.faq-item:hover { border-color: var(--accent-soft); }
.faq-q {
  padding: 18px 22px; display: flex; align-items: center; justify-content: space-between;
  font-size: 0.92rem; font-weight: 600; gap: 12px; color: var(--text-primary);
}
.faq-arrow { flex-shrink: 0; transition: transform 0.3s; color: var(--text-tertiary); }
.faq-arrow.rotated { transform: rotate(180deg); }
.faq-a { padding: 0 22px 20px; }
.faq-a p { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.7; margin: 0; }

/* ===== CTA ===== */
.cta { padding: 60px 0 40px; }
.cta-card {
  position: relative; border-radius: 28px; padding: 64px 40px;
  text-align: center; overflow: hidden;
  background: linear-gradient(135deg, var(--accent-soft) 0%, var(--glass-bg) 50%);
}
.cta-glow {
  position: absolute; width: 350px; height: 350px;
  background: radial-gradient(circle, var(--accent-soft) 0%, transparent 70%);
  top: -60px; right: -80px; pointer-events: none; opacity: 0.4;
}
.cta-card h2 { font-size: 1.9rem; font-weight: 700; margin-bottom: 10px; position: relative; color: var(--text-primary); }
.cta-card p { font-size: 0.98rem; color: var(--text-secondary); margin-bottom: 28px; position: relative; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 15px 34px; border-radius: 14px; font-size: 0.98rem;
  font-weight: 600; text-decoration: none;
  background: var(--accent); color: #fff;
  transition: all 0.2s; position: relative;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,113,227,0.35); }

/* ===== Footer ===== */
.footer { padding: 56px 0 32px; border-top: 1px solid var(--divider); }
.footer-grid {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px;
}
.footer-brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.footer-brand-row img { width: 30px; height: 30px; border-radius: 7px; }
.footer-brand-row span { font-weight: 650; font-size: 1rem; color: var(--text-primary); }
.brand-col p { font-size: 0.82rem; color: var(--text-tertiary); margin: 0; }
.footer-col h4 { font-size: 0.74rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); margin-bottom: 14px; }
.footer-col a { display: block; font-size: 0.84rem; color: var(--text-secondary); text-decoration: none; margin-bottom: 9px; transition: color 0.2s; }
.footer-col a:hover { color: var(--accent); }
.footer-bottom { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--divider); text-align: center; }
.footer-bottom p { font-size: 0.78rem; color: var(--text-tertiary); margin: 0 0 6px; }
.beian { font-size: 0.72rem; color: var(--text-tertiary); text-decoration: none; }

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .story-grid { grid-template-columns: 1fr; gap: 28px; }
  .story-highlights { flex-direction: row; flex-wrap: wrap; }
  .highlight-item { flex: 1; min-width: 220px; }
  .phil-grid { grid-template-columns: repeat(2, 1fr); }
  .features-grid { grid-template-columns: 1fr; }
  .faq-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; }
}
@media (max-width: 768px) {
  .about-container { padding: 0 20px; }
  .hero { padding: 100px 0 48px; }
  .hero h1 { font-size: 2rem; }
  .hero-sub { font-size: 0.95rem; }
  .hero-desc { font-size: 0.88rem; }
  .story-card { padding: 28px 20px; }
  .story-highlights { flex-direction: column; }
  .compare-row { grid-template-columns: repeat(4, 1fr); }
  .compare-cell { font-size: 0.72rem; padding: 10px 8px; }
}
@media (max-width: 480px) {
  .about-container { padding: 0 14px; }
  .hero h1 { font-size: 1.6rem; }
  .phil-grid { grid-template-columns: 1fr; }
  .compare-table { font-size: 0.7rem; }
  .compare-row { grid-template-columns: 1fr 1fr; }
  .compare-header .compare-cell:nth-child(n+3) { display: none; }
  .footer-grid { grid-template-columns: 1fr; gap: 24px; }
  .cta-card { padding: 40px 20px; }
  .cta-card h2 { font-size: 1.4rem; }
}
/* ===== 页面层级与长页导航优化 ===== */
.about-container,
.nav-container { width: min(1340px, calc(100% - clamp(32px, 5vw, 72px))); max-width: 1340px; padding-inline: 0; }
.about-nav { transition: background .3s cubic-bezier(.25,.1,.25,1), border-color .3s cubic-bezier(.25,.1,.25,1), box-shadow .3s cubic-bezier(.25,.1,.25,1); }
.about-nav.scrolled { box-shadow: 0 12px 40px rgba(15,23,42,.06); }
.nav-cta { padding: 9px 16px; border-radius: 12px; color: #fff !important; background: var(--primary); box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 18%, transparent); }
.hero { padding: 104px 0 54px; }
.hero-content { max-width: 920px; margin: 0 auto; }
.hero-logo { width: 72px; height: 72px; margin-bottom: 14px; }
.hero-desc { max-width: 800px; }
.hero-actions { margin-top: 24px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.btn-secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 10px 20px; border-radius: 12px; color: var(--text-primary); text-decoration: none; font-weight: 650; background: var(--btn-bg); border: 1px solid var(--divider); }
.about-subnav { position: sticky; top: 70px; z-index: 80; width: min(880px, calc(100% - 32px)); margin: 0 auto 10px; padding: 8px; display: flex; gap: 4px; overflow-x: auto; border: 1px solid var(--glass-border); border-radius: 16px; background: var(--glass-bg); backdrop-filter: blur(22px) saturate(150%); box-shadow: 0 12px 38px rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.28); }
.about-subnav { scrollbar-width: none; }
.about-subnav::-webkit-scrollbar { display: none; }
.about-subnav a { flex: 0 0 auto; padding: 8px 12px; border-radius: 10px; color: var(--text-secondary); text-decoration: none; font-size: .82rem; font-weight: 600; transition: color .3s cubic-bezier(.25,.1,.25,1), background .3s cubic-bezier(.25,.1,.25,1), transform .3s cubic-bezier(.25,.1,.25,1); }
.about-subnav a:hover,
.about-subnav a.active { color: var(--primary); background: var(--primary-light); }
.about-subnav a.active { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 14%, transparent); }
.about-subnav a:active { transform: scale(.98); }
.story,
.philosophy,
.features,
.architecture,
.compare,
.roadmap,
.faq { scroll-margin-top: 138px; }
.story { padding: 44px 0 72px; }
.philosophy,
.features { padding: 72px 0; }
.architecture,
.compare { padding: 76px 0; }
.roadmap,
.faq { padding: 68px 0; }
.section-head { max-width: 720px; margin: 0 auto 38px; }
.story-card { padding: clamp(32px, 4vw, 52px); }
.phil-grid,
.features-grid { gap: clamp(16px, 1.7vw, 22px); }
.phil-card,
.feature-card,
.highlight-item,
.tl-card { transition: transform .3s cubic-bezier(.25,.1,.25,1), border-color .3s cubic-bezier(.25,.1,.25,1), box-shadow .3s cubic-bezier(.25,.1,.25,1); }
.phil-card:hover,
.feature-card:hover { transform: translateY(-3px); box-shadow: 0 18px 46px rgba(15,23,42,.055); }
.faq-item { cursor: default; }
.faq-q { width: 100%; border: 0; background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; transition: background .3s cubic-bezier(.25,.1,.25,1); }
.faq-q:hover { background: color-mix(in srgb, var(--primary) 5%, transparent); }
.faq-q:focus-visible { outline: 2px solid color-mix(in srgb, var(--primary) 55%, transparent); outline-offset: -3px; }
.faq-a { animation: faqReveal .3s cubic-bezier(.25,.1,.25,1); }
@keyframes faqReveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
.glass-card,
.btn-primary,
.btn-secondary { transition: all .3s cubic-bezier(.25,.1,.25,1); }
.btn-primary:active,
.btn-secondary:active { transform: scale(.98); }
@media (max-width: 768px) {
  .about-container,
  .nav-container { width: 100%; }
  .about-subnav { top: 64px; justify-content: flex-start; }
  .nav-links a:not(.nav-cta) { display: none; }
  .hero { padding-top: 92px; }
  .about-container,
  .nav-container { padding-inline: 18px; }
  .story { padding-block: 34px 52px; }
  .philosophy,.features,.architecture,.compare,.roadmap,.faq { padding-block: 52px; }
}
</style>
