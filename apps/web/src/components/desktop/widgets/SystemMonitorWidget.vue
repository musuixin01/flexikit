<template>
  <section class="system-monitor-widget">
    <header class="monitor-head">
      <span>
        <small>SYSTEM MONITOR</small>
        <strong>系统状态</strong>
      </span>
      <b :class="{ error: Boolean(error) }">{{ error ? '!' : 'LIVE' }}</b>
    </header>

    <div v-if="error && !hasSnapshot" class="monitor-state">{{ error }}</div>

    <template v-else>
      <div class="metric-grid">
        <article class="metric-card cpu-card">
          <header><span>CPU</span><strong>{{ cpuText }}</strong></header>
          <div class="metric-bar"><i :style="{ width: `${cpuPercent}%` }"></i></div>
          <div class="history-bars" aria-hidden="true">
            <i
              v-for="(value, index) in cpuHistory"
              :key="index"
              :style="{ height: `${Math.max(8, value)}%` }"
            ></i>
          </div>
        </article>

        <article class="metric-card">
          <header><span>内存</span><strong>{{ memoryPercent }}%</strong></header>
          <div class="metric-bar"><i :style="{ width: `${memoryPercent}%` }"></i></div>
          <p>{{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryTotal) }}</p>
        </article>
      </div>

      <article v-if="showDisk" class="disk-card">
        <header>
          <span><strong>{{ diskDrive }}</strong><small>系统盘</small></span>
          <b>{{ diskPercent }}%</b>
        </header>
        <div class="metric-bar"><i :style="{ width: `${diskPercent}%` }"></i></div>
        <p><span>可用 {{ formatBytes(diskFree) }}</span><span>共 {{ formatBytes(diskTotal) }}</span></p>
      </article>

      <footer class="monitor-foot">
        <span>已运行 {{ uptimeText }}</span>
        <small>{{ refreshLabel }}刷新</small>
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import type { DesktopWidget } from '@/types/desktopWidget'

type SystemMonitorTuple = [
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number,
]

interface CpuSample {
  idleMs: number
  totalMs: number
}

const props = defineProps<{ widget: DesktopWidget }>()

const cpuPercent = ref(0)
const cpuReady = ref(false)
const cpuHistory = ref<number[]>([])
const memoryTotal = ref(0)
const memoryAvailable = ref(0)
const diskDrive = ref('C:')
const diskTotal = ref(0)
const diskFree = ref(0)
const uptimeMs = ref(0)
const error = ref('')
const hasSnapshot = ref(false)
let previousCpu: CpuSample | null = null
let intervalTimer: ReturnType<typeof setInterval> | null = null
let warmupTimer: ReturnType<typeof setTimeout> | null = null
let sampleInFlight = false

const showDisk = computed(() => props.widget.config.systemMonitorShowDisk !== false)

const refreshSeconds = computed(() => {
  const value = props.widget.config.systemMonitorRefreshRate
  if (value === '5') return 5
  if (value === '10') return 10
  return 2
})

const refreshLabel = computed(() => `${refreshSeconds.value} 秒`)
const cpuText = computed(() => cpuReady.value ? `${cpuPercent.value}%` : '--')

const memoryUsed = computed(() => Math.max(0, memoryTotal.value - memoryAvailable.value))
const memoryPercent = computed(() => {
  if (!memoryTotal.value) return 0
  return clampPercent((memoryUsed.value / memoryTotal.value) * 100)
})

const diskPercent = computed(() => {
  if (!diskTotal.value) return 0
  return clampPercent(((diskTotal.value - diskFree.value) / diskTotal.value) * 100)
})

const uptimeText = computed(() => {
  const totalMinutes = Math.floor(uptimeMs.value / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
})

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function formatBytes(bytes: number): string {
  if (!bytes) return '--'
  const gib = bytes / 1024 / 1024 / 1024
  if (gib >= 1024) return `${(gib / 1024).toFixed(1)} TB`
  return `${gib >= 100 ? gib.toFixed(0) : gib.toFixed(1)} GB`
}

function updateCpu(idleMs: number, totalMs: number): void {
  if (previousCpu && totalMs > previousCpu.totalMs) {
    const idleDelta = Math.max(0, idleMs - previousCpu.idleMs)
    const totalDelta = totalMs - previousCpu.totalMs
    const active = totalDelta > 0 ? (1 - Math.min(1, idleDelta / totalDelta)) * 100 : 0
    cpuPercent.value = clampPercent(active)
    cpuReady.value = true
    cpuHistory.value = [...cpuHistory.value, cpuPercent.value].slice(-18)
  }
  previousCpu = { idleMs, totalMs }
}

async function sample(): Promise<void> {
  if (!isDesktopRuntime() || sampleInFlight) return
  sampleInFlight = true
  try {
    const [
      idleMs,
      totalMs,
      totalMemory,
      availableMemory,
      uptime,
      drive,
      totalDisk,
      freeDisk,
    ] = await invokeDesktop<SystemMonitorTuple>('get_system_monitor_snapshot')

    updateCpu(idleMs, totalMs)
    memoryTotal.value = totalMemory
    memoryAvailable.value = availableMemory
    uptimeMs.value = uptime
    diskDrive.value = drive
    diskTotal.value = totalDisk
    diskFree.value = freeDisk
    hasSnapshot.value = true
    error.value = ''
  } catch {
    error.value = '暂时无法读取系统状态'
  } finally {
    sampleInFlight = false
  }
}

function stopPolling(): void {
  if (intervalTimer !== null) clearInterval(intervalTimer)
  if (warmupTimer !== null) clearTimeout(warmupTimer)
  intervalTimer = null
  warmupTimer = null
}

function startPolling(): void {
  stopPolling()
  previousCpu = null
  cpuReady.value = false
  cpuHistory.value = []
  void sample()
  warmupTimer = setTimeout(() => {
    warmupTimer = null
    void sample()
  }, 700)
  intervalTimer = setInterval(() => void sample(), refreshSeconds.value * 1000)
}

function handleFocus(): void {
  void sample()
}

watch(refreshSeconds, startPolling)

onMounted(() => {
  if (!isDesktopRuntime()) {
    error.value = '仅桌面端可读取系统状态'
    return
  }
  startPolling()
  window.addEventListener('focus', handleFocus)
})

onBeforeUnmount(() => {
  stopPolling()
  window.removeEventListener('focus', handleFocus)
})
</script>

<style scoped>
.system-monitor-widget{height:100%;min-height:0;display:flex;flex-direction:column;padding:14px;color:var(--text-primary)}
.monitor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.monitor-head>span{display:grid;gap:1px}
.monitor-head small{font-size:.45rem;letter-spacing:.12em;color:var(--text-tertiary)}
.monitor-head strong{font-size:.78rem;font-weight:720}
.monitor-head>b{padding:3px 6px;border:1px solid color-mix(in srgb,var(--primary) 20%,var(--glass-border));border-radius:7px;background:color-mix(in srgb,var(--primary) 8%,var(--btn-bg));color:var(--text-secondary);font-size:.42rem;letter-spacing:.08em}
.monitor-head>b.error{border-color:var(--glass-border);background:var(--btn-bg);color:var(--text-tertiary)}
.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.metric-card,.disk-card{min-width:0;padding:9px;border:1px solid var(--glass-border);border-radius:12px;background:color-mix(in srgb,var(--btn-bg) 72%,transparent);box-shadow:inset 0 1px 0 rgb(255 255 255 / 8%)}
.metric-card>header,.disk-card>header{display:flex;align-items:end;justify-content:space-between;gap:8px}
.metric-card>header span{font-size:.51rem;font-weight:650;color:var(--text-tertiary)}
.metric-card>header strong{font-size:1rem;font-weight:740;letter-spacing:-.035em}
.metric-card p,.disk-card p{margin:7px 0 0;font-size:.46rem;color:var(--text-tertiary)}
.metric-bar{height:5px;margin-top:7px;border-radius:999px;background:var(--icon-surface);overflow:hidden}
.metric-bar i{display:block;height:100%;border-radius:inherit;background:var(--primary);transition:width .45s cubic-bezier(.25,.1,.25,1)}
.history-bars{height:28px;display:flex;align-items:end;gap:2px;margin-top:6px}
.history-bars i{min-width:2px;flex:1;max-height:100%;border-radius:2px 2px 1px 1px;background:color-mix(in srgb,var(--primary) 55%,var(--text-tertiary));opacity:.7;transition:height .35s cubic-bezier(.25,.1,.25,1)}
.disk-card{margin-top:7px}
.disk-card>header>span{display:grid;gap:1px}
.disk-card>header strong{font-size:.64rem;font-weight:700}
.disk-card>header small{font-size:.44rem;color:var(--text-tertiary)}
.disk-card>header>b{font-size:.72rem;font-weight:720}
.disk-card p{display:flex;justify-content:space-between;gap:8px}
.monitor-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding:9px 2px 0;color:var(--text-tertiary)}
.monitor-foot span,.monitor-foot small{font-size:.46rem}
.monitor-state{flex:1;display:grid;place-items:center;text-align:center;padding:12px;color:var(--text-tertiary);font-size:.58rem}
</style>
