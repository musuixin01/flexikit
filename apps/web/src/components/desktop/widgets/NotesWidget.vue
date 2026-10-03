<template>
  <section class="notes-widget" :style="{ '--note-accent': noteAccentColor }">
    <header class="notes-head">
      <span>
        <small>NOTES</small>
        <strong>{{ displayTitle }}</strong>
      </span>
      <div class="notes-actions">
        <button
          v-if="hasContent"
          type="button"
          :class="{ danger: clearArmed }"
          :title="clearArmed ? '再次点击确认清空' : '清空便签'"
          @click="requestClear"
        >{{ clearArmed ? '确认清空' : '清空' }}</button>
        <button
          type="button"
          class="primary-action"
          @click="toggleEditing"
        >{{ editing ? '完成' : '编辑' }}</button>
      </div>
    </header>

    <div v-if="editing" class="notes-editor">
      <input
        v-model="draftTitle"
        type="text"
        maxlength="40"
        autocomplete="off"
        placeholder="便签标题"
        aria-label="便签标题"
        @input="scheduleSave"
        @blur="flushSave"
      >
      <textarea
        ref="contentInput"
        v-model="draftContent"
        maxlength="12000"
        spellcheck="true"
        placeholder="随手记点什么…"
        aria-label="便签内容"
        @input="scheduleSave"
        @blur="flushSave"
      ></textarea>
    </div>

    <div v-else class="notes-view" @dblclick="startEditing">
      <p v-if="draftContent">{{ draftContent }}</p>
      <div v-else class="notes-empty">
        <strong>还没有内容</strong>
        <span>双击或点击“编辑”开始记录</span>
      </div>
    </div>

    <footer class="notes-foot">
      <span>{{ updatedLabel }}</span>
      <small v-if="editing">{{ draftContent.length.toLocaleString('zh-CN') }} / 12,000</small>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

const props = defineProps<{ widget: DesktopWidget }>()
const canvas = useDesktopCanvasStore()

const storedTitle = typeof props.widget.config.noteTitle === 'string'
  ? props.widget.config.noteTitle.slice(0, 40)
  : ''
const storedContent = typeof props.widget.config.noteContent === 'string'
  ? props.widget.config.noteContent.slice(0, 12_000)
  : ''

const draftTitle = ref(storedTitle)
const draftContent = ref(storedContent)
const editing = ref(!storedContent)
const clearArmed = ref(false)
const contentInput = ref<HTMLTextAreaElement | null>(null)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let clearTimer: ReturnType<typeof setTimeout> | null = null

const displayTitle = computed(() => draftTitle.value.trim() || '便签')
const hasContent = computed(() => Boolean(draftTitle.value.trim() || draftContent.value))

const noteAccentColor = computed(() => {
  const value = props.widget.config.noteAccentColor
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#8F98A3'
})

const updatedAt = computed(() => {
  const value = props.widget.config.noteUpdatedAt
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
})

const updatedLabel = computed(() => {
  if (!updatedAt.value) return '尚未保存'
  const date = new Date(updatedAt.value)
  const today = new Date()
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()

  if (sameDay) {
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 编辑`
  }

  return `${date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} 编辑`
})

function persist(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  const title = draftTitle.value.slice(0, 40)
  const content = draftContent.value.slice(0, 12_000)
  const previousTitle = typeof props.widget.config.noteTitle === 'string' ? props.widget.config.noteTitle : ''
  const previousContent = typeof props.widget.config.noteContent === 'string' ? props.widget.config.noteContent : ''

  if (title === previousTitle && content === previousContent) return

  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      noteTitle: title,
      noteContent: content,
      noteUpdatedAt: Date.now(),
    },
  })
}

function scheduleSave(): void {
  clearArmed.value = false
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    persist()
  }, 450)
}

function flushSave(): void {
  persist()
}

async function startEditing(): Promise<void> {
  editing.value = true
  await nextTick()
  contentInput.value?.focus()
}

async function toggleEditing(): Promise<void> {
  if (editing.value) {
    flushSave()
    editing.value = false
    return
  }
  await startEditing()
}

function resetClearArm(): void {
  clearArmed.value = false
  if (clearTimer !== null) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
}

function requestClear(): void {
  if (!clearArmed.value) {
    clearArmed.value = true
    if (clearTimer !== null) clearTimeout(clearTimer)
    clearTimer = setTimeout(() => {
      clearTimer = null
      clearArmed.value = false
    }, 3000)
    return
  }

  resetClearArm()
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  draftTitle.value = ''
  draftContent.value = ''
  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      noteTitle: '',
      noteContent: '',
      noteUpdatedAt: Date.now(),
    },
  })
  editing.value = true
  void nextTick(() => contentInput.value?.focus())
}

onBeforeUnmount(() => {
  flushSave()
  if (saveTimer !== null) clearTimeout(saveTimer)
  if (clearTimer !== null) clearTimeout(clearTimer)
})
</script>

<style scoped>
.notes-widget{height:100%;min-height:0;display:flex;flex-direction:column;padding:14px;color:var(--text-primary)}
.notes-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.notes-head>span{display:grid;gap:1px;min-width:0}
.notes-head small{font-size:.45rem;letter-spacing:.12em;color:var(--note-accent)}
.notes-head strong{max-width:170px;font-size:.78rem;font-weight:720;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.notes-actions{display:flex;align-items:center;gap:4px}
.notes-actions button{height:27px;padding:0 8px;border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.48rem;font-weight:650;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.notes-actions button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.notes-actions button:active{transform:scale(.98)}
.notes-actions button.primary-action{background:color-mix(in srgb,var(--note-accent) 10%,var(--btn-bg));border-color:color-mix(in srgb,var(--note-accent) 28%,var(--glass-border));color:var(--text-primary)}
.notes-actions button.danger{border-color:color-mix(in srgb,var(--danger) 30%,var(--glass-border));color:var(--danger)}
.notes-editor{min-height:0;flex:1;display:flex;flex-direction:column;gap:6px}
.notes-editor input,.notes-editor textarea{width:100%;min-width:0;border:1px solid var(--glass-border);outline:0;background:color-mix(in srgb,var(--input-bg) 84%,transparent);color:var(--text-primary);font:inherit;transition:border-color .3s cubic-bezier(.25,.1,.25,1),background .3s cubic-bezier(.25,.1,.25,1)}
.notes-editor input:focus,.notes-editor textarea:focus{border-color:color-mix(in srgb,var(--primary) 34%,var(--glass-border));background:var(--input-bg)}
.notes-editor input{height:34px;padding:0 10px;border-radius:10px;font-size:.65rem;font-weight:650}
.notes-editor textarea{flex:1;min-height:80px;resize:none;padding:10px 11px;border-radius:12px;font-size:.62rem;line-height:1.65}
.notes-editor input::placeholder,.notes-editor textarea::placeholder{color:var(--text-tertiary)}
.notes-view{min-height:0;flex:1;overflow:auto;padding:9px 10px;border:1px solid transparent;border-radius:12px;cursor:text;transition:all .3s cubic-bezier(.25,.1,.25,1);scrollbar-width:thin}
.notes-view:hover{background:color-mix(in srgb,var(--btn-bg) 58%,transparent);border-color:var(--glass-border)}
.notes-view p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.63rem;line-height:1.68;color:var(--text-secondary);user-select:text}
.notes-empty{height:100%;display:grid;place-content:center;text-align:center;gap:4px;color:var(--text-tertiary)}
.notes-empty strong{font-size:.62rem;font-weight:650;color:var(--text-secondary)}
.notes-empty span{font-size:.49rem}
.notes-foot{min-height:25px;display:flex;align-items:end;justify-content:space-between;gap:8px;margin-top:6px;padding:5px 2px 0;border-top:1px solid var(--glass-border);color:var(--text-tertiary)}
.notes-foot span,.notes-foot small{font-size:.45rem}
</style>
