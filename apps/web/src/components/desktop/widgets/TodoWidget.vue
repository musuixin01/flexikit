<template>
  <section class="todo-widget">
    <header class="todo-head">
      <span><strong>待办</strong><small>{{ openCount }} 项未完成</small></span>
      <button v-if="completedCount" type="button" @click="clearCompleted">清理已完成</button>
    </header>

    <form class="todo-add" @submit.prevent="addTodo">
      <input v-model="draft" type="text" maxlength="120" placeholder="添加一项待办…" autocomplete="off">
      <button type="submit" :disabled="!draft.trim()" aria-label="添加待办">＋</button>
    </form>

    <div class="todo-list">
      <label v-for="item in visibleItems" :key="item.id" class="todo-row" :class="{ done: item.done }">
        <input type="checkbox" :checked="item.done" @change="toggleTodo(item.id)">
        <span class="todo-check" aria-hidden="true">✓</span>
        <span class="todo-text">{{ item.text }}</span>
        <button type="button" aria-label="删除待办" @click.prevent="removeTodo(item.id)">×</button>
      </label>
      <div v-if="!visibleItems.length" class="todo-empty">{{ items.length ? '没有未完成待办' : '今天没有待办' }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

const props = defineProps<{ widget: DesktopWidget }>()
const canvas = useDesktopCanvasStore()
const draft = ref('')

const items = computed<TodoItem[]>(() => {
  const value = props.widget.config.todoItems
  if (!Array.isArray(value)) return []
  return value.flatMap(raw => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Partial<TodoItem>
    if (typeof item.id !== 'string' || typeof item.text !== 'string') return []
    return [{
      id: item.id,
      text: item.text,
      done: item.done === true,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
    }]
  })
})

const openCount = computed(() => items.value.filter(item => !item.done).length)
const completedCount = computed(() => items.value.length - openCount.value)
const showCompleted = computed(() => props.widget.config.todoShowCompleted !== false)
const visibleItems = computed(() => (
  showCompleted.value ? items.value : items.value.filter(item => !item.done)
))

function createId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function persist(next: TodoItem[]): void {
  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      todoItems: next,
    },
  })
}

function addTodo(): void {
  const text = draft.value.trim()
  if (!text) return
  persist([...items.value, { id: createId(), text, done: false, createdAt: Date.now() }])
  draft.value = ''
}

function toggleTodo(id: string): void {
  persist(items.value.map(item => item.id === id ? { ...item, done: !item.done } : item))
}

function removeTodo(id: string): void {
  persist(items.value.filter(item => item.id !== id))
}

function clearCompleted(): void {
  persist(items.value.filter(item => !item.done))
}
</script>

<style scoped>
.todo-widget{height:100%;display:flex;flex-direction:column;padding:14px;color:var(--text-primary)}
.todo-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
.todo-head>span{display:grid;gap:2px}.todo-head strong{font-size:.82rem}.todo-head small{font-size:.56rem;color:var(--text-tertiary)}
.todo-head button{border:0;background:transparent;color:var(--text-tertiary);font:inherit;font-size:.56rem;cursor:pointer}.todo-head button:hover{color:var(--primary)}
.todo-add{display:flex;gap:7px}.todo-add input{min-width:0;flex:1;height:36px;padding:0 11px;border:1px solid var(--glass-border);border-radius:11px;outline:0;background:var(--input-bg);color:var(--text-primary);font:inherit;font-size:.68rem}.todo-add input:focus{border-color:color-mix(in srgb,var(--primary) 42%,var(--glass-border))}
.todo-add button{width:36px;height:36px;border:1px solid var(--glass-border);border-radius:11px;background:var(--btn-bg);color:var(--primary);font-size:1rem;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}.todo-add button:hover:not(:disabled){background:var(--btn-bg-hover);transform:scale(1.03)}.todo-add button:disabled{opacity:.35;cursor:default}
.todo-list{flex:1;display:grid;align-content:start;gap:4px;margin-top:10px;overflow:auto}
.todo-row{position:relative;display:flex;align-items:center;gap:9px;min-height:36px;padding:6px 7px;border-radius:11px;cursor:pointer;transition:background .25s}.todo-row:hover{background:var(--btn-bg-hover)}.todo-row input{position:absolute;opacity:0;pointer-events:none}
.todo-check{width:18px;height:18px;display:grid;place-items:center;flex:0 0 auto;border:1px solid var(--glass-border);border-radius:6px;color:transparent;font-size:.56rem}.todo-row input:checked+.todo-check{background:var(--primary);border-color:var(--primary);color:white}
.todo-text{min-width:0;flex:1;font-size:.66rem;line-height:1.4;overflow-wrap:anywhere}.todo-row.done .todo-text{text-decoration:line-through;color:var(--text-tertiary)}
.todo-row>button{width:22px;height:22px;border:0;border-radius:7px;background:transparent;color:transparent;font:inherit;cursor:pointer}.todo-row:hover>button{color:var(--text-tertiary)}.todo-row>button:hover{background:var(--btn-bg);color:var(--danger)}
.todo-empty{height:100px;display:grid;place-items:center;color:var(--text-tertiary);font-size:.64rem}
</style>
