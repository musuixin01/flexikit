<template>
  <component
    :is="isLocal ? 'div' : 'a'"
    :class="['tool-card', cardClasses]"
    :style="cardStyle"
    :href="isLocal ? undefined : tool.url"
    :target="isLocal || selectMode ? undefined : '_blank'"
    :rel="isLocal || selectMode ? undefined : 'noopener'"
    :data-tool-name="tool.name"
    :data-tool-cat="tool.cat"
    :data-tool-key="toolKey"
    :draggable="!selectMode"
    ref="cardRef"
    @click="onCardClick"
    @dragstart="onDragStart"
    @mouseenter="onPopupMouseEnter"
    @mouseleave="onPopupMouseLeave"
  >
    <!-- 多选勾选框 -->
    <div
      v-if="selectMode"
      :class="['card-check', { checked: isChecked }]"
      @click.stop.prevent="onCheckClick"
      role="checkbox"
      :aria-checked="isChecked"
    ></div>

    <!-- 操作按钮（hover 显示） -->
    <div v-if="!selectMode" class="card-actions">
      <template v-if="mode === 'discovery'">
        <!-- 发现页：添加按钮 -->
        <button class="card-action-btn add" @click.stop.prevent="onAdd" aria-label="添加到我的工具箱">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </template>
      <template v-else>
        <!-- 普通模式：编辑和删除按钮 -->
        <button class="card-action-btn" @click.stop.prevent="onEdit" aria-label="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action-btn danger" @click.stop.prevent="onDelete" aria-label="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </template>
    </div>

    <!-- 图标 -->
    <div class="card-icon" style="--card-icon-bg:var(--color-icon-bg)">
      <ToolIcon :tool="tool" />
    </div>

    <!-- 名称 + 描述 -->
    <div class="card-body">
      <div class="card-name">
        {{ tool.name }}
        <span v-if="isLocal" class="card-local-tag">本地</span>
        <span v-if="tool.isCustom" class="card-custom-badge">自定义</span>
      </div>
      <div class="card-desc">{{ tool.desc }}</div>
    </div>

    <!-- 标签 + 收藏（始终显示，未登录点击会提示登录） -->
    <div class="card-tags">
       <span v-for="tag in tool.tags" :key="tag" class="card-tag" style="--card-tag-bg:var(--color-tag-bg);--card-tag-text:var(--color-tag-text)">{{ tag }}</span>
      
      <!-- ✅ 移除 v-if，让按钮始终可见 -->
      <button
        :class="['card-fav-btn', { active: isFav }]"
        @click.stop.prevent="onToggleFav"
        aria-label="收藏"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
    </div>

    <!-- 底部提示 -->
    <div class="card-url-hint">
      <template v-if="isLocal">
        <span class="local-icon-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
        </span>
        <span class="local-path-text">{{ shortLocalPath }}</span>
      </template>
      <template v-else>{{ hostname }}</template>
    </div>

    <!-- 详细信息面板占位 -->
    <div v-if="false" class="detail-panel-placeholder"></div>

    <!-- 新版详细信息弹出面板（Teleport 到 body，避免被父容器遮挡） -->
    <Teleport to="body">
      <div 
        v-if="showDetailPopup && mode === 'discovery'"
        :class="['detail-popup', { show: showDetailPopup }]"
        :style="popupStyle"
        @click.stop.prevent
        @mouseenter="onPopupMouseEnter"
        @mouseleave="onPopupMouseLeave"
      >
        <div class="detail-header">
          <div class="detail-icon"><ToolIcon :tool="tool" /></div>
          <div class="detail-title">
            <h3>{{ tool.name }}</h3>
            <span class="detail-source">{{ sourceLabel }}</span>
          </div>
        </div>
        <div class="detail-body">
          <p class="detail-desc">{{ tool.desc }}</p>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">分类</span>
              <span class="meta-value">{{ tool.cat }}</span>
            </div>
            <div class="meta-item" v-if="tool.hotScore">
              <span class="meta-label">热度</span>
              <span class="meta-value hot">🔥 {{ tool.hotScore }}</span>
            </div>
            <div class="meta-item" v-if="tool.upvotes">
              <span class="meta-label">点赞</span>
              <span class="meta-value">{{ tool.upvotes }}</span>
            </div>
            <div class="meta-item" v-if="tool.comments">
              <span class="meta-label">评论</span>
              <span class="meta-value">{{ tool.comments }}</span>
            </div>
          </div>
          <div class="detail-tags" v-if="tool.tags && tool.tags.length > 0">
            <span class="detail-tag" v-for="tag in tool.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="detail-footer">
          <button class="detail-add-btn" @click.stop.prevent="onAdd">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加到工具箱
          </button>
          <a :href="tool.url" target="_blank" rel="noopener" class="detail-link" @click.stop>
            访问官网 →
          </a>
        </div>
      </div>
    </Teleport>

    <div 
      v-if="false"
      class="detail-panel"
      @click.stop.prevent
    >
        <div class="detail-header">
          <div class="detail-icon"><ToolIcon :tool="tool" /></div>
          <div class="detail-title">
            <h3>{{ tool.name }}</h3>
            <span class="detail-source">{{ sourceLabel }}</span>
          </div>
        </div>
        <div class="detail-body">
          <p class="detail-desc">{{ tool.desc }}</p>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">分类</span>
              <span class="meta-value">{{ tool.cat }}</span>
            </div>
            <div class="meta-item" v-if="tool.hotScore">
              <span class="meta-label">热度</span>
              <span class="meta-value hot">🔥 {{ tool.hotScore }}</span>
            </div>
            <div class="meta-item" v-if="tool.upvotes">
              <span class="meta-label">点赞</span>
              <span class="meta-value">{{ tool.upvotes }}</span>
            </div>
            <div class="meta-item" v-if="tool.comments">
              <span class="meta-label">评论</span>
              <span class="meta-value">{{ tool.comments }}</span>
            </div>
          </div>
          <div class="detail-tags" v-if="tool.tags && tool.tags.length > 0">
            <span class="detail-tag" v-for="tag in tool.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="detail-footer">
          <button class="detail-add-btn" @click.stop.prevent="onAdd">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加到工具箱
          </button>
          <a :href="tool.url" target="_blank" rel="noopener" class="detail-link" @click.stop>
            访问官网 →
          </a>
        </div>
      </div>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useToolsStore } from '@/stores/tools'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { toolsApi } from '@/api/tools'
import type { Tool } from '@/types/tool'
import ToolIcon from './ToolIcon.vue'

const props = defineProps<{
  tool: Tool
  mode?: 'normal' | 'discovery'
}>()

const emit = defineEmits<{
  'check-click': [key: string]
  'edit': [tool: Tool]
  'delete': [tool: Tool]
  'toggle-fav': [key: string]
  'add': [tool: Tool]
}>()

const tools = useToolsStore()
const ui = useUiStore()
const user = useUserStore()

const toolKey = computed(() => tools.getToolKey(props.tool))
const selectMode = computed(() => ui.selectMode)
const isChecked = computed(() => ui.selectedSet.has(toolKey.value))
const isFav = computed(() => tools.favoriteTools.has(toolKey.value))
const isLocal = computed(() => !!(props.tool.localPath))
const shortLocalPath = computed(() => {
  const p = props.tool.localPath || ''
  if (p.length > 45) return '...' + p.slice(-42)
  return p
})

const hostname = computed(() => {
  if (isLocal.value) return ''
  try { return new URL(props.tool.url).hostname }
  catch { return props.tool.url || '' }
})

const cardClasses = computed(() => ({
  'show-checks': selectMode.value,
  'selected': selectMode.value && isChecked.value,
  'is-local': isLocal.value,
  'discovery-mode': props.mode === 'discovery',
  'has-card-color': !!cardColor.value,
}))

const cardColor = computed(() => props.tool.cardColor || props.tool.card_color || null)

const cardStyle = computed(() => {
  const color = cardColor.value
  if (!color) return {}
  // 自定义颜色渐变：主色 → 稍暗，保留视觉层次
  return {
    background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)`,
    '--card-custom-bg': color,
  } as Record<string, string>
})

// 来源平台中文名称
const sourceLabel = computed(() => {
  const sourceMap: Record<string, string> = {
    'producthunt': 'Product Hunt',
    'appinn': '小众软件',
    'v2ex': 'V2EX',
    'juejin': '掘金',
    'sspai': '少数派',
    'apprcn': '反斗软件',
    'iplaysoft': '异次元软件',
    'ifanr': '爱范儿',
    '36kr': '36氪',
    'oschina': '开源中国',
  }
  const source = (props.tool as any).source || ''
  return sourceMap[source] || source
})

// ===== 详细信息面板（新版） =====
const cardRef = ref<HTMLElement | null>(null)
const showDetailPopup = ref(false)
const popupStyle = ref<Record<string, string>>({})
let detailShowTimer: ReturnType<typeof setTimeout> | null = null
let detailHideTimer: ReturnType<typeof setTimeout> | null = null

function updatePopupPosition() {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  popupStyle.value = {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.right + 12}px`,
    zIndex: '99999',
  }
}

function onPopupMouseEnter() {
  if (props.mode !== 'discovery') return
  // 清除隐藏定时器
  if (detailHideTimer) {
    clearTimeout(detailHideTimer)
    detailHideTimer = null
  }
  // 如果已经显示，直接返回
  if (showDetailPopup.value) return
  // 显示延迟：鼠标停留 1 秒后才显示
  if (detailShowTimer) clearTimeout(detailShowTimer)
  detailShowTimer = setTimeout(() => {
    updatePopupPosition()
    showDetailPopup.value = true
    nextTick(() => {
      updatePopupPosition()
    })
  }, 1000)
}

function onPopupMouseLeave() {
  // 清除显示定时器
  if (detailShowTimer) {
    clearTimeout(detailShowTimer)
    detailShowTimer = null
  }
  // 隐藏延迟：给鼠标时间移到面板上
  if (detailHideTimer) clearTimeout(detailHideTimer)
  detailHideTimer = setTimeout(() => {
    showDetailPopup.value = false
    detailHideTimer = null
  }, 150)
}

// 窗口滚动或大小变化时更新面板位置
function handleScrollOrResize() {
  if (showDetailPopup.value) {
    updatePopupPosition()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
  if (detailShowTimer) clearTimeout(detailShowTimer)
  if (detailHideTimer) clearTimeout(detailHideTimer)
})

// 监听显示状态，显示时更新位置
watch(showDetailPopup, (val) => {
  if (val) {
    nextTick(() => updatePopupPosition())
  }
})

function onCheckClick() {
  emit('check-click', toolKey.value)
}

async function onCardClick(e: MouseEvent) {
  if (selectMode.value) {
    e.preventDefault()
    emit('check-click', toolKey.value)
    return
  }
  if (isLocal.value) {
    e.preventDefault()
    try {
      const toolId = props.tool.id || 0
      const fallbackPath = props.tool.localPath || undefined
      await toolsApi.openTool(toolId, fallbackPath)
      ui.showToast(`已打开: ${props.tool.name}`)
    } catch (err: any) {
      ui.showToast(`打开失败: ${err.response?.data?.message || err.message}`)
    }
    return
  }
}

function onEdit() {
  emit('edit', props.tool)
}

function onDelete() {
  emit('delete', props.tool)
}

function onToggleFav() {
  emit('toggle-fav', toolKey.value)
}

function onAdd() {
  emit('add', props.tool)
}

function onDragStart(e: DragEvent) {
  if (selectMode.value) {
    e.preventDefault()
    return
  }
  e.dataTransfer?.setData('text/plain', props.tool.name)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
</script>

<style scoped>
/* ===== 自定义卡片背景色 ===== */
.tool-card.has-card-color {
  /* 覆盖默认玻璃背景，用自定义颜色 */
  border-color: transparent;
}

.tool-card.has-card-color:hover {
  /* hover 时不替换背景，仅加亮 */
  filter: brightness(1.08);
  border-color: rgba(255, 255, 255, 0.4) !important;
}

.tool-card.has-card-color .card-tag {
  /* 标签使用半透明白色背景 */
  background: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.9);
}

.tool-card.has-card-color .card-desc,
.tool-card.has-card-color .card-url-hint {
  color: rgba(255, 255, 255, 0.8);
}

.tool-card.has-card-color .card-name {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.tool-card.has-card-color .card-fav-btn {
  color: rgba(255, 255, 255, 0.7);
}

.tool-card.has-card-color .card-fav-btn:hover {
  color: #ffb340;
}

/* 深色模式下微调 */
:global([data-theme="dark"]) .tool-card.has-card-color .card-tag {
  background: rgba(0, 0, 0, 0.25);
}

/* 发现模式下详细信息面板 */
.discovery-mode {
  position: relative;
  overflow: visible !important;
}

/* 透明桥梁：连接卡片和面板，鼠标移过去不会断开 */
.discovery-mode::after {
  content: '';
  position: absolute;
  top: 0;
  left: 100%;
  width: 16px;
  height: 100%;
  background: transparent;
  pointer-events: auto;
  z-index: 1;
}

/* hover 时提高 z-index，防止面板被其他卡片遮住 */
.discovery-mode:hover {
  z-index: 50;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--glass-border);
}

.detail-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.detail-icon :deep(img),
.detail-icon :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.detail-source {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--btn-bg);
  padding: 2px 8px;
  border-radius: 4px;
}

.detail-body {
  margin-bottom: 12px;
}

.detail-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.meta-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.meta-value.hot {
  color: #ff6b35;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--card-hover-bg);
  padding: 3px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.detail-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--glass-border);
}

.detail-add-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-add-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.detail-link {
  padding: 8px 12px;
  color: var(--text-secondary);
  background: var(--card-hover-bg);
  border-radius: 8px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.detail-link:hover {
  color: var(--accent);
  background: var(--bg-tertiary);
}

/* 添加按钮样式 */
.card-action-btn.add {
  color: var(--accent);
}

.card-action-btn.add:hover {
  background: rgba(var(--accent-rgb), 0.1);
}
</style>

<style scoped>
/* 添加按钮样式 */
.card-action-btn.add {
  color: var(--accent);
}

.card-action-btn.add:hover {
  background: var(--card-btn-bg, var(--accent-soft));
  color: var(--accent);
}

/* 详细信息面板 */
.detail-panel {
  position: absolute;
  top: 0;
  left: calc(100% + 12px);
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 99999;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transform: translateX(8px);
  transition: all 0.2s ease-out;
  transition-delay: 200ms;
}

.discovery-mode:hover .detail-panel {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
  transition-delay: 0ms;
}

/* 暗色主题 */
:global([data-theme="dark"]) .detail-panel {
  background: rgba(28, 28, 32, 0.95);
  border-color: rgba(255, 255, 255, 0.08);
}

/* ===== 新版详细信息面板 ===== */
.detail-popup {
  position: absolute;
  top: 0;
  left: calc(100% + 12px);
  width: 320px;
  background: var(--modal-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--card-hover-shadow);
  z-index: 99999;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transform: translateX(8px);
  transition: all 0.2s ease-out;
}

.detail-popup.show {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--glass-border);
}

.detail-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.detail-icon :deep(img),
.detail-icon :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.detail-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.detail-source {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.detail-body {
  padding: 16px;
}

.detail-desc {
  margin: 0 0 14px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.meta-value.hot {
  color: #ff6b35;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  font-size: 11px;
  padding: 3px 8px;
  background: var(--tag-bg);
  color: var(--tag-color);
  border-radius: 6px;
}

.detail-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--glass-border);
  background: var(--card-hover-bg);
}

.detail-add-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-add-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.detail-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}

.detail-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 滑入淡出动画 */
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* 发现页模式下的卡片 */
.discovery-mode {
  cursor: pointer;
}
</style>
