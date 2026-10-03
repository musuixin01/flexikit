<template>
  <section class="search-widget">
    <label class="search-box">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <input v-model="query" type="search" :placeholder="placeholder" autocomplete="off" @keydown.enter.prevent="openFirst">
    </label>
    <div class="search-results">
      <button v-for="tool in results" :key="`${tool.id || tool.name}-${tool.url}`" type="button" @click="launch(tool)">
        <span class="result-icon"><ToolIcon :tool="tool" /></span>
        <span class="result-copy"><strong>{{ tool.name }}</strong><small>{{ tool.desc || tool.cat }}</small></span>
        <span class="result-arrow">↗</span>
      </button>
      <div v-if="query.trim() && !results.length" class="search-empty">没有找到相关工具</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolIcon from '@/components/tools/ToolIcon.vue'
import { useToolsStore } from '@/stores/tools'
import type { Tool } from '@/types/tool'
import { openDesktopTool } from '@/desktop/openTool'
import type { DesktopWidget } from '@/types/desktopWidget'

const props = defineProps<{ widget: DesktopWidget }>()

const store = useToolsStore()
const query = ref('')

const resultLimit = computed(() => {
  const value = props.widget.config.searchResultLimit
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(12, Math.max(3, Math.round(value)))
    : 6
})

const placeholder = computed(() => {
  const value = props.widget.config.searchPlaceholder
  return typeof value === 'string' ? value : '搜索应用、工具和网站…'
})

const results = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const source = keyword
    ? store.allTools.filter(tool => [tool.name, tool.desc, tool.cat, ...(tool.tags || [])].some(value => value?.toLowerCase().includes(keyword)))
    : store.allTools
  return source.slice(0, resultLimit.value)
})

function launch(tool: Tool): void {
  void openDesktopTool(tool)
}

function openFirst(): void {
  const tool = results.value[0]
  if (tool) launch(tool)
}
</script>

<style scoped>
.search-widget{height:100%;padding:14px;display:flex;flex-direction:column;gap:10px}
.search-box{display:flex;align-items:center;gap:9px;min-height:42px;padding:0 13px;border:1px solid var(--glass-border);border-radius:14px;background:var(--input-bg);box-shadow:inset 0 1px 0 rgb(255 255 255 / 16%)}
.search-box svg{width:17px;height:17px;fill:none;stroke:var(--text-tertiary);stroke-width:1.8}
.search-box input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:.8rem}
.search-box input::placeholder{color:var(--text-tertiary)}
.search-results{display:grid;gap:4px;overflow:auto}
.search-results button{display:flex;align-items:center;gap:10px;width:100%;border:0;border-radius:12px;background:transparent;padding:7px 9px;color:var(--text-secondary);text-align:left;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.search-results button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:translateY(-1px)}
.search-results button:active{transform:scale(.98)}
.result-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:var(--icon-surface);flex:0 0 auto}
.result-icon :deep(img),.result-icon :deep(svg){width:22px;height:22px;object-fit:contain}
.result-copy{display:grid;min-width:0;gap:1px;flex:1}
.result-copy strong{font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.result-copy small{font-size:.62rem;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.result-arrow{font-size:.75rem;color:var(--text-tertiary)}
.search-empty{padding:16px;text-align:center;color:var(--text-tertiary);font-size:.72rem}
</style>
