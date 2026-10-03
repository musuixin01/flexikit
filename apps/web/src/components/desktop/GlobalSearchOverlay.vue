<template>
  <Teleport to="body">
    <Transition name="global-search">
      <div v-if="open" class="global-search-backdrop" @mousedown.self="closeSearch">
        <section class="global-search-panel" role="dialog" aria-modal="true" aria-label="FlexiKit 全局搜索">
          <div class="global-search-input-row">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input
              ref="inputRef"
              v-model="query"
              type="search"
              autocomplete="off"
              placeholder="搜索应用、工具、文件和文件夹…"
              @keydown="handleKeydown"
            >
            <kbd>Ctrl ⇧ Space</kbd>
          </div>

          <div class="global-search-meta">
            <span>{{ query.trim() ? '搜索结果' : '最近使用' }}</span>
            <span v-if="loading">正在搜索系统…</span>
          </div>

          <div ref="listRef" class="global-search-results">
            <button
              v-for="(result, index) in results"
              :key="result.id"
              type="button"
              class="global-search-result"
              :class="{ active: index === activeIndex }"
              @mouseenter="activeIndex = index"
              @click="openResult(result)"
            >
              <span class="global-search-icon" :data-kind="result.kind">
                <ToolIcon v-if="result.tool" :tool="result.tool" />
                <svg v-else-if="result.kind === 'app'" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
                <svg v-else-if="result.kind === 'folder'" viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></svg>
              </span>
              <span class="global-search-copy">
                <strong>{{ result.name }}</strong>
                <small>{{ result.detail }}</small>
              </span>
              <span class="global-search-kind">{{ kindLabel(result.kind) }}</span>
            </button>

            <div v-if="!results.length && !loading" class="global-search-empty">
              {{ query.trim() ? '没有找到匹配内容' : '使用 FlexiKit 后，最近打开的内容会显示在这里' }}
            </div>
          </div>

          <footer class="global-search-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
            <span><kbd>Enter</kbd> 打开</span>
            <span><kbd>Esc</kbd> 关闭</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolIcon from '@/components/tools/ToolIcon.vue'
import { invokeDesktop } from '@/api/runtime'
import { openDesktopTool } from '@/desktop/openTool'
import { useToolsStore } from '@/stores/tools'
import type { Tool } from '@/types/tool'
import { getPersonalToolScore, readToolUsage } from '@/utils/toolUsage'
import { isSearchRecentsEnabled } from '@/privacy/privacyPreferences'

type ResultKind = 'tool' | 'app' | 'file' | 'folder'
type SystemSearchSnapshot = [ResultKind, string, string, string]

interface SearchResult {
  id: string
  kind: ResultKind
  name: string
  detail: string
  score: number
  path?: string
  tool?: Tool
}

interface RecentSystemItem {
  kind: Exclude<ResultKind, 'tool'>
  name: string
  path: string
  detail: string
  lastOpenedAt: number
}

const tools = useToolsStore()
const RECENT_SYSTEM_KEY = 'flexikit-global-search-recents-v1'
const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const loading = ref(false)
const systemResults = ref<SearchResult[]>([])
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let requestId = 0

function textMatchScore(tool: Tool, keyword: string): number {
  const name = tool.name.toLowerCase()
  if (name === keyword) return 132
  if (name.startsWith(keyword)) return 112
  if (name.includes(keyword)) return 92
  if ((tool.tags || []).some(tag => tag.toLowerCase().includes(keyword))) return 70
  if (tool.cat.toLowerCase().includes(keyword)) return 58
  if (tool.desc.toLowerCase().includes(keyword)) return 50
  return 0
}

function readSystemRecents(): RecentSystemItem[] {
  if (!isSearchRecentsEnabled()) return []
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SYSTEM_KEY) || '[]')
    return Array.isArray(value) ? value.slice(0, 40) as RecentSystemItem[] : []
  } catch {
    return []
  }
}

function recordSystemRecent(result: SearchResult): void {
  if (!isSearchRecentsEnabled()) return
  if (!result.path || result.kind === 'tool') return
  const next: RecentSystemItem = {
    kind: result.kind,
    name: result.name,
    path: result.path,
    detail: result.detail,
    lastOpenedAt: Date.now(),
  }
  const recents = [next, ...readSystemRecents().filter(item => item.path !== result.path)].slice(0, 40)
  localStorage.setItem(RECENT_SYSTEM_KEY, JSON.stringify(recents))
}

const recentResults = computed<SearchResult[]>(() => {
  const usage = readToolUsage()
  const toolRecents = tools.allTools
    .map(tool => ({ tool, score: getPersonalToolScore(tool, usage) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 7)
    .map(({ tool, score }) => ({
      id: `tool:${tool.id ?? tool.name}`,
      kind: 'tool' as const,
      name: tool.name,
      detail: tool.desc || tool.cat,
      score: 80 + score,
      tool,
    }))
  const systemRecents = readSystemRecents().slice(0, 7).map((item, index) => ({
    id: `${item.kind}:${item.path}`,
    kind: item.kind,
    name: item.name,
    detail: item.detail,
    path: item.path,
    score: 74 - index,
  }))
  return [...toolRecents, ...systemRecents]
    .sort((left, right) => right.score - left.score)
    .slice(0, 10)
})

const toolResults = computed<SearchResult[]>(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return []
  const usage = readToolUsage()
  return tools.allTools
    .map(tool => {
      const textScore = textMatchScore(tool, keyword)
      const personal = Math.min(18, getPersonalToolScore(tool, usage) / 3)
      return { tool, score: textScore + personal }
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ tool, score }) => ({
      id: `tool:${tool.id ?? tool.name}`,
      kind: 'tool' as const,
      name: tool.name,
      detail: tool.desc || tool.cat,
      score,
      tool,
    }))
})

const results = computed<SearchResult[]>(() => {
  if (!query.value.trim()) return recentResults.value
  return [...toolResults.value, ...systemResults.value]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'zh-CN'))
    .slice(0, 14)
})

function kindLabel(kind: ResultKind): string {
  return { tool: '工具', app: '应用', file: '文件', folder: '文件夹' }[kind]
}

async function refreshSystemResults(keyword: string): Promise<void> {
  const id = ++requestId
  if (!keyword) {
    systemResults.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const snapshots = await invokeDesktop<SystemSearchSnapshot[]>('search_system_items', { query: keyword, limit: 20 })
    if (id !== requestId) return
    systemResults.value = snapshots.map((item, index) => ({
      id: `${item[0]}:${item[2]}`,
      kind: item[0],
      name: item[1],
      path: item[2],
      detail: item[3],
      score: 90 - index * 1.5 + (item[0] === 'app' ? 8 : item[0] === 'folder' ? 2 : 0),
    }))
  } catch {
    if (id === requestId) systemResults.value = []
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(query, value => {
  activeIndex.value = 0
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void refreshSystemResults(value.trim()), 90)
})

watch(activeIndex, () => {
  nextTick(() => {
    listRef.value?.querySelector('.global-search-result.active')?.scrollIntoView({ block: 'nearest' })
  })
})

async function showSearch(): Promise<void> {
  if (!tools.isLoaded) await tools.initData()
  open.value = true
  query.value = ''
  activeIndex.value = 0
  systemResults.value = []
  await nextTick()
  inputRef.value?.focus()
}

function closeSearch(): void {
  open.value = false
  query.value = ''
  systemResults.value = []
}

async function openResult(result: SearchResult): Promise<void> {
  if (result.tool) {
    await openDesktopTool(result.tool)
  } else if (result.path) {
    await invokeDesktop('open_search_result', { path: result.path })
    recordSystemRecent(result)
  }
  closeSearch()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(results.value.length - 1, activeIndex.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = results.value[activeIndex.value]
    if (selected) void openResult(selected)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeSearch()
  }
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
    event.preventDefault()
    void showSearch()
  }
}

onMounted(() => {
  window.addEventListener('flexikit-global-search-open', showSearch)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  window.removeEventListener('flexikit-global-search-open', showSearch)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.global-search-backdrop{position:fixed;inset:0;z-index:10000;display:flex;justify-content:center;align-items:flex-start;padding-top:min(16vh,150px);background:rgb(8 12 20 / 22%);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.global-search-panel{width:min(720px,calc(100vw - 48px));max-height:min(70vh,680px);overflow:hidden;border:1px solid rgb(255 255 255 / 24%);border-radius:24px;background:color-mix(in srgb,var(--bg-primary) 78%,transparent);backdrop-filter:blur(28px) saturate(150%);-webkit-backdrop-filter:blur(28px) saturate(150%);box-shadow:0 28px 80px rgb(0 0 0 / 18%),inset 0 1px 0 rgb(255 255 255 / 24%);display:flex;flex-direction:column}
.global-search-input-row{height:72px;display:flex;align-items:center;gap:12px;padding:0 20px;border-bottom:1px solid var(--glass-border)}
.global-search-input-row>svg{width:23px;height:23px;fill:none;stroke:var(--text-tertiary);stroke-width:1.8;flex:0 0 auto}
.global-search-input-row input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:1.08rem;letter-spacing:-.01em}
.global-search-input-row input::placeholder{color:var(--text-tertiary)}
kbd{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 7px;border:1px solid var(--glass-border);border-radius:7px;background:var(--btn-bg);color:var(--text-tertiary);font:600 .68rem/1 system-ui;box-shadow:inset 0 1px 0 rgb(255 255 255 / 18%)}
.global-search-meta{display:flex;justify-content:space-between;padding:12px 20px 7px;color:var(--text-tertiary);font-size:.7rem;font-weight:650;letter-spacing:.04em}
.global-search-results{min-height:160px;overflow:auto;padding:3px 10px 10px;scrollbar-gutter:stable}
.global-search-result{width:100%;display:flex;align-items:center;gap:12px;padding:10px;border:0;border-radius:14px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.global-search-result:hover,.global-search-result.active{background:var(--btn-bg-hover);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 12%,transparent)}
.global-search-result:active{transform:scale(.99)}
.global-search-icon{width:38px;height:38px;display:grid;place-items:center;flex:0 0 auto;border:1px solid var(--glass-border);border-radius:12px;background:var(--icon-surface);box-shadow:inset 0 1px 0 rgb(255 255 255 / 18%)}
.global-search-icon :deep(img),.global-search-icon :deep(svg),.global-search-icon>svg{width:23px;height:23px;object-fit:contain;fill:none;stroke:currentColor;stroke-width:1.6}
.global-search-icon[data-kind="app"]{color:var(--primary)}
.global-search-icon[data-kind="folder"]{color:#d49a2f}
.global-search-copy{display:grid;gap:3px;min-width:0;flex:1}
.global-search-copy strong{font-size:.84rem;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.global-search-copy small{font-size:.68rem;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.global-search-kind{flex:0 0 auto;padding:4px 8px;border-radius:999px;background:var(--btn-bg);color:var(--text-tertiary);font-size:.62rem}
.global-search-empty{min-height:170px;display:grid;place-items:center;color:var(--text-tertiary);font-size:.78rem;text-align:center}
.global-search-footer{display:flex;gap:16px;align-items:center;padding:10px 18px;border-top:1px solid var(--glass-border);color:var(--text-tertiary);font-size:.66rem}
.global-search-footer span{display:flex;align-items:center;gap:5px}
.global-search-enter-active,.global-search-leave-active{transition:opacity .3s cubic-bezier(.25,.1,.25,1)}
.global-search-enter-active .global-search-panel,.global-search-leave-active .global-search-panel{transition:transform .3s cubic-bezier(.25,.1,.25,1),opacity .3s cubic-bezier(.25,.1,.25,1)}
.global-search-enter-from,.global-search-leave-to{opacity:0}
.global-search-enter-from .global-search-panel,.global-search-leave-to .global-search-panel{opacity:0;transform:translateY(-10px) scale(.985)}
@media (prefers-reduced-motion:reduce){.global-search-result,.global-search-enter-active,.global-search-leave-active,.global-search-enter-active .global-search-panel,.global-search-leave-active .global-search-panel{transition-duration:.01ms!important}}
</style>
