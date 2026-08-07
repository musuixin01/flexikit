<template>
  <div class="app-layout discover-page">
    <Navbar force-show-logo />
    <main class="main-content full-width">

      <div class="discover-container">
        <!-- Header -->
        <div class="discover-header">
          <h1 class="discover-title">发现工具</h1>
          <p class="discover-subtitle">基于你的使用偏好，探索精选工具与热门趋势</p>
        </div>

        <!-- 平台筛选 -->
        <div class="source-filter">
          <button
            v-for="s in sourceList"
            :key="s.key"
            class="source-tab"
            :class="{ active: currentSource === s.key }"
            @click="changeSource(s.key)"
          >
            {{ s.label }}
            <span class="source-count" v-if="s.count > 0">{{ s.count }}</span>
          </button>
        </div>

        <!-- Section 1: 智能推荐 -->
        <section class="discover-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">✨</span> 智能推荐
            </h2>
            <div class="section-actions">
              <button class="nav-btn" @click="scrollLeft">‹</button>
              <button class="nav-btn" @click="scrollRight">›</button>
            </div>
          </div>
          <div class="cards-scroll" ref="recommendScrollRef">
            <ToolCard
              v-for="tool in recommendList"
              :key="tool.id"
              :tool="tool"
              mode="discovery"
              @click="handleToolClick(tool)"
              @add="handleAddTool"
            />
            <!-- 空状态 -->
            <div v-if="recommendList.length === 0" class="empty-state empty-inline">
              <span class="empty-icon">✨</span>
              <p class="empty-text">暂无推荐数据</p>
            </div>
          </div>
        </section>

        <!-- Section 2: 排行榜 -->
        <section class="discover-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">🔥</span> 排行榜
            </h2>
            <div class="rank-tabs">
              <button
                v-for="p in rankPeriods"
                :key="p.key"
                class="rank-tab"
                :class="{ active: rankPeriod === p.key }"
                @click="rankPeriod = p.key; fetchRankings()"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="rank-list">
            <div
              v-for="(tool, index) in rankList"
              :key="tool.id"
              class="rank-item"
              @click="handleToolClick(tool)"
            >
              <div class="rank-number" :class="getRankClass(index)">
                {{ index + 1 }}
              </div>
              <!-- 使用与 ToolCard 完全相同的图标容器和逻辑 -->
              <div class="card-icon" v-html="toolsStore.getToolIconHtml(tool)"></div>
              <div class="rank-info">
                <div class="rank-name">{{ tool.name }}</div>
                <div class="rank-desc">{{ tool.description || tool.desc || '' }}</div>
              </div>
              <div class="rank-score">
                <span class="score-fire">🔥</span>
                <span class="score-value">{{ tool.hot_score || (Math.random() * 10 + 2).toFixed(1) }}</span>
              </div>
            </div>
            <!-- 空状态 -->
            <div v-if="rankList.length === 0 && !loading" class="empty-state">
              <span class="empty-icon">📭</span>
              <p class="empty-text">暂无排行榜数据</p>
            </div>
          </div>
        </section>

        <!-- Section 3: 最新发现 -->
        <section class="discover-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">🆕</span> 最新发现
            </h2>
            <a class="view-all" @click="viewAllLatest">查看全部 →</a>
          </div>
          <div class="cards-grid">
            <ToolCard
              v-for="tool in latestList"
              :key="tool.id"
              :tool="tool"
              mode="discovery"
              :show-new="true"
              @click="handleToolClick(tool)"
              @add="handleAddTool"
            />
            <!-- 空状态 -->
            <div v-if="latestList.length === 0 && !loading" class="empty-state empty-grid">
              <span class="empty-icon">🆕</span>
              <p class="empty-text">暂无最新发现</p>
            </div>
          </div>
          <div class="load-more-wrap">
            <button
              v-if="latestHasMore"
              class="load-more-btn"
              @click="loadMoreLatest"
              :disabled="loading"
            >
              {{ loading ? '加载中...' : '加载更多' }}
            </button>
            <p v-else class="no-more-text">— 已经到底了 —</p>
          </div>
        </section>
      </div>
    </main>
  </div>
  <ToastMessage />
  <ToolModal ref="toolModalRef" @saved="onToolSaved" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Navbar from '@/components/layout/Navbar.vue';
import ToolCard from '@/components/tools/ToolCard.vue';
import ToolModal from '@/components/tools/ToolModal.vue';
import ToastMessage from '@/components/common/ToastMessage.vue';
import { discoveryApi, statsApi } from '@/api';
import type { DiscoveryTool } from '@/api/discovery';
import { useUiStore } from '@/stores/ui';
import { useToolsStore } from '@/stores/tools';
import { useUserStore } from '@/stores/user';

const ui = useUiStore();
const toolsStore = useToolsStore();
const user = useUserStore();

const toolModalRef = ref<InstanceType<typeof ToolModal> | null>(null);

// 将发现工具转换为前端 Tool 格式
function discoveryToTool(dt: DiscoveryTool): any {
  return {
    id: dt.id,
    name: dt.name,
    url: dt.url,
    desc: dt.description,
    description: dt.description,
    cat: dt.category,
    category: dt.category,
    tags: dt.tags || [],
    icon: dt.icon || '',
    isCustom: false,
    is_custom: false,
    localPath: '',
    local_path: '',
    // 额外字段
    source: dt.source,
    sourceUrl: dt.source_url,
    hotScore: dt.hot_score,
    upvotes: dt.upvotes,
    comments: dt.comments,
  };
}

const recommendScrollRef = ref<HTMLElement | null>(null);

const rankPeriod = ref<string>('week');
const rankPeriods = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
];

const loading = ref(false);
const recommendList = ref<any[]>([]);
const rankList = ref<any[]>([]);
const latestList = ref<any[]>([]);
const latestOffset = ref(0);
const latestHasMore = ref(true);
const PAGE_SIZE = 6;

// 平台筛选
const currentSource = ref<string>('all');
const sourceList = ref<{ key: string; label: string; count: number }[]>([
  { key: 'all', label: '全部', count: 0 },
]);

// 平台名称映射
const sourceLabelMap: Record<string, string> = {
  all: '全部',
  producthunt: 'Product Hunt',
  appinn: '小众软件',
  v2ex: 'V2EX',
  juejin: '掘金',
  iplaysoft: '异次元软件',
};

// 获取平台列表
async function fetchSources() {
  try {
    const res = await discoveryApi.getSources();
    const data = res.data;
    const sources = Array.isArray(data) ? data : [];
    
    const list = [{ key: 'all', label: '全部', count: 0 }];
    let total = 0;
    
    for (const s of sources) {
      const key = s.source;
      const label = sourceLabelMap[key] || key;
      list.push({ key, label, count: s.count || 0 });
      total += s.count || 0;
    }
    
    list[0].count = total;
    sourceList.value = list;
  } catch (e) {
    console.warn('获取平台列表失败', e);
  }
}

// 切换平台
function changeSource(source: string) {
  currentSource.value = source;
  fetchRecommend();
  fetchRankings();
  fetchLatest();
}

// 获取推荐
async function fetchRecommend() {
  try {
    const source = currentSource.value === 'all' ? undefined : currentSource.value;
    const res = await discoveryApi.getRecommendations(PAGE_SIZE, source);
    const data = res.data;
    const items = Array.isArray(data) ? data : (data.items || []);
    recommendList.value = items.map((item: DiscoveryTool) => discoveryToTool(item));
  } catch (e) {
    // 后端不可用时，从本地工具中随机推荐
    console.warn('推荐接口不可用，使用本地数据');
    const allTools = toolsStore.allTools;
    if (allTools.length > 0) {
      const shuffled = [...allTools].sort(() => Math.random() - 0.5);
      recommendList.value = shuffled.slice(0, PAGE_SIZE);
    }
  }
}

// 获取排行榜
async function fetchRankings() {
  loading.value = true;
  try {
    const source = currentSource.value === 'all' ? undefined : currentSource.value;
    const res = await discoveryApi.getRankings(rankPeriod.value, 10, source);
    const data = res.data;
    const items = Array.isArray(data) ? data : (data.items || []);
    rankList.value = items.map((item: DiscoveryTool) => {
      const tool = discoveryToTool(item);
      return { ...tool, hot_score: item.hot_score };
    });
  } catch (e) {
    // 后端不可用时，从本地工具中生成模拟排行
    console.warn('排行接口不可用，使用本地数据');
    const allTools = toolsStore.allTools;
    if (allTools.length > 0) {
      rankList.value = allTools.slice(0, 10).map((tool, index) => ({
        ...tool,
        hot_score: (10 - index + Math.random() * 2).toFixed(1),
      }));
    }
  } finally {
    loading.value = false;
  }
}

// 获取最新
async function fetchLatest(reset = true) {
  if (reset) {
    latestOffset.value = 0;
    latestHasMore.value = true;
  }
  if (!latestHasMore.value) return;
  loading.value = true;
  try {
    const source = currentSource.value === 'all' ? undefined : currentSource.value;
    const res = await discoveryApi.getLatest(PAGE_SIZE, latestOffset.value, source);
    const data = res.data;
    // 兼容两种格式：数组 或 { items, total }
    const items = Array.isArray(data) ? data : (data.items || []);
    const total = Array.isArray(data) ? null : (data.total ?? null);
    
    const tools = items.map((item: DiscoveryTool) => discoveryToTool(item));
    
    if (reset) {
      latestList.value = tools;
    } else {
      latestList.value = [...latestList.value, ...tools];
    }
    latestOffset.value += items.length;
    if (items.length < PAGE_SIZE || (total !== null && latestOffset.value >= total)) {
      latestHasMore.value = false;
    }
  } catch (e) {
    // 后端不可用时，从本地工具中获取
    console.warn('最新工具接口不可用，使用本地数据');
    const allTools = toolsStore.allTools;
    if (reset) {
      latestList.value = allTools.slice(0, PAGE_SIZE);
      latestOffset.value = PAGE_SIZE;
      latestHasMore.value = allTools.length > PAGE_SIZE;
    } else {
      const next = allTools.slice(latestOffset.value, latestOffset.value + PAGE_SIZE);
      latestList.value = [...latestList.value, ...next];
      latestOffset.value += next.length;
      latestHasMore.value = latestOffset.value < allTools.length;
    }
  } finally {
    loading.value = false;
  }
}

function loadMoreLatest() {
  fetchLatest(false);
}

function viewAllLatest() {
  ui.showToast('查看全部最新工具');
}

// 排行名次样式
function getRankClass(index: number) {
  if (index === 0) return 'rank-gold';
  if (index === 1) return 'rank-silver';
  if (index === 2) return 'rank-bronze';
  return '';
}

// 滚动控制
function scrollLeft() {
  const el = recommendScrollRef.value;
  if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
}
function scrollRight() {
  const el = recommendScrollRef.value;
  if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
}

// 工具点击记录
function handleToolClick(tool: any) {
  statsApi.recordClick(tool.id).catch(() => {});
  if (tool.url && tool.url !== '#') {
    window.open(tool.url, '_blank');
  } else {
    ui.showToast('该工具暂无有效链接');
  }
}

// 添加工具到我的工具箱（打开编辑模态框）
function handleAddTool(tool: any) {
  if (!user.isLoggedIn) {
    ui.showToast('请先登录后再添加工具');
    return;
  }
  toolModalRef.value?.openForAddWithData(tool);
}

// 工具保存成功回调
function onToolSaved() {
  // 工具保存成功后的处理，比如刷新数据等
  // 这里暂时不需要额外处理，因为 tools store 会自动更新
}

// 初始化加载
onMounted(async () => {
  // 确保工具数据已加载（fallback 时需要）
  if (!toolsStore.isLoaded) {
    try {
      await toolsStore.initData();
    } catch {}
  }
  fetchSources();
  fetchRecommend();
  fetchRankings();
  fetchLatest(true);
});
</script>

<style scoped>
/* ===== 页面容器 ===== */
.discover-page {
  display: block;
  padding: 20px;
}
.main-content.full-width {
  max-width: 1200px;
  margin: 0 auto;
}
.discover-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-top: 20px;
}

/* ===== Header ===== */
.discover-header {
  margin-bottom: 8px;
}
.discover-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.discover-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

/* ===== 平台筛选 ===== */
.source-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.source-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 24px;
  border: 1px solid var(--glass-border);
  background: var(--btn-bg);
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.source-tab:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}
.source-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.source-count {
  font-size: 0.75rem;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
}
.source-tab:not(.active) .source-count {
  background: var(--glass-bg);
  color: var(--text-secondary);
}

/* ===== Section ===== */
.discover-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-icon {
  font-size: 1.4rem;
}
.section-actions {
  display: flex;
  gap: 8px;
}
.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-btn:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

/* ===== 推荐横向滚动 ===== */
.cards-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 4px 0 12px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
}
.cards-scroll::-webkit-scrollbar {
  height: 4px;
}
.cards-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.cards-scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(0,0,0,0.15));
  border-radius: 4px;
}
.cards-scroll .tool-card {
  flex: 0 0 280px;
  min-width: 0;
  max-width: 280px;
}

/* ===== 排行榜 ===== */
.rank-tabs {
  display: flex;
  gap: 4px;
  background: var(--btn-bg);
  padding: 4px;
  border-radius: 24px;
}
.rank-tab {
  padding: 4px 16px;
  border-radius: 20px;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.rank-tab.active {
  background: var(--accent);
  color: #fff;
}
.rank-tab:hover:not(.active) {
  background: var(--btn-bg-hover);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.rank-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-hover-shadow);
}
.rank-number {
  width: 28px;
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.rank-gold {
  color: #ffd700;
}
.rank-silver {
  color: #c0c0c0;
}
.rank-bronze {
  color: #cd7f32;
}
/* 复用 ToolCard 的 .card-icon 样式，无需额外定义 */
.rank-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.rank-name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-score {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--danger-soft);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--danger-soft);
  flex-shrink: 0;
}
.score-fire {
  font-size: 0.9rem;
}
.score-value {
  font-weight: 600;
  color: var(--danger);
}

/* ===== 最新工具网格 ===== */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.view-all {
  font-size: 0.9rem;
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}
.view-all:hover {
  text-decoration: underline;
}
.load-more-btn {
  display: block;
  margin: 12px auto 0;
  padding: 8px 32px;
  border: 1px solid var(--divider);
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.load-more-btn:hover {
  background: var(--btn-bg-hover);
}
.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.6;
}
.empty-text {
  margin: 0;
  font-size: 0.9rem;
}
.empty-inline {
  min-width: 200px;
  padding: 30px 20px;
}
.empty-grid {
  grid-column: 1 / -1;
  padding: 60px 20px;
}

/* ===== 加载更多 ===== */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.no-more-text {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  margin: 8px 0;
}

/* ===== 排行榜交互 ===== */
.rank-item {
  cursor: pointer;
  transition: all 0.2s ease;
}
.rank-item:hover {
  background: var(--btn-bg);
  transform: translateX(4px);
}

/* ===== 过渡动画 ===== */
.cards-scroll,
.rank-list,
.cards-grid {
  transition: opacity 0.3s ease;
}

/* ===== 响应式 ===== */
@media (max-width: 700px) {
  .cards-scroll .tool-card {
    flex: 0 0 220px;
    max-width: 220px;
  }
  .rank-item {
    flex-wrap: wrap;
    gap: 8px;
  }
  .rank-info {
    width: 100%;
    order: 3;
  }
  .rank-score {
    margin-left: auto;
  }
  .cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
