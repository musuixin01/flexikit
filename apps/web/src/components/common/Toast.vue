<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useUiStore } from '../../stores/ui'

const ui = useUiStore()
let timer: ReturnType<typeof setTimeout> | null = null

function undo() {
  ui.toastUndoCallback?.()
  ui.hideToast()
}

watch(
  () => ui.toastVisible,
  (val) => {
    if (!val) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => ui.hideToast(), 3000)
  }
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div :class="['toast', { visible: ui.toastVisible }]" role="status" aria-live="polite">
    <span>{{ ui.toastMessage }}</span>
    <button v-if="ui.toastUndoCallback" class="toast-btn" @click="undo">撤销</button>
  </div>
</template>
