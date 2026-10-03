<template>
  <section class="desktop-organizer">
    <header class="organizer-head">
      <span>
        <small>DESKTOP</small>
        <strong>桌面收纳</strong>
      </span>
      <div>
        <b>{{ items.length }} 项</b>
        <button
          v-if="!settingsOpen"
          type="button"
          class="search-toggle"
          :class="{ active: searchOpen }"
          title="搜索桌面"
          aria-label="搜索桌面"
          @click.stop="toggleDesktopSearch"
        >⌕</button>
        <button type="button" class="category-settings-toggle" :class="{ active: settingsOpen }" title="分类设置" @click.stop="settingsOpen ? closeCategorySettings() : openCategorySettings()">分类</button>
        <button v-if="!settingsOpen && !searchOpen" type="button" title="刷新桌面" @click.stop="refresh">↻</button>
      </div>
    </header>

    <div v-if="searchOpen" class="organizer-search">
      <span>⌕</span>
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="search"
        maxlength="120"
        autocomplete="off"
        spellcheck="false"
        placeholder="搜索桌面文件和文件夹"
        aria-label="搜索桌面文件和文件夹"
        @input="scheduleDesktopSearch"
      >
      <button
        v-if="searchQuery"
        type="button"
        title="清除搜索"
        aria-label="清除搜索"
        @click.stop="clearDesktopSearchQuery"
      >×</button>
    </div>

    <div v-if="settingsOpen" class="category-settings">
      <div class="settings-intro">
        <span>
          <strong>分类规则</strong>
          <small>只改变这里的分组显示，不会移动桌面文件</small>
        </span>
        <button type="button" @click.stop="resetCategoryRules">恢复默认</button>
      </div>

      <div class="rule-list">
        <article v-for="category in draftCategories" :key="category.id" class="rule-card">
          <div class="rule-title">
            <span>{{ category.icon }}</span>
            <input v-model="category.label" maxlength="18" aria-label="分类名称">
            <button
              v-if="category.custom"
              type="button"
              title="删除自定义分类"
              @click.stop="removeCustomCategory(category.id)"
            >×</button>
          </div>

          <label v-if="category.kind === 'extension'" class="extension-field">
            <span>扩展名</span>
            <input
              :value="category.extensions.join(', ')"
              maxlength="360"
              placeholder="例如 pdf, docx, xlsx"
              @input="onExtensionsInput(category.id, $event)"
            >
          </label>
          <small v-else-if="category.kind === 'folder'" class="rule-note">所有文件夹自动归到这里</small>
          <small v-else class="rule-note">没有匹配到扩展名的项目归到这里</small>
        </article>
      </div>

      <div class="settings-actions">
        <button type="button" @click.stop="addCustomCategory">+ 新分类</button>
        <span></span>
        <button type="button" @click.stop="closeCategorySettings">取消</button>
        <button class="primary" type="button" @click.stop="saveCategoryRules">保存</button>
      </div>
    </div>

    <div v-else-if="loading && !items.length" class="organizer-state">正在整理桌面…</div>
    <div v-else-if="error" class="organizer-state">{{ error }}</div>
    <div v-else-if="!items.length" class="organizer-state">桌面很干净，没有需要收纳的项目</div>

    <div v-else class="category-list">
      <section v-if="searchQuery.trim()" class="category-block search-results-block">
        <header>
          <span>⌕</span>
          <strong>搜索结果</strong>
          <small>{{ searchResults.length }}</small>
        </header>
        <div v-if="searchLoading" class="preview-state">正在搜索桌面…</div>
        <div v-else-if="searchError" class="preview-state">{{ searchError }}</div>
        <div v-else-if="!searchResults.length" class="preview-state">没有找到匹配的桌面项目</div>
        <div v-else class="item-grid">
          <div v-for="item in searchResults" :key="item.path" class="item-shell">
            <button class="item-card" type="button" :title="item.path" @dblclick.stop="activateItem(item)">
              <i class="item-icon">
                <img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt="">
                <span v-else>{{ itemFallbackIcon(item) }}</span>
              </i>
              <span>
                {{ item.name }}
                <small class="item-meta">{{ searchItemMeta(item) }}</small>
              </span>
            </button>
            <button
              v-if="item.isDirectory"
              class="folder-action"
              type="button"
              :aria-label="`快速展开 ${item.name}`"
              title="快速展开"
              @click.stop="toggleFolderPreview(item)"
            >›</button>
          </div>
        </div>
      </section>

      <template v-else>
      <section v-if="pinnedItems.length" class="category-block pinned-block">
        <header>
          <span>★</span>
          <strong>常用</strong>
          <small>{{ pinnedItems.length }}</small>
        </header>
        <div class="item-grid">
          <div v-for="item in pinnedItems" :key="item.path" class="item-shell">
            <button
              class="item-card"
              type="button"
              :title="item.path"
              @dblclick.stop="activateItem(item)"
            >
              <i class="item-icon">
                <img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt="">
                <span v-else>{{ itemFallbackIcon(item) }}</span>
              </i>
              <span>{{ item.name }}</span>
            </button>
            <button
              v-if="item.isDirectory"
              class="folder-action"
              type="button"
              :aria-label="`快速展开 ${item.name}`"
              title="快速展开"
              @click.stop="toggleFolderPreview(item)"
            >›</button>
            <button
              class="pin-action active"
              type="button"
              :aria-label="`取消置顶 ${item.name}`"
              title="取消置顶"
              @click.stop="togglePinned(item)"
            >★</button>
          </div>
        </div>
      </section>

      <section v-if="recentItems.length" class="category-block recent-block">
        <header>
          <span>◷</span>
          <strong>最近修改</strong>
          <small>{{ recentItems.length }}</small>
        </header>
        <div class="item-grid">
          <div v-for="item in recentItems" :key="item.path" class="item-shell">
            <button class="item-card" type="button" :title="item.path" @dblclick.stop="openItem(item)">
              <i class="item-icon"><img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt=""><span v-else>{{ itemFallbackIcon(item) }}</span></i>
              <span>{{ item.name }}<small class="item-meta">{{ formatModifiedAt(item.modifiedAt) }}</small></span>
            </button>
            <button class="pin-action" type="button" title="置顶到常用" @click.stop="togglePinned(item)">☆</button>
          </div>
        </div>
      </section>

      <section v-if="expandedFolder" class="category-block folder-preview-block">
        <header class="folder-preview-head">
          <button
            v-if="folderHistory.length > 1"
            type="button"
            class="preview-nav"
            title="返回上一层"
            aria-label="返回上一层"
            @click.stop="goBackFolderPreview"
          >‹</button>
          <span>▣</span>
          <strong>{{ expandedFolder.name }}</strong>
          <small>{{ folderPreviewItems.length }}</small>
          <button
            type="button"
            class="preview-close"
            title="关闭预览"
            aria-label="关闭文件夹预览"
            @click.stop="closeFolderPreview"
          >×</button>
        </header>

        <div v-if="folderLoading" class="preview-state">正在读取文件夹…</div>
        <div v-else-if="folderError" class="preview-state">{{ folderError }}</div>
        <div v-else-if="!folderPreviewItems.length" class="preview-state">这个文件夹是空的</div>
        <div v-else class="item-grid">
          <div v-for="item in folderPreviewItems" :key="item.path" class="item-shell">
            <button class="item-card" type="button" :title="item.path" @dblclick.stop="activatePreviewItem(item)">
              <i class="item-icon">
                <img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt="">
                <span v-else>{{ itemFallbackIcon(item) }}</span>
              </i>
              <span>
                {{ item.name }}
                <small class="item-meta">{{ item.isDirectory ? '文件夹' : formatModifiedAt(item.modifiedAt) }}</small>
              </span>
            </button>
            <button
              v-if="item.isDirectory"
              class="folder-action"
              type="button"
              :aria-label="`进入 ${item.name}`"
              title="进入文件夹"
              @click.stop="enterFolderPreview(item)"
            >›</button>
          </div>
        </div>
      </section>

      <section v-for="group in groups" :key="group.id" class="category-block">
        <header>
          <span>{{ group.icon }}</span>
          <strong>{{ group.label }}</strong>
          <small>{{ group.items.length }}</small>
        </header>
        <div class="item-grid">
          <div v-for="item in group.items" :key="item.path" class="item-shell">
            <button
              class="item-card"
              type="button"
              :title="item.path"
              @dblclick.stop="activateItem(item)"
            >
              <i class="item-icon">
                <img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt="">
                <span v-else>{{ itemFallbackIcon(item) }}</span>
              </i>
              <span>{{ item.name }}</span>
            </button>
            <button
              v-if="item.isDirectory"
              class="folder-action"
              type="button"
              :aria-label="`快速展开 ${item.name}`"
              title="快速展开"
              @click.stop="toggleFolderPreview(item)"
            >›</button>
            <button
              class="pin-action"
              type="button"
              :aria-label="`置顶 ${item.name}`"
              title="置顶到常用"
              @click.stop="togglePinned(item)"
            >☆</button>
          </div>
        </div>
      </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

const props = defineProps<{ widget: DesktopWidget }>()

type DesktopItemTuple = [string, string, string, boolean, number]
type CategoryKind = 'folder' | 'extension' | 'other'

interface DesktopItem {
  path: string
  name: string
  extension: string
  isDirectory: boolean
  modifiedAt: number
}

interface FolderPreviewItem extends DesktopItem {}


interface DesktopCategoryRule {
  id: string
  label: string
  icon: string
  kind: CategoryKind
  extensions: string[]
  custom: boolean
}

const DEFAULT_CATEGORY_RULES: DesktopCategoryRule[] = [
  { id: 'folder', label: '文件夹', icon: '▣', kind: 'folder', extensions: [], custom: false },
  { id: 'app', label: '应用与快捷方式', icon: '⌘', kind: 'extension', extensions: ['lnk', 'url', 'exe', 'msi', 'appref-ms'], custom: false },
  { id: 'document', label: '文档', icon: '▤', kind: 'extension', extensions: ['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'rtf'], custom: false },
  { id: 'image', label: '图片', icon: '▧', kind: 'extension', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'], custom: false },
  { id: 'media', label: '影音', icon: '▶', kind: 'extension', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'mp4', 'mov', 'mkv', 'avi', 'webm'], custom: false },
  { id: 'archive', label: '压缩包', icon: '◫', kind: 'extension', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'], custom: false },
  { id: 'code', label: '代码', icon: '</>', kind: 'extension', extensions: ['js', 'ts', 'tsx', 'jsx', 'vue', 'rs', 'py', 'c', 'cpp', 'h', 'hpp', 'java', 'json', 'yaml', 'yml', 'toml', 'html', 'css'], custom: false },
  { id: 'other', label: '其他', icon: '◇', kind: 'other', extensions: [], custom: false },
]

const canvas = useDesktopCanvasStore()
const items = ref<DesktopItem[]>([])
const loading = ref(false)
const error = ref('')
const itemIcons = ref<Record<string, string>>({})
const iconFailures = new Set<string>()
const folderHistory = ref<DesktopItem[]>([])
const expandedFolder = computed(() => folderHistory.value[folderHistory.value.length - 1] ?? null)
const folderPreviewItems = ref<FolderPreviewItem[]>([])
const folderLoading = ref(false)
const folderError = ref('')
const searchOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref<DesktopItem[]>([])
const searchLoading = ref(false)
const searchError = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const settingsOpen = ref(false)
const draftCategories = ref<DesktopCategoryRule[]>([])
let refreshTimer: ReturnType<typeof setInterval> | null = null

function cloneRules(rules: DesktopCategoryRule[]): DesktopCategoryRule[] {
  return rules.map(rule => ({ ...rule, extensions: [...rule.extensions] }))
}

function normalizeExtension(value: string): string {
  return value.trim().toLowerCase().replace(/^\.+/, '')
}

function parseExtensions(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/[\s,，;；]+/)
      .map(normalizeExtension)
      .filter(extension => extension.length > 0 && extension.length <= 24 && /^[a-z0-9][a-z0-9+._-]*$/.test(extension)),
  )).slice(0, 80)
}

function normalizeStoredRules(value: unknown): DesktopCategoryRule[] {
  if (!Array.isArray(value)) return cloneRules(DEFAULT_CATEGORY_RULES)

  const sanitized = value
    .filter(rule => rule && typeof rule === 'object')
    .map((rule): DesktopCategoryRule | null => {
      const record = rule as Record<string, unknown>
      const kind = record.kind
      if (kind !== 'folder' && kind !== 'extension' && kind !== 'other') return null
      if (typeof record.id !== 'string' || !record.id.trim()) return null
      const label = typeof record.label === 'string' ? record.label.trim().slice(0, 18) : ''
      const icon = typeof record.icon === 'string' ? record.icon.slice(0, 4) : '◆'
      const extensions = kind === 'extension' && Array.isArray(record.extensions)
        ? Array.from(new Set(record.extensions
          .filter((extension): extension is string => typeof extension === 'string')
          .map(normalizeExtension)
          .filter(Boolean))).slice(0, 80)
        : []
      return {
        id: record.id,
        label: label || '未命名分类',
        icon: icon || '◆',
        kind,
        extensions,
        custom: record.custom === true,
      }
    })
    .filter((rule): rule is DesktopCategoryRule => rule !== null)

  const folder = sanitized.find(rule => rule.kind === 'folder')
  const other = sanitized.find(rule => rule.kind === 'other')
  if (!folder || !other) return cloneRules(DEFAULT_CATEGORY_RULES)
  return sanitized.slice(0, 20)
}

const categoryRules = computed(() => normalizeStoredRules(props.widget.config.organizerCategories))

const pinnedPaths = computed<string[]>(() => {
  const value = props.widget.config.organizerPinnedPaths
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value.filter((path): path is string => typeof path === 'string' && path.length > 0),
  )).slice(0, 80)
})

const pinnedPathSet = computed(() => new Set(pinnedPaths.value))
const itemByPath = computed(() => new Map(items.value.map(item => [item.path, item])))
const pinnedItems = computed(() => pinnedPaths.value
  .map(path => itemByPath.value.get(path))
  .filter((item): item is DesktopItem => item !== undefined))

const recentItems = computed(() => items.value
  .filter(item => !item.isDirectory && !pinnedPathSet.value.has(item.path) && item.modifiedAt > 0)
  .sort((left, right) => right.modifiedAt - left.modifiedAt)
  .slice(0, 6))
const recentPathSet = computed(() => new Set(recentItems.value.map(item => item.path)))

function categoryForItem(item: DesktopItem): DesktopCategoryRule {
  if (item.isDirectory) {
    return categoryRules.value.find(rule => rule.kind === 'folder')
      ?? DEFAULT_CATEGORY_RULES[0]
  }

  const extension = normalizeExtension(item.extension)
  return categoryRules.value.find(rule => (
    rule.kind === 'extension' && rule.extensions.includes(extension)
  )) ?? categoryRules.value.find(rule => rule.kind === 'other')
    ?? DEFAULT_CATEGORY_RULES[DEFAULT_CATEGORY_RULES.length - 1]
}

const groups = computed(() => categoryRules.value
  .map(category => ({
    ...category,
    items: items.value.filter(item => (
      !pinnedPathSet.value.has(item.path)
      && !recentPathSet.value.has(item.path)
      && categoryForItem(item).id === category.id
    )),
  }))
  .filter(group => group.items.length > 0))

function itemFallbackIcon(item: DesktopItem): string {
  return categoryForItem(item).icon
}

function openCategorySettings(): void {
  closeDesktopSearch()
  closeFolderPreview()
  draftCategories.value = cloneRules(categoryRules.value)
  settingsOpen.value = true
}

function closeCategorySettings(): void {
  settingsOpen.value = false
  draftCategories.value = []
}

function updateDraftExtensions(categoryId: string, value: string): void {
  const extensions = parseExtensions(value)
  const owned = new Set(extensions)
  draftCategories.value = draftCategories.value.map(category => {
    if (category.id === categoryId) return { ...category, extensions }
    if (category.kind !== 'extension' || !owned.size) return category
    return {
      ...category,
      extensions: category.extensions.filter(extension => !owned.has(extension)),
    }
  })
}

function onExtensionsInput(categoryId: string, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  updateDraftExtensions(categoryId, target.value)
}

function addCustomCategory(): void {
  const otherIndex = draftCategories.value.findIndex(category => category.kind === 'other')
  const category: DesktopCategoryRule = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: '自定义分类',
    icon: '◆',
    kind: 'extension',
    extensions: [],
    custom: true,
  }
  const next = [...draftCategories.value]
  next.splice(otherIndex >= 0 ? otherIndex : next.length, 0, category)
  draftCategories.value = next
}

function removeCustomCategory(categoryId: string): void {
  draftCategories.value = draftCategories.value.filter(category => !(
    category.id === categoryId && category.custom
  ))
}

function resetCategoryRules(): void {
  draftCategories.value = cloneRules(DEFAULT_CATEGORY_RULES)
}

function saveCategoryRules(): void {
  const normalized = draftCategories.value.map(category => ({
    ...category,
    label: category.label.trim().slice(0, 18) || '未命名分类',
    extensions: category.kind === 'extension'
      ? Array.from(new Set(category.extensions.map(normalizeExtension).filter(Boolean))).slice(0, 80)
      : [],
  }))

  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      organizerCategories: normalized,
    },
  })
  closeCategorySettings()
}

function togglePinned(item: DesktopItem): void {
  const existing = pinnedPaths.value.filter(path => path !== item.path)
  const next = pinnedPathSet.value.has(item.path)
    ? existing
    : [item.path, ...existing].slice(0, 80)

  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      organizerPinnedPaths: next,
    },
  })
}

function formatModifiedAt(timestamp: number): string {
  if (!timestamp) return '时间未知'
  const value = new Date(timestamp * 1000)
  const now = Date.now()
  const delta = Math.max(0, now - value.getTime())
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return '刚刚修改'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return value.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

async function ensureItemIcon(item: DesktopItem): Promise<void> {
  if (!isDesktopRuntime() || itemIcons.value[item.path] || iconFailures.has(item.path)) return
  try {
    const icon = await invokeDesktop<string | null>('get_desktop_item_icon', { path: item.path })
    if (icon) {
      itemIcons.value = { ...itemIcons.value, [item.path]: icon }
    } else {
      iconFailures.add(item.path)
    }
  } catch {
    iconFailures.add(item.path)
  }
}

function loadVisibleIcons(list: DesktopItem[]): void {
  list.forEach(item => void ensureItemIcon(item))
}

async function refresh(): Promise<void> {
  if (!isDesktopRuntime() || loading.value) return
  loading.value = true
  try {
    const result = await invokeDesktop<DesktopItemTuple[]>('get_desktop_items')
    items.value = result.map(([path, name, extension, isDirectory, modifiedAt]) => ({
      path,
      name,
      extension,
      isDirectory,
      modifiedAt,
    }))
    loadVisibleIcons(items.value)
    error.value = ''
  } catch {
    error.value = '暂时无法读取桌面内容'
  } finally {
    loading.value = false
  }
}

function closeDesktopSearch(): void {
  if (searchTimer !== null) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = ''
  searchLoading.value = false
}

async function toggleDesktopSearch(): Promise<void> {
  if (searchOpen.value) {
    closeDesktopSearch()
    return
  }
  closeCategorySettings()
  closeFolderPreview()
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

function clearDesktopSearchQuery(): void {
  if (searchTimer !== null) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = ''
  searchInput.value?.focus()
}

function scheduleDesktopSearch(): void {
  if (searchTimer !== null) clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (!query) {
    searchResults.value = []
    searchError.value = ''
    searchLoading.value = false
    return
  }
  searchTimer = setTimeout(() => {
    searchTimer = null
    void runDesktopSearch(query)
  }, 180)
}

async function runDesktopSearch(query: string): Promise<void> {
  if (!isDesktopRuntime()) return
  searchLoading.value = true
  searchError.value = ''
  try {
    const result = await invokeDesktop<DesktopItemTuple[]>('search_desktop_items', { query })
    if (searchQuery.value.trim() !== query) return
    searchResults.value = result.map(([path, name, extension, isDirectory, modifiedAt]) => ({
      path,
      name,
      extension,
      isDirectory,
      modifiedAt,
    }))
    loadVisibleIcons(searchResults.value)
  } catch {
    if (searchQuery.value.trim() === query) {
      searchResults.value = []
      searchError.value = '暂时无法搜索桌面'
    }
  } finally {
    if (searchQuery.value.trim() === query) searchLoading.value = false
  }
}

function searchItemMeta(item: DesktopItem): string {
  if (item.isDirectory) return '文件夹'
  const parts = item.path.split(/[\\/]/).filter(Boolean)
  const parent = parts.length > 1 ? parts[parts.length - 2] : ''
  const time = formatModifiedAt(item.modifiedAt)
  return parent ? `${parent} · ${time}` : time
}

function closeFolderPreview(): void {
  folderHistory.value = []
  folderPreviewItems.value = []
  folderError.value = ''
}

async function loadFolderPreview(item: DesktopItem, pushHistory: boolean): Promise<void> {
  if (!item.isDirectory || folderLoading.value) return
  folderLoading.value = true
  folderError.value = ''
  try {
    const result = await invokeDesktop<DesktopItemTuple[]>('get_desktop_folder_preview', { path: item.path })
    const nextItems = result.map(([path, name, extension, isDirectory, modifiedAt]) => ({
      path,
      name,
      extension,
      isDirectory,
      modifiedAt,
    }))
    folderPreviewItems.value = nextItems
    if (pushHistory) {
      folderHistory.value = [...folderHistory.value, item].slice(-12)
    }
    loadVisibleIcons(nextItems)
  } catch {
    folderError.value = '无法读取这个文件夹'
  } finally {
    folderLoading.value = false
  }
}

async function toggleFolderPreview(item: DesktopItem): Promise<void> {
  if (expandedFolder.value?.path === item.path) {
    closeFolderPreview()
    return
  }
  folderHistory.value = []
  await loadFolderPreview(item, true)
}

async function enterFolderPreview(item: DesktopItem): Promise<void> {
  await loadFolderPreview(item, true)
}

async function goBackFolderPreview(): Promise<void> {
  if (folderHistory.value.length <= 1) {
    closeFolderPreview()
    return
  }
  const nextHistory = folderHistory.value.slice(0, -1)
  const previous = nextHistory[nextHistory.length - 1]
  folderHistory.value = nextHistory
  await loadFolderPreview(previous, false)
}

async function activatePreviewItem(item: DesktopItem): Promise<void> {
  if (item.isDirectory) {
    await enterFolderPreview(item)
    return
  }
  await openItem(item)
}

async function activateItem(item: DesktopItem): Promise<void> {
  if (item.isDirectory) {
    await toggleFolderPreview(item)
    return
  }
  await openItem(item)
}

async function openItem(item: DesktopItem): Promise<void> {
  try {
    await invokeDesktop('open_desktop_item', { path: item.path })
  } catch {
    error.value = '无法打开这个桌面项目'
  }
}

function handleFocus(): void {
  void refresh()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (expandedFolder.value) {
    closeFolderPreview()
    return
  }
  if (searchOpen.value) closeDesktopSearch()
}

onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => void refresh(), 6000)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) clearInterval(refreshTimer)
  if (searchTimer !== null) clearTimeout(searchTimer)
  window.removeEventListener('focus', handleFocus)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.desktop-organizer{height:100%;display:flex;flex-direction:column;min-height:0;padding:16px 16px 14px;color:var(--text-primary)}
.organizer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.organizer-head>span{display:grid;gap:2px}
.organizer-head small{font-size:.48rem;letter-spacing:.12em;color:var(--text-tertiary)}
.organizer-head strong{font-size:.82rem;font-weight:700}
.organizer-head>div{display:flex;align-items:center;gap:7px}
.organizer-head b{font-size:.56rem;font-weight:650;color:var(--text-tertiary)}
.organizer-head button{width:28px;height:28px;border:1px solid var(--glass-border);border-radius:9px;background:var(--btn-bg);color:var(--text-secondary);cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.organizer-head button.category-settings-toggle{width:auto;min-width:42px;padding:0 8px;font-size:.52rem}
.organizer-head button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.organizer-head button:active{transform:scale(.98)}
.organizer-head button.active{background:color-mix(in srgb,var(--primary) 10%,var(--btn-bg));border-color:color-mix(in srgb,var(--primary) 22%,var(--glass-border));color:var(--text-primary)}
.organizer-search{display:grid;grid-template-columns:20px minmax(0,1fr) 24px;align-items:center;gap:6px;margin:-3px 0 10px;padding:5px 7px;border:1px solid var(--glass-border);border-radius:11px;background:color-mix(in srgb,var(--btn-bg) 78%,transparent);transition:all .3s cubic-bezier(.25,.1,.25,1)}
.organizer-search:focus-within{border-color:color-mix(in srgb,var(--primary) 30%,var(--glass-border));background:var(--btn-bg-hover)}
.organizer-search>span{display:grid;place-items:center;color:var(--text-tertiary);font-size:.62rem}
.organizer-search input{min-width:0;height:24px;padding:0;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:.56rem}
.organizer-search input::placeholder{color:var(--text-tertiary)}
.organizer-search button{width:22px;height:22px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--text-tertiary);cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.organizer-search button:hover{background:var(--icon-surface);color:var(--text-primary);transform:scale(1.02)}
.organizer-search button:active{transform:scale(.98)}
.category-settings{min-height:0;flex:1;display:flex;flex-direction:column;gap:10px}
.settings-intro{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid var(--glass-border);border-radius:12px;background:color-mix(in srgb,var(--btn-bg) 78%,transparent)}
.settings-intro>span{display:grid;gap:2px;min-width:0}
.settings-intro strong{font-size:.64rem;font-weight:700}
.settings-intro small{font-size:.5rem;color:var(--text-tertiary);line-height:1.35}
.settings-intro button,.settings-actions button,.rule-title button{border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.settings-intro button{height:26px;padding:0 9px;font-size:.52rem;white-space:nowrap}
.rule-list{min-height:0;overflow:auto;display:grid;gap:8px;padding-right:3px;scrollbar-width:thin}
.rule-card{display:grid;gap:7px;padding:9px 10px;border:1px solid var(--glass-border);border-radius:12px;background:color-mix(in srgb,var(--btn-bg) 72%,transparent)}
.rule-title{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:7px}
.rule-title>span{width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:var(--icon-surface);font-size:.56rem;color:var(--text-secondary)}
.rule-title input,.extension-field input{min-width:0;height:27px;border:1px solid transparent;border-radius:8px;outline:none;background:color-mix(in srgb,var(--bg-elevated) 64%,transparent);color:var(--text-primary);font:inherit;transition:all .25s cubic-bezier(.25,.1,.25,1)}
.rule-title input{padding:0 8px;font-size:.59rem;font-weight:650}
.rule-title input:focus,.extension-field input:focus{border-color:color-mix(in srgb,var(--primary) 35%,var(--glass-border));background:var(--btn-bg-hover)}
.rule-title button{width:24px;height:24px;font-size:.68rem}
.extension-field{display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:7px}
.extension-field>span,.rule-note{font-size:.49rem;color:var(--text-tertiary)}
.extension-field input{padding:0 8px;font-size:.52rem}
.rule-note{padding-left:29px;line-height:1.35}
.settings-actions{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:7px;padding-top:1px}
.settings-actions button{height:28px;padding:0 10px;font-size:.53rem}
.settings-actions button:hover,.settings-intro button:hover,.rule-title button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:translateY(-1px)}
.settings-actions button:active,.settings-intro button:active,.rule-title button:active{transform:scale(.98)}
.settings-actions button.primary{background:color-mix(in srgb,var(--primary) 14%,var(--btn-bg));border-color:color-mix(in srgb,var(--primary) 26%,var(--glass-border));color:var(--text-primary)}
.organizer-state{flex:1;display:grid;place-items:center;text-align:center;color:var(--text-tertiary);font-size:.64rem}
.category-list{min-height:0;overflow:auto;display:grid;gap:13px;padding-right:4px;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--text-tertiary) 24%,transparent) transparent}
.category-block>header{display:flex;align-items:center;gap:7px;margin:0 2px 7px}
.category-block>header>span{width:20px;height:20px;display:grid;place-items:center;border-radius:7px;background:var(--icon-surface);font-size:.58rem;color:var(--text-secondary)}
.category-block>header strong{font-size:.62rem;font-weight:680}
.category-block>header small{margin-left:auto;font-size:.52rem;color:var(--text-tertiary)}
.item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:7px}
.item-shell{position:relative;min-width:0}
.item-card{width:100%;min-width:0;height:64px;display:flex;align-items:center;gap:8px;padding:8px 24px 8px 8px;border:1px solid transparent;border-radius:12px;background:var(--btn-bg);color:var(--text-secondary);cursor:default;text-align:left;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.item-card:hover{background:var(--btn-bg-hover);border-color:color-mix(in srgb,var(--primary) 16%,var(--glass-border));transform:translateY(-1px)}
.item-card:active{transform:scale(.98)}
.pin-action{position:absolute;top:5px;right:5px;width:20px;height:20px;display:grid;place-items:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--text-tertiary);font-size:.64rem;line-height:1;cursor:pointer;opacity:.28;transition:all .25s cubic-bezier(.25,.1,.25,1)}
.item-shell:hover .pin-action,.pin-action:focus-visible,.pin-action.active{opacity:1}
.pin-action:hover{background:var(--icon-surface);color:var(--text-primary);transform:scale(1.06)}
.pin-action:active{transform:scale(.94)}
.pin-action.active{color:var(--text-primary)}
.pinned-block>header>span{color:var(--text-primary);background:color-mix(in srgb,var(--primary) 10%,var(--icon-surface))}
.folder-preview-block>header>span{color:var(--text-secondary);background:var(--icon-surface)}
.folder-preview-head{min-height:26px}
.folder-preview-head .preview-nav,.folder-preview-head .preview-close{width:22px;height:22px;display:grid;place-items:center;padding:0;border:1px solid var(--glass-border);border-radius:7px;background:var(--btn-bg);color:var(--text-secondary);font-size:.68rem;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.folder-preview-head .preview-close{margin-left:0}
.folder-preview-head .preview-nav:hover,.folder-preview-head .preview-close:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.folder-preview-head .preview-nav:active,.folder-preview-head .preview-close:active{transform:scale(.98)}
.preview-state{min-height:56px;display:grid;place-items:center;padding:10px;border:1px solid var(--glass-border);border-radius:12px;background:color-mix(in srgb,var(--btn-bg) 72%,transparent);color:var(--text-tertiary);font-size:.54rem}
.folder-action{position:absolute;right:28px;bottom:5px;width:20px;height:20px;display:grid;place-items:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--text-tertiary);font-size:.72rem;line-height:1;cursor:pointer;opacity:.3;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.item-shell:hover .folder-action,.folder-action:focus-visible{opacity:1}
.folder-action:hover{background:var(--icon-surface);color:var(--text-primary);transform:scale(1.06)}
.folder-action:active{transform:scale(.94)}
.recent-block>header>span{color:var(--text-secondary);background:color-mix(in srgb,var(--text-secondary) 8%,var(--icon-surface))}
.search-results-block>header>span{color:var(--text-primary);background:color-mix(in srgb,var(--primary) 10%,var(--icon-surface))}
.item-card>span .item-meta{display:block;margin-top:2px;font-size:.46rem;font-weight:500;color:var(--text-tertiary);line-height:1.15}
.item-grid i{flex:0 0 30px;width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:var(--icon-surface);font-style:normal;font-size:.68rem;color:var(--text-primary);overflow:hidden}
.item-grid i img{width:24px;height:24px;display:block;object-fit:contain}
.item-grid i span{display:grid;place-items:center;width:100%;height:100%;font-size:.68rem;line-height:1}
.item-card>span{min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-all;font-size:.57rem;line-height:1.28}
</style>
