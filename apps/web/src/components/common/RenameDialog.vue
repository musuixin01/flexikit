<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useUiStore } from '../../stores/ui'
import { useToolsStore } from '../../stores/tools'

const ui = useUiStore()
const tools = useToolsStore()
const newName = ref('')

watch(
  () => ui.renameModalOpen,
  async (val) => {
    if (!val) return
    newName.value = ui.renameModalOldName
    await nextTick()
  }
)

function confirmRename() {
  const name = newName.value.trim()
  if (name && ui.renameModalOldName && name !== ui.renameModalOldName) {
    tools.renameCategory(ui.renameModalOldName, name)
    ui.showToast(`分类已重命名为 ${name}`)
  }
  ui.closeRenameModal()
}

function onCancel() {
  ui.closeRenameModal()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') onCancel()
  if (e.key === 'Enter') confirmRename()
}
</script>

<template>
  <div v-if="ui.renameModalOpen" class="rename-modal" @click.self="onCancel" @keydown="onKeydown">
    <div class="rename-modal-content">
      <h4>重命名分类</h4>
      <input v-model="newName" placeholder="输入新的分类名" maxlength="30" />
      <div class="rename-actions">
        <button class="btn-secondary" @click="onCancel">取消</button>
        <button class="btn-secondary" @click="confirmRename">确定</button>
      </div>
    </div>
  </div>
</template>
