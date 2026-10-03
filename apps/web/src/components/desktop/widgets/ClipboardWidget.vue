<template>
  <section class="clipboard-widget">
    <header class="clipboard-head">
      <span><strong>剪贴板</strong><small>仅在你主动读取时访问</small></span>
      <button type="button" :disabled="loading" @click="readClipboard">{{ loading ? '读取中' : '读取' }}</button>
    </header>

    <textarea v-model="text" placeholder="点击“读取”查看当前文本，或在这里输入内容…" spellcheck="false"></textarea>

    <footer>
      <span>{{ status }}</span>
      <div>
        <button type="button" :disabled="!text" @click="clearView">清空显示</button>
        <button class="primary" type="button" :disabled="!text" @click="writeClipboard">写入剪贴板</button>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'
import type { DesktopWidget } from '@/types/desktopWidget'

defineProps<{ widget: DesktopWidget }>()

const text = ref('')
const status = ref('不会保存剪贴板内容')
const loading = ref(false)

async function readClipboard(): Promise<void> {
  loading.value = true
  try {
    if (isDesktopRuntime()) {
      text.value = await invokeDesktop<string | null>('get_clipboard_text') ?? ''
    } else {
      text.value = await navigator.clipboard.readText()
    }
    status.value = text.value ? '已读取当前剪贴板' : '当前没有文本内容'
  } catch {
    status.value = '无法读取，请检查系统权限'
  } finally {
    loading.value = false
  }
}

async function writeClipboard(): Promise<void> {
  if (!text.value) return
  try {
    if (isDesktopRuntime()) {
      await invokeDesktop('set_clipboard_text', { text: text.value })
    } else {
      await navigator.clipboard.writeText(text.value)
    }
    status.value = '已写入系统剪贴板'
  } catch {
    status.value = '写入失败，请检查系统权限'
  }
}

function clearView(): void {
  text.value = ''
  status.value = '已清空显示，系统剪贴板未修改'
}
</script>

<style scoped>
.clipboard-widget{height:100%;display:flex;flex-direction:column;gap:10px;padding:14px;color:var(--text-primary)}
.clipboard-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.clipboard-head>span{display:grid;gap:2px}.clipboard-head strong{font-size:.8rem}.clipboard-head small{font-size:.55rem;color:var(--text-tertiary)}
.clipboard-head button{height:29px;padding:0 10px;border:1px solid var(--glass-border);border-radius:9px;background:var(--btn-bg);color:var(--primary);font:inherit;font-size:.6rem;font-weight:620;cursor:pointer}.clipboard-head button:hover:not(:disabled){background:var(--btn-bg-hover)}
textarea{flex:1;min-height:70px;resize:none;padding:10px 11px;border:1px solid var(--glass-border);border-radius:13px;outline:0;background:var(--input-bg);color:var(--text-primary);font:inherit;font-size:.65rem;line-height:1.5}textarea:focus{border-color:color-mix(in srgb,var(--primary) 45%,var(--glass-border))}
footer{display:flex;align-items:center;justify-content:space-between;gap:10px}footer>span{min-width:0;color:var(--text-tertiary);font-size:.53rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}footer>div{display:flex;gap:5px;flex:0 0 auto}
footer button{height:28px;padding:0 9px;border:1px solid var(--glass-border);border-radius:9px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.56rem;cursor:pointer}footer button.primary{color:var(--primary)}footer button:hover:not(:disabled){background:var(--btn-bg-hover);transform:scale(1.02)}footer button:disabled{opacity:.35;cursor:default}
</style>
