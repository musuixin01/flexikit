<template>
  <div v-if="ui.renameModalOpen" class="rename-modal" id="renameModal" @click.self="cancel">
    <div class="rename-modal-content">
      <h4>重命名分类</h4>
      <input type="text" v-model="newName" placeholder="新分类名称" maxlength="30" autocomplete="off" class="theme-input" ref="inputRef" @keydown.enter="confirm">
      <div class="rename-actions">
        <button @click="cancel">取消</button>
        <button @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useToolsStore } from '@/stores/tools'

const ui = useUiStore()
const tools = useToolsStore()

const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => ui.renameModalOpen, (val) => {
  if (val) {
    newName.value = ui.renameModalOldName
    nextTick(() => inputRef.value?.focus())
  }
})

function confirm() {
  const name = newName.value.trim()
  if (name && ui.renameModalOldName && name !== ui.renameModalOldName) {
    tools.renameCategory(ui.renameModalOldName, name)
    ui.showToast(`分类已重命名为「${name}」`)
  }
  ui.closeRenameModal()
}

function cancel() {
  ui.closeRenameModal()
}
</script>
