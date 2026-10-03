<template>
  <section class="music-widget" :class="{ 'lyrics-open': lyricsEnabled }">
    <header class="music-head">
      <div class="music-art" :class="{ playing: media?.isPlaying, 'has-artwork': Boolean(artworkUrl) }" aria-hidden="true">
        <img v-if="artworkUrl" :src="artworkUrl" alt="">
        <span v-else>♪</span>
        <i></i>
      </div>

      <div class="music-meta">
        <small>{{ sourceLabel }}</small>
        <strong :title="media?.title || ''">{{ media?.title || '暂无正在播放' }}</strong>
        <span :title="mediaSubtitle">{{ mediaSubtitle }}</span>
      </div>

      <button
        class="lyrics-toggle"
        :class="{ active: lyricsEnabled }"
        type="button"
        :title="lyricsEnabled ? '关闭联网歌词' : '开启后会将歌名、歌手和时长发送到 LRCLIB 匹配歌词'"
        @click="toggleLyrics"
      >
        {{ lyricsEnabled ? '歌词 ✓' : '歌词' }}
      </button>
    </header>

    <div class="progress-block">
      <div class="progress-track" aria-hidden="true">
        <i :style="{ width: `${progressPercent}%` }"></i>
      </div>
      <div class="progress-time">
        <span>{{ formatTime(media?.positionMs ?? 0) }}</span>
        <small>{{ status }}</small>
        <span>{{ formatTime(media?.durationMs ?? 0) }}</span>
      </div>
    </div>

    <div class="music-controls">
      <button type="button" aria-label="上一首" @click="control('previous')">‹｜</button>
      <button class="play" type="button" aria-label="播放或暂停" @click="control('play_pause')">
        {{ media?.isPlaying ? 'Ⅱ' : '▶︎' }}
      </button>
      <button type="button" aria-label="下一首" @click="control('next')">｜›</button>
      <button class="stop" type="button" @click="control('stop')">停止</button>
    </div>

    <section v-if="lyricsEnabled" class="lyrics-panel" aria-live="polite">
      <div v-if="lyricsLoading" class="lyrics-state">
        <span class="lyrics-spinner"></span>
        <strong>正在匹配歌词</strong>
        <small>只发送当前歌曲的元数据</small>
      </div>

      <div v-else-if="lyricsError" class="lyrics-state">
        <strong>{{ lyricsError }}</strong>
        <button v-if="media?.title" type="button" @click="loadLyrics">重新匹配</button>
      </div>

      <div v-else-if="syncedLyrics.length" class="synced-lyrics">
        <div
          v-for="line in visibleSyncedLyrics"
          :key="`${line.index}-${line.timeMs}`"
          class="lyric-line"
          :class="{ active: line.index === activeLyricIndex }"
        >
          {{ line.text || '♪' }}
        </div>
      </div>

      <div v-else-if="plainLyrics" class="plain-lyrics">{{ plainLyrics }}</div>

      <div v-else class="lyrics-state">
        <strong>{{ media?.title ? '暂时没有匹配到歌词' : '播放音乐后显示歌词' }}</strong>
        <small>支持同步 LRC 与普通歌词</small>
      </div>

      <footer class="lyrics-foot">
        <span>{{ lyricsProvider }}</span>
        <button type="button" @click="toggleLyrics">关闭歌词</button>
      </footer>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

type MediaAction = 'previous' | 'play_pause' | 'next' | 'stop'
type MediaSnapshotTuple = [string, string, string, string, boolean, number, number]

interface MediaSnapshot {
  sourceApp: string
  title: string
  artist: string
  album: string
  isPlaying: boolean
  positionMs: number
  durationMs: number
}

interface LrcLibLyrics {
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

interface SyncedLyricLine {
  timeMs: number
  text: string
}

interface VisibleSyncedLyricLine extends SyncedLyricLine {
  index: number
}

const props = defineProps<{ widget: DesktopWidget }>()

const canvas = useDesktopCanvasStore()
const media = ref<MediaSnapshot | null>(null)
const status = ref(isDesktopRuntime() ? '等待系统媒体会话' : '仅桌面端支持系统媒体')
const lyricsLoading = ref(false)
const lyricsError = ref('')
const plainLyrics = ref('')
const syncedLyrics = ref<SyncedLyricLine[]>([])
const lyricsProvider = ref('LRCLIB · 未保存歌词')
const refreshing = ref(false)
const artworkUrl = ref('')
const artworkCache = new Map<string, string>()

let mediaTimer: ReturnType<typeof setInterval> | null = null
let lyricsRequestId = 0
let loadedLyricsKey = ''
let artworkRequestId = 0
let loadedArtworkKey = ''

const lyricsEnabled = computed(() => props.widget.config.musicLyricsEnabled === true)

const sourceLabel = computed(() => {
  const source = media.value?.sourceApp.trim()
  if (!source) return 'SYSTEM MEDIA'
  const segments = (source.split('!')[0] || source).split('.').filter(Boolean)
  const short = segments[segments.length - 1] || source
  return short.toUpperCase()
})

const mediaSubtitle = computed(() => {
  const current = media.value
  if (!current) return '打开音乐 App 后会自动识别'
  const artist = current.artist.trim() || '未知歌手'
  const album = current.album.trim()
  return album ? `${artist} · ${album}` : artist
})

const progressPercent = computed(() => {
  const current = media.value
  if (!current || current.durationMs <= 0) return 0
  return Math.min(100, Math.max(0, (current.positionMs / current.durationMs) * 100))
})

const activeLyricIndex = computed(() => {
  if (!syncedLyrics.value.length) return -1
  const position = media.value?.positionMs ?? 0
  let active = -1
  for (let index = 0; index < syncedLyrics.value.length; index += 1) {
    if (syncedLyrics.value[index].timeMs > position) break
    active = index
  }
  return active
})

const visibleSyncedLyrics = computed<VisibleSyncedLyricLine[]>(() => {
  if (!syncedLyrics.value.length) return []
  const active = activeLyricIndex.value < 0 ? 0 : activeLyricIndex.value
  const start = Math.max(0, active - 2)
  const end = Math.min(syncedLyrics.value.length, active + 3)
  return syncedLyrics.value.slice(start, end).map((line, offset) => ({
    ...line,
    index: start + offset,
  }))
})

function formatTime(valueMs: number): string {
  if (!Number.isFinite(valueMs) || valueMs <= 0) return '0:00'
  const totalSeconds = Math.floor(valueMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function snapshotFromTuple(value: MediaSnapshotTuple): MediaSnapshot {
  return {
    sourceApp: value[0],
    title: value[1],
    artist: value[2],
    album: value[3],
    isPlaying: value[4],
    positionMs: Math.max(0, value[5]),
    durationMs: Math.max(0, value[6]),
  }
}

function currentLyricsKey(current: MediaSnapshot | null): string {
  if (!current?.title.trim()) return ''
  return [current.title.trim(), current.artist.trim(), current.album.trim(), Math.round(current.durationMs / 1000)].join('\u0000')
}

function currentArtworkKey(current: MediaSnapshot | null): string {
  if (!current?.title.trim()) return ''
  return [current.sourceApp.trim(), current.title.trim(), current.artist.trim(), current.album.trim()].join('\u0000')
}

function rememberArtwork(key: string, value: string): void {
  if (artworkCache.has(key)) artworkCache.delete(key)
  artworkCache.set(key, value)
  while (artworkCache.size > 8) {
    const oldestKey = artworkCache.keys().next().value
    if (typeof oldestKey !== 'string') break
    artworkCache.delete(oldestKey)
  }
}

async function loadArtwork(current: MediaSnapshot): Promise<void> {
  const key = currentArtworkKey(current)
  if (!key) {
    artworkUrl.value = ''
    loadedArtworkKey = ''
    return
  }

  const cached = artworkCache.get(key)
  if (cached !== undefined) {
    artworkUrl.value = cached
    loadedArtworkKey = key
    return
  }

  const requestId = ++artworkRequestId
  try {
    const result = await invokeDesktop<[string, string] | null>('get_system_media_thumbnail')
    if (requestId !== artworkRequestId || currentArtworkKey(media.value) !== key) return

    loadedArtworkKey = key
    if (!result) {
      artworkUrl.value = ''
      rememberArtwork(key, '')
      return
    }

    const mime = result[0].startsWith('image/') ? result[0] : 'image/jpeg'
    const dataUrl = `data:${mime};base64,${result[1]}`
    artworkUrl.value = dataUrl
    rememberArtwork(key, dataUrl)
  } catch {
    if (requestId !== artworkRequestId) return
    loadedArtworkKey = key
    artworkUrl.value = ''
    rememberArtwork(key, '')
  }
}

async function refreshMedia(): Promise<void> {
  if (!isDesktopRuntime() || refreshing.value) return
  refreshing.value = true

  try {
    const snapshot = await invokeDesktop<MediaSnapshotTuple | null>('get_system_media_snapshot')
    const next = snapshot ? snapshotFromTuple(snapshot) : null
    const previousLyricsKey = currentLyricsKey(media.value)
    const previousArtworkKey = currentArtworkKey(media.value)
    media.value = next

    if (!next) {
      status.value = '没有检测到正在播放的媒体'
      artworkRequestId += 1
      artworkUrl.value = ''
      loadedArtworkKey = ''
    } else {
      status.value = next.isPlaying ? '正在播放' : '已暂停'
    }

    const nextArtworkKey = currentArtworkKey(next)
    if (next && nextArtworkKey && nextArtworkKey !== previousArtworkKey && nextArtworkKey !== loadedArtworkKey) {
      void loadArtwork(next)
    }

    const nextLyricsKey = currentLyricsKey(next)
    if (lyricsEnabled.value && nextLyricsKey && nextLyricsKey !== previousLyricsKey && nextLyricsKey !== loadedLyricsKey) {
      void loadLyrics()
    }
  } catch {
    media.value = null
    status.value = '无法读取系统媒体信息'
  } finally {
    refreshing.value = false
  }
}

async function control(action: MediaAction): Promise<void> {
  if (!isDesktopRuntime()) {
    status.value = '当前环境不支持系统媒体控制'
    return
  }

  try {
    await invokeDesktop('control_system_media', { action })
    status.value = action === 'play_pause' ? '已发送播放 / 暂停' : '已发送媒体控制'
    window.setTimeout(() => void refreshMedia(), 180)
  } catch {
    status.value = '系统媒体控制失败'
  }
}

function toggleLyrics(): void {
  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      musicLyricsEnabled: !lyricsEnabled.value,
    },
  })
}

function clearLyrics(): void {
  lyricsRequestId += 1
  lyricsLoading.value = false
  lyricsError.value = ''
  plainLyrics.value = ''
  syncedLyrics.value = []
  loadedLyricsKey = ''
  lyricsProvider.value = 'LRCLIB · 未保存歌词'
}

async function loadLyrics(): Promise<void> {
  const current = media.value
  if (!lyricsEnabled.value || !current?.title.trim()) {
    lyricsError.value = current ? '' : '播放音乐后才能匹配歌词'
    return
  }

  const requestId = ++lyricsRequestId
  const key = currentLyricsKey(current)
  lyricsLoading.value = true
  lyricsError.value = ''
  plainLyrics.value = ''
  syncedLyrics.value = []

  try {
    const result = await fetchBestLyrics(current)
    if (requestId !== lyricsRequestId) return

    loadedLyricsKey = key
    if (!result) {
      lyricsError.value = '没有找到匹配歌词'
      return
    }

    if (result.instrumental) {
      lyricsError.value = '这首歌被标记为纯音乐'
      return
    }

    plainLyrics.value = result.plainLyrics?.trim() ?? ''
    syncedLyrics.value = parseSyncedLyrics(result.syncedLyrics ?? '')
    lyricsProvider.value = syncedLyrics.value.length ? 'LRCLIB · 同步歌词' : 'LRCLIB · 普通歌词'

    if (!plainLyrics.value && !syncedLyrics.value.length) {
      lyricsError.value = '歌词记录为空'
    }
  } catch {
    if (requestId !== lyricsRequestId) return
    lyricsError.value = '歌词服务暂时不可用'
  } finally {
    if (requestId === lyricsRequestId) lyricsLoading.value = false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function fetchLyricsResponse(url: string): Promise<Response> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 6000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await sleep(350)
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt === 0) {
        await sleep(350)
        continue
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('歌词服务请求失败')
}

async function fetchBestLyrics(current: MediaSnapshot): Promise<LrcLibLyrics | null> {
  const exactUrl = new URL('https://lrclib.net/api/get')
  exactUrl.searchParams.set('track_name', current.title)
  exactUrl.searchParams.set('artist_name', current.artist || 'Unknown Artist')
  if (current.album) exactUrl.searchParams.set('album_name', current.album)
  if (current.durationMs > 0) exactUrl.searchParams.set('duration', String(Math.round(current.durationMs / 1000)))

  const exactResponse = await fetchLyricsResponse(exactUrl.toString())
  if (exactResponse.ok) return await exactResponse.json() as LrcLibLyrics
  if (exactResponse.status !== 404 && exactResponse.status < 500 && exactResponse.status !== 429) {
    throw new Error(`LRCLIB exact lookup failed: ${exactResponse.status}`)
  }

  const searchUrl = new URL('https://lrclib.net/api/search')
  searchUrl.searchParams.set('track_name', current.title)
  if (current.artist) searchUrl.searchParams.set('artist_name', current.artist)

  const searchResponse = await fetchLyricsResponse(searchUrl.toString())
  if (!searchResponse.ok) throw new Error(`LRCLIB search failed: ${searchResponse.status}`)
  const results = await searchResponse.json() as LrcLibLyrics[]
  return chooseBestLyrics(results, current)
}

function chooseBestLyrics(results: LrcLibLyrics[], current: MediaSnapshot): LrcLibLyrics | null {
  if (!results.length) return null

  const normalizedTitle = normalizeText(current.title)
  const normalizedArtist = normalizeText(current.artist)
  const durationSeconds = current.durationMs > 0 ? current.durationMs / 1000 : 0

  return [...results].sort((left, right) => {
    const score = (entry: LrcLibLyrics): number => {
      let value = 0
      if (normalizeText(entry.trackName ?? '') === normalizedTitle) value += 80
      if (normalizedArtist && normalizeText(entry.artistName ?? '') === normalizedArtist) value += 60
      if (entry.syncedLyrics) value += 20
      if (durationSeconds > 0 && typeof entry.duration === 'number') {
        value += Math.max(0, 30 - Math.abs(entry.duration - durationSeconds))
      }
      return value
    }
    return score(right) - score(left)
  })[0] ?? null
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function parseSyncedLyrics(value: string): SyncedLyricLine[] {
  if (!value.trim()) return []

  const output: SyncedLyricLine[] = []
  for (const rawLine of value.split(/\r?\n/)) {
    const matches = Array.from(rawLine.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g))
    if (!matches.length) continue

    const text = rawLine.replace(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g, '').trim()
    for (const match of matches) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) continue
      output.push({
        timeMs: Math.round((minutes * 60 + seconds) * 1000),
        text,
      })
    }
  }

  return output.sort((left, right) => left.timeMs - right.timeMs)
}

watch(lyricsEnabled, enabled => {
  if (enabled) void loadLyrics()
  else clearLyrics()
})

onMounted(() => {
  void refreshMedia()
  mediaTimer = setInterval(() => void refreshMedia(), 1200)
})

onBeforeUnmount(() => {
  if (mediaTimer) clearInterval(mediaTimer)
  lyricsRequestId += 1
  artworkRequestId += 1
  artworkCache.clear()
  artworkUrl.value = ''
})
</script>

<style scoped>
.music-widget{height:100%;display:flex;flex-direction:column;gap:10px;padding:14px;color:var(--text-primary);overflow:hidden}
.music-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px}
.music-art{position:relative;width:52px;height:52px;display:grid;place-items:center;border:1px solid color-mix(in srgb,white 22%,var(--glass-border));border-radius:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 14%,var(--icon-surface)),var(--icon-surface));box-shadow:0 8px 24px rgb(0 0 0 / 7%),inset 0 1px 0 rgb(255 255 255 / 22%);overflow:hidden}
.music-art img{width:100%;height:100%;object-fit:cover;display:block}
.music-art.has-artwork{background:var(--icon-surface)}
.music-art.has-artwork i{box-shadow:0 0 0 3px rgba(10,14,22,.45)}
.music-art span{font-size:1.3rem;color:var(--primary);transition:transform .4s cubic-bezier(.25,.1,.25,1)}
.music-art i{position:absolute;right:7px;bottom:7px;width:7px;height:7px;border-radius:50%;background:var(--text-tertiary);box-shadow:0 0 0 3px color-mix(in srgb,var(--icon-surface) 84%,transparent)}
.music-art.playing span{animation:music-pulse 1.8s ease-in-out infinite}.music-art.playing i{background:#34c759}.music-art.playing.has-artwork img{animation:artwork-breathe 3.2s ease-in-out infinite}
.music-meta{display:grid;gap:2px;min-width:0}.music-meta small{font-size:.48rem;font-weight:700;letter-spacing:.08em;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.music-meta strong{font-size:.77rem;font-weight:680;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.music-meta span{font-size:.55rem;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lyrics-toggle{height:29px;padding:0 9px;border:1px solid var(--glass-border);border-radius:9px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.55rem;font-weight:620;cursor:pointer;transition:all .25s cubic-bezier(.25,.1,.25,1)}.lyrics-toggle:hover{background:var(--btn-bg-hover);transform:scale(1.02)}.lyrics-toggle:active{transform:scale(.98)}.lyrics-toggle.active{border-color:color-mix(in srgb,var(--primary) 35%,var(--glass-border));background:color-mix(in srgb,var(--primary) 10%,var(--btn-bg));color:var(--primary)}
.progress-block{display:grid;gap:5px}.progress-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--text-tertiary) 14%,transparent);overflow:hidden}.progress-track i{display:block;height:100%;border-radius:inherit;background:var(--primary);transition:width .6s linear}
.progress-time{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;color:var(--text-tertiary);font-size:.49rem}.progress-time small{text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.music-controls{display:flex;align-items:center;justify-content:center;gap:8px}.music-controls button{height:31px;min-width:31px;padding:0 8px;border:1px solid var(--glass-border);border-radius:50%;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.62rem;cursor:pointer;transition:all .25s cubic-bezier(.25,.1,.25,1)}.music-controls button.play{width:38px;height:38px;background:color-mix(in srgb,var(--primary) 12%,var(--btn-bg));color:var(--primary);font-weight:700}.music-controls button.stop{width:auto;border-radius:10px;font-size:.52rem}.music-controls button:hover{background:var(--btn-bg-hover);transform:scale(1.04)}.music-controls button:active{transform:scale(.97)}
.lyrics-panel{min-height:0;flex:1;display:flex;flex-direction:column;border:1px solid color-mix(in srgb,white 16%,var(--glass-border));border-radius:16px;background:color-mix(in srgb,var(--btn-bg) 62%,transparent);box-shadow:inset 0 1px 0 rgb(255 255 255 / 10%);overflow:hidden}
.synced-lyrics{flex:1;min-height:102px;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:10px 14px;overflow:hidden}
.lyric-line{min-height:18px;color:var(--text-tertiary);font-size:.59rem;line-height:1.35;text-align:center;opacity:.58;transform:scale(.97);transition:all .35s cubic-bezier(.25,.1,.25,1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lyric-line.active{color:var(--text-primary);font-size:.7rem;font-weight:700;opacity:1;transform:scale(1)}
.plain-lyrics{flex:1;min-height:90px;padding:12px 14px;overflow:auto;white-space:pre-wrap;color:var(--text-secondary);font-size:.6rem;line-height:1.65;text-align:center}
.lyrics-state{flex:1;min-height:100px;display:grid;place-items:center;align-content:center;gap:6px;padding:12px;color:var(--text-tertiary);text-align:center}.lyrics-state strong{font-size:.63rem;color:var(--text-secondary)}.lyrics-state small{font-size:.52rem}.lyrics-state button{border:0;background:transparent;color:var(--primary);font:inherit;font-size:.56rem;cursor:pointer}
.lyrics-spinner{width:18px;height:18px;border:2px solid color-mix(in srgb,var(--primary) 18%,transparent);border-top-color:var(--primary);border-radius:50%;animation:lyrics-spin .8s linear infinite}
.lyrics-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-top:1px solid var(--glass-border);color:var(--text-tertiary);font-size:.48rem}.lyrics-foot button{border:0;background:transparent;color:var(--text-tertiary);font:inherit;font-size:.49rem;cursor:pointer}.lyrics-foot button:hover{color:var(--primary)}
@keyframes music-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}@keyframes artwork-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}@keyframes lyrics-spin{to{transform:rotate(360deg)}}
</style>
