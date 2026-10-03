<template>
  <section class="folder-widget">
    <header class="folder-head">
      <span class="folder-title">
        <small>FOLDER</small>
        <strong>{{ currentFolder?.name || rootFolderName || '选择文件夹' }}</strong>
      </span>
      <div class="folder-actions">
        <button
          v-if="history.length > 1"
          type="button"
          title="返回上一层"
          aria-label="返回上一层"
          @click="goBack"
        >‹</button>
        <button
          v-if="rootFolderPath"
          type="button"
          title="刷新"
          aria-label="刷新文件夹"
          @click="refreshCurrent"
        >↻</button>
        <button
          type="button"
          class="change-action"
          :title="choosing ? '取消选择' : '更换文件夹'"
          @click="toggleChoosing"
        >{{ choosing ? '取消' : '更换' }}</button>
      </div>
    </header>

    <div v-if="choosing || !rootFolderPath" class="folder-picker">
      <div class="picker-intro">
        <strong>固定桌面文件夹</strong>
        <small>选择后会记住这个文件夹，只读取和打开内容</small>
      </div>

      <div v-if="rootsLoading" class="folder-state">正在读取桌面文件夹…</div>
      <div v-else-if="rootsError" class="folder-state">{{ rootsError }}</div>
      <div v-else-if="!desktopFolders.length" class="folder-state">桌面上暂时没有可固定的文件夹</div>
      <div v-else class="picker-list">
        <button
          v-for="folder in desktopFolders"
          :key="folder.path"
          type="button"
          :title="folder.path"
          @click="selectRoot(folder)"
        >
          <i class="item-icon">
            <img v-if="itemIcons[folder.path]" :src="itemIcons[folder.path]" alt="">
            <span v-else>▣</span>
          </i>
          <span><strong>{{ folder.name }}</strong><small>桌面文件夹</small></span>
          <b>›</b>
        </button>
      </div>
    </div>

    <template v-else>
      <div class="folder-location">
        <span>{{ locationText }}</span>
        <small>{{ items.length }} 项</small>
      </div>

      <div v-if="loading" class="folder-state">正在读取文件夹…</div>
      <div v-else-if="error" class="folder-state folder-error">
        <span>{{ error }}</span>
        <button type="button" @click="openPickerFromError">重新选择</button>
      </div>
      <div v-else-if="!items.length" class="folder-state">这个文件夹是空的</div>

      <div v-else class="folder-list">
        <div v-for="item in items" :key="item.path" class="folder-row">
          <button
            type="button"
            class="item-main"
            :title="item.path"
            @dblclick.stop="activateItem(item)"
          >
            <i class="item-icon">
              <img v-if="itemIcons[item.path]" :src="itemIcons[item.path]" alt="">
              <span v-else>{{ fallbackIcon(item) }}</span>
            </i>
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.isDirectory ? '文件夹' : itemMeta(item) }}</small>
            </span>
          </button>
          <button
            v-if="item.isDirectory"
            type="button"
            class="enter-action"
            :aria-label="`进入 ${item.name}`"
            title="进入文件夹"
            @click.stop="enterFolder(item)"
          >›</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

type DesktopItemTuple = [string, string, string, boolean, number]

interface FolderItem {
  path: string
  name: string
  extension: string
  isDirectory: boolean
  modifiedAt: number
}

const props = defineProps<{ widget: DesktopWidget }>()
const canvas = useDesktopCanvasStore()

const desktopFolders = ref<FolderItem[]>([])
const rootsLoading = ref(false)
const rootsError = ref('')
const choosing = ref(false)

const history = ref<FolderItem[]>([])
const items = ref<FolderItem[]>([])
const loading = ref(false)
const error = ref('')
const itemIcons = ref<Record<string, string>>({})
const iconFailures = new Set<string>()

let refreshTimer: ReturnType<typeof setInterval> | null = null

const rootFolderPath = computed(() => (
  typeof props.widget.config.folderWidgetRootPath === 'string'
    ? props.widget.config.folderWidgetRootPath.trim()
    : ''
))

const rootFolderName = computed(() => (
  typeof props.widget.config.folderWidgetRootName === 'string'
    ? props.widget.config.folderWidgetRootName.trim()
    : ''
))

const currentFolder = computed(() => history.value[history.value.length - 1] ?? null)

const locationText = computed(() => {
  if (!history.value.length) return rootFolderName.value || '文件夹'
  return history.value.map(folder => folder.name).join(' / ')
})

function fromTuple([path, name, extension, isDirectory, modifiedAt]: DesktopItemTuple): FolderItem {
  return { path, name, extension, isDirectory, modifiedAt }
}

function fallbackIcon(item: FolderItem): string {
  if (item.isDirectory) return '▣'
  const extension = item.extension.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(extension)) return '▧'
  if (['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(extension)) return '▤'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return '◫'
  if (['mp3', 'wav', 'flac', 'm4a', 'mp4', 'mov', 'mkv', 'avi', 'webm'].includes(extension)) return '▶'
  return '◇'
}

function formatModifiedAt(timestamp: number): string {
  if (!timestamp) return '时间未知'
  const value = new Date(timestamp * 1000)
  const delta = Math.max(0, Date.now() - value.getTime())
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return '刚刚修改'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return value.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function itemMeta(item: FolderItem): string {
  const extension = item.extension ? item.extension.toUpperCase() : '文件'
  return `${extension} · ${formatModifiedAt(item.modifiedAt)}`
}

async function ensureIcon(item: FolderItem): Promise<void> {
  if (!isDesktopRuntime() || itemIcons.value[item.path] || iconFailures.has(item.path)) return
  try {
    const icon = await invokeDesktop<string | null>('get_desktop_item_icon', { path: item.path })
    if (icon) itemIcons.value = { ...itemIcons.value, [item.path]: icon }
    else iconFailures.add(item.path)
  } catch {
    iconFailures.add(item.path)
  }
}

function loadIcons(list: FolderItem[]): void {
  list.forEach(item => void ensureIcon(item))
}

async function loadDesktopFolders(): Promise<void> {
  if (!isDesktopRuntime() || rootsLoading.value) return
  rootsLoading.value = true
  rootsError.value = ''
  try {
    const result = await invokeDesktop<DesktopItemTuple[]>('get_desktop_items')
    desktopFolders.value = result
      .map(fromTuple)
      .filter(item => item.isDirectory)
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
    loadIcons(desktopFolders.value)
  } catch {
    desktopFolders.value = []
    rootsError.value = '暂时无法读取桌面文件夹'
  } finally {
    rootsLoading.value = false
  }
}

async function loadFolder(folder: FolderItem, pushHistory: boolean): Promise<boolean> {
  if (!isDesktopRuntime() || loading.value) return false
  loading.value = true
  error.value = ''
  try {
    const result = await invokeDesktop<DesktopItemTuple[]>('get_desktop_folder_preview', { path: folder.path })
    items.value = result.map(fromTuple)
    if (pushHistory) history.value = [...history.value, folder].slice(-16)
    loadIcons(items.value)
    return true
  } catch {
    items.value = []
    error.value = '这个文件夹已不可用或无法读取'
    return false
  } finally {
    loading.value = false
  }
}

async function selectRoot(folder: FolderItem): Promise<void> {
  history.value = []
  const loaded = await loadFolder(folder, true)
  if (!loaded) return

  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      folderWidgetRootPath: folder.path,
      folderWidgetRootName: folder.name,
    },
  })
  choosing.value = false
}

async function restoreRoot(): Promise<void> {
  if (!rootFolderPath.value) {
    choosing.value = true
    await loadDesktopFolders()
    return
  }

  const root: FolderItem = {
    path: rootFolderPath.value,
    name: rootFolderName.value || '文件夹',
    extension: '',
    isDirectory: true,
    modifiedAt: 0,
  }
  history.value = []
  await loadFolder(root, true)
}

async function enterFolder(folder: FolderItem): Promise<void> {
  if (!folder.isDirectory) return
  await loadFolder(folder, true)
}

async function goBack(): Promise<void> {
  if (history.value.length <= 1) return
  const nextHistory = history.value.slice(0, -1)
  const previous = nextHistory[nextHistory.length - 1]
  history.value = nextHistory
  await loadFolder(previous, false)
}

async function refreshCurrent(): Promise<void> {
  const current = currentFolder.value
  if (current) await loadFolder(current, false)
}

async function activateItem(item: FolderItem): Promise<void> {
  if (item.isDirectory) {
    await enterFolder(item)
    return
  }
  try {
    await invokeDesktop('open_desktop_item', { path: item.path })
  } catch {
    error.value = '无法打开这个文件'
  }
}

async function toggleChoosing(): Promise<void> {
  choosing.value = !choosing.value
  if (choosing.value) await loadDesktopFolders()
}

async function openPickerFromError(): Promise<void> {
  choosing.value = true
  await loadDesktopFolders()
}

function handleFocus(): void {
  if (!choosing.value) void refreshCurrent()
}

onMounted(() => {
  void restoreRoot()
  refreshTimer = setInterval(() => {
    if (!choosing.value) void refreshCurrent()
  }, 10_000)
  window.addEventListener('focus', handleFocus)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) clearInterval(refreshTimer)
  window.removeEventListener('focus', handleFocus)
})
</script>

<style scoped>
.folder-widget{height:100%;min-height:0;display:flex;flex-direction:column;padding:14px;color:var(--text-primary)}
.folder-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.folder-title{display:grid;gap:1px;min-width:0}
.folder-title small{font-size:.46rem;letter-spacing:.12em;color:var(--text-tertiary)}
.folder-title strong{max-width:180px;font-size:.78rem;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.folder-actions{display:flex;align-items:center;gap:4px}
.folder-actions button{height:27px;min-width:27px;padding:0 7px;border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.64rem;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.folder-actions button.change-action{min-width:40px;font-size:.49rem;font-weight:650}
.folder-actions button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.folder-actions button:active{transform:scale(.98)}
.folder-location{display:flex;align-items:center;gap:8px;margin-bottom:7px;padding:0 2px;color:var(--text-tertiary)}
.folder-location span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.5rem}
.folder-location small{flex:0 0 auto;font-size:.48rem}
.folder-list,.picker-list{min-height:0;flex:1;overflow:auto;display:grid;align-content:start;gap:4px;padding-right:2px;scrollbar-width:thin}
.folder-row{position:relative;min-width:0}
.item-main,.picker-list>button{width:100%;min-width:0;display:flex;align-items:center;gap:9px;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--text-secondary);text-align:left;cursor:default;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.item-main{min-height:42px;padding:5px 30px 5px 6px}
.item-main:hover,.picker-list>button:hover{background:var(--btn-bg-hover);border-color:color-mix(in srgb,var(--primary) 12%,var(--glass-border));transform:translateY(-1px)}
.item-main:active,.picker-list>button:active{transform:scale(.99)}
.item-main>span,.picker-list>button>span{min-width:0;display:grid;gap:2px;flex:1}
.item-main strong,.picker-list strong{font-size:.59rem;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}
.item-main small,.picker-list small{font-size:.46rem;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.item-icon{width:29px;height:29px;flex:0 0 29px;display:grid;place-items:center;border-radius:8px;background:var(--icon-surface);font-style:normal;color:var(--text-secondary);overflow:hidden}
.item-icon img{width:23px;height:23px;display:block;object-fit:contain}
.item-icon span{font-size:.62rem}
.enter-action{position:absolute;top:50%;right:5px;width:23px;height:23px;display:grid;place-items:center;transform:translateY(-50%);padding:0;border:0;border-radius:7px;background:transparent;color:var(--text-tertiary);font-size:.76rem;cursor:pointer;opacity:.35;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.folder-row:hover .enter-action,.enter-action:focus-visible{opacity:1}
.enter-action:hover{background:var(--icon-surface);color:var(--text-primary)}
.enter-action:active{transform:translateY(-50%) scale(.94)}
.folder-state{flex:1;min-height:0;display:grid;place-items:center;text-align:center;padding:12px;color:var(--text-tertiary);font-size:.58rem}
.folder-error{align-content:center;gap:9px}
.folder-error button{height:28px;padding:0 10px;border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.52rem;cursor:pointer}
.folder-error button:hover{background:var(--btn-bg-hover);color:var(--text-primary)}
.folder-picker{min-height:0;flex:1;display:flex;flex-direction:column}
.picker-intro{display:grid;gap:2px;margin-bottom:8px;padding:8px 9px;border:1px solid var(--glass-border);border-radius:11px;background:color-mix(in srgb,var(--btn-bg) 72%,transparent)}
.picker-intro strong{font-size:.59rem;font-weight:680}
.picker-intro small{font-size:.47rem;line-height:1.35;color:var(--text-tertiary)}
.picker-list>button{min-height:44px;padding:6px 8px;cursor:pointer}
.picker-list>button>b{flex:0 0 auto;font-size:.72rem;font-weight:500;color:var(--text-tertiary)}
</style>
