<template>
  <div :class="['toast', { visible: ui.toastVisible }]" id="toast" role="status" aria-live="polite">
    <span>{{ ui.toastMessage }}</span>
    <button v-if="ui.toastUndoCallback" @click="undo" style="margin-left:12px;background:var(--accent);border:none;border-radius:6px;padding:4px 8px;color:#fff;cursor:pointer;font-size:0.7rem;">撤销</button>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
let timer: ReturnType<typeof setTimeout> | null = null

function undo() {
  if (ui.toastUndoCallback) {
    ui.toastUndoCallback()
  }
  ui.hideToast()
}

watch(() => ui.toastVisible, (val) => {
  if (val) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      ui.hideToast()
    }, 3000)
  }
})
</script>
