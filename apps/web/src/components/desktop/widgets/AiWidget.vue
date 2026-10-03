<template>
  <section class="ai-widget">
    <header class="ai-head">
      <span><strong>AI 快捷台</strong><small>Prompt 不会自动保存</small></span>
      <select v-model="selectedKey" @change="persistSelectedTool">
        <option v-for="tool in aiTools" :key="toolKey(tool)" :value="toolKey(tool)">{{ tool.name }}</option>
      </select>
    </header>

    <textarea v-model="prompt" placeholder="写下你的问题或任务…" spellcheck="false"></textarea>

    <div class="ai-actions">
      <span>{{ status }}</span>
      <button type="button" :disabled="!prompt.trim()" @click="copyPrompt">复制</button>
      <button class="primary" type="button" :disabled="!prompt.trim() || !selectedTool" @click="copyAndOpen">复制并打开</button>
    </div>

    <div v-if="!aiTools.length" class="ai-empty">工具库里暂时没有 AI 工具</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import { useToolsStore } from '@/stores/tools'
import { openDesktopTool } from '@/desktop/openTool'
import type { DesktopWidget } from '@/types/desktopWidget'
import type { Tool } from '@/types/tool'

const props = defineProps<{ widget: DesktopWidget }>()
const canvas = useDesktopCanvasStore()
const tools = useToolsStore()
const prompt = ref('')
const status = ref('写好后复制到你选择的 AI')
const selectedKey = ref('')

const aiTools = computed(() => tools.allTools.filter(tool => (
  tool.cat?.toLowerCase().includes('ai')
  || tool.tags?.some(tag => tag.toLowerCase() === 'ai')
  || /chatgpt|claude|gemini|kimi|gpt/i.test(tool.name)
)))

const selectedTool = computed(() => (
  aiTools.value.find(tool => toolKey(tool) === selectedKey.value) ?? aiTools.value[0] ?? null
))

function toolKey(tool: Tool): string {
  return String(tool.id ?? `${tool.name}-${tool.url}`)
}

function persistSelectedTool(): void {
  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      aiToolKey: selectedKey.value,
    },
  })
}

async function writeClipboard(value: string): Promise<void> {
  if (isDesktopRuntime()) {
    await invokeDesktop('set_clipboard_text', { text: value })
    return
  }
  await navigator.clipboard.writeText(value)
}

async function copyPrompt(): Promise<void> {
  const value = prompt.value.trim()
  if (!value) return
  try {
    await writeClipboard(value)
    status.value = 'Prompt 已复制'
  } catch {
    status.value = '复制失败，请检查剪贴板权限'
  }
}

async function copyAndOpen(): Promise<void> {
  const value = prompt.value.trim()
  const tool = selectedTool.value
  if (!value || !tool) return

  try {
    await writeClipboard(value)
    const opened = await openDesktopTool(tool)
    status.value = opened ? `已复制，并打开 ${tool.name}` : 'Prompt 已复制，但工具无法打开'
  } catch {
    status.value = '操作失败，请检查桌面权限'
  }
}

watch(aiTools, value => {
  const saved = props.widget.config.aiToolKey
  const savedKey = typeof saved === 'string' ? saved : ''
  if (savedKey && value.some(tool => toolKey(tool) === savedKey)) {
    selectedKey.value = savedKey
  } else {
    selectedKey.value = value[0] ? toolKey(value[0]) : ''
  }
}, { immediate: true })
</script>

<style scoped>
.ai-widget{position:relative;height:100%;display:flex;flex-direction:column;gap:10px;padding:14px;color:var(--text-primary)}
.ai-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ai-head>span{display:grid;gap:2px;min-width:0}.ai-head strong{font-size:.8rem}.ai-head small{font-size:.54rem;color:var(--text-tertiary)}
.ai-head select{max-width:46%;height:30px;padding:0 8px;border:1px solid var(--glass-border);border-radius:9px;outline:0;background:var(--input-bg);color:var(--text-secondary);font:inherit;font-size:.57rem}
textarea{flex:1;min-height:72px;resize:none;padding:10px 11px;border:1px solid var(--glass-border);border-radius:13px;outline:0;background:var(--input-bg);color:var(--text-primary);font:inherit;font-size:.66rem;line-height:1.5}textarea:focus{border-color:color-mix(in srgb,var(--primary) 45%,var(--glass-border))}
.ai-actions{display:flex;align-items:center;gap:6px}.ai-actions>span{min-width:0;flex:1;color:var(--text-tertiary);font-size:.53rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-actions button{height:29px;padding:0 9px;border:1px solid var(--glass-border);border-radius:9px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.56rem;cursor:pointer}.ai-actions button.primary{color:var(--primary)}.ai-actions button:hover:not(:disabled){background:var(--btn-bg-hover);transform:scale(1.02)}.ai-actions button:disabled{opacity:.35;cursor:default}
.ai-empty{position:absolute;inset:48px 14px 14px;display:grid;place-items:center;border-radius:13px;background:color-mix(in srgb,var(--glass-bg) 94%,transparent);color:var(--text-tertiary);font-size:.62rem}
</style>
