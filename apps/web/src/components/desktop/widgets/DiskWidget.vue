<template>
  <section class="disk-widget">
    <div class="disk-head">
      <div><strong>{{ label }}</strong><span>系统磁盘</span></div>
      <span>{{ usedPercent }}%</span>
    </div>
    <div class="disk-bar"><i :style="{ width: `${usedPercent}%` }"></i></div>
    <div class="disk-meta">
      <span>可用 {{ formatBytes(freeBytes) }}</span>
      <span>共 {{ formatBytes(totalBytes) }}</span>
    </div>
    <p v-if="error" class="disk-error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import type { DesktopWidget } from '@/types/desktopWidget'

defineProps<{ widget: DesktopWidget }>()

const label = ref('C:')
const totalBytes = ref(0)
const freeBytes = ref(0)
const error = ref('')

const usedPercent = computed(() => {
  if (!totalBytes.value) return 0
  return Math.round(((totalBytes.value - freeBytes.value) / totalBytes.value) * 100)
})

function formatBytes(bytes: number): string {
  if (!bytes) return '--'
  const gb = bytes / 1024 / 1024 / 1024
  return `${gb >= 100 ? gb.toFixed(0) : gb.toFixed(1)} GB`
}

onMounted(async () => {
  if (!isDesktopRuntime()) {
    error.value = '仅桌面端可读取系统磁盘'
    return
  }
  try {
    const [drive, total, free] = await invokeDesktop<[string, number, number]>('get_system_disk_info')
    label.value = drive
    totalBytes.value = total
    freeBytes.value = free
  } catch {
    error.value = '暂时无法读取磁盘信息'
  }
})
</script>

<style scoped>
.disk-widget{height:100%;padding:18px;display:flex;flex-direction:column;justify-content:center;color:var(--text-primary)}
.disk-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.disk-head>div{display:grid;gap:2px}
.disk-head strong{font-size:1.05rem;font-weight:700}
.disk-head span{font-size:.68rem;color:var(--text-tertiary)}
.disk-head>span{font-size:1.45rem;font-weight:720;letter-spacing:-.04em;color:var(--primary)}
.disk-bar{height:9px;margin:16px 0 9px;border-radius:999px;background:var(--btn-bg);overflow:hidden;box-shadow:inset 0 1px 2px rgb(0 0 0 / 8%)}
.disk-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--primary),color-mix(in srgb,var(--primary) 65%,#ffffff));transition:width .3s cubic-bezier(.25,.1,.25,1)}
.disk-meta{display:flex;justify-content:space-between;gap:10px;color:var(--text-secondary);font-size:.68rem}
.disk-error{margin:10px 0 0;color:var(--text-tertiary);font-size:.66rem}
</style>
