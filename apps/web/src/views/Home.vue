<template>
  <div class="app-layout" :style="{ '--grid-columns': ui.effectiveGridColumns }">
    <Sidebar
      @open-add-modal="openAddModal"
      @batch-delete="onBatchDelete"
      @export-data="onExport"
      @import-data="onImport"
    />
    <main class="main-content">
      <Navbar />
      <div class="content-header">
        <h2>{{ ui.activeCategory === '全部' ? '全部工具' : ui.activeCategory }}</h2>
        <span class="result-count">共 {{ tools.getVisibleTools().length }} 个工具</span>
      </div>
      <ToolGrid
        @check-click="onCheckClick"
        @edit="onEdit"
        @delete="onDelete"
        @toggle-fav="onToggleFav"
      />
    </main>
  </div>

  <!-- 模态框 -->
  <ToolModal ref="toolModalRef" @saved="onToolSaved" />
  <ConfirmModal />
  <RenameModal />
  <ToastMessage />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToolsStore } from '@/stores/tools'
import { useUiStore } from '@/stores/ui'
import type { Tool } from '@/types/tool'
import Sidebar from '@/components/layout/Sidebar.vue'
import Navbar from '@/components/layout/Navbar.vue'
import ToolGrid from '@/components/tools/ToolGrid.vue'
import ToolModal from '@/components/tools/ToolModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import RenameModal from '@/components/common/RenameModal.vue'
import ToastMessage from '@/components/common/ToastMessage.vue'

const tools = useToolsStore()
const ui = useUiStore()
const toolModalRef = ref<InstanceType<typeof ToolModal> | null>(null)

// ========== 工具列表操作 ==========
function openAddModal() {
  toolModalRef.value?.openForAdd()
}

function onEdit(tool: Tool) {
  toolModalRef.value?.openForEdit(tool)
}

function onDelete(tool: Tool) {
  const name = tool.name
  if (tool.isCustom) {
    const idx = tools.customTools.indexOf(tool)
    if (idx !== -1) {
      ui.openConfirmModal('确认删除', `确定要删除自定义工具「${name}」吗？`, () => {
        tools.deleteCustomTool(idx)
        ui.showToast(`已删除自定义工具「${name}」`, () => tools.undoDelete())
      })
    }
  } else {
    const idx = tools.builtinTools.indexOf(tool)
    if (idx !== -1) {
      ui.openConfirmModal('确认删除', `确定要删除内置工具「${name}」吗？`, () => {
        tools.deleteBuiltinTool(idx)
        ui.showToast(`已删除内置工具「${name}」`, () => tools.undoDelete())
      })
    }
  }
}

function onCheckClick(key: string) {
  ui.toggleSelect(key)
}

function onToggleFav(key: string) {
  const wasFav = tools.favoriteTools.has(key)
  if (wasFav) {
    tools.toggleFavorite(key)
    ui.showToast('已取消收藏')
  } else {
    tools.toggleFavorite(key)
    ui.showToast('已添加到收藏')
  }
}

function onBatchDelete() {
  if (ui.selectedSet.size === 0) {
    ui.showToast('未选中任何工具')
    return
  }

  const selectedItems: { tool: Tool; type: 'builtin' | 'custom' }[] = []
  for (const key of ui.selectedSet) {
    if (key.startsWith('builtin:')) {
      const name = key.slice(8)
      const t = tools.builtinTools.find(t => t.name === name)
      if (t) selectedItems.push({ tool: t, type: 'builtin' })
    } else if (key.startsWith('custom:')) {
      const name = key.slice(7)
      const t = tools.customTools.find(t => t.name === name)
      if (t) selectedItems.push({ tool: t, type: 'custom' })
    }
  }

  if (selectedItems.length === 0) {
    ui.showToast('未找到有效工具')
    return
  }

  let itemsHtml = ''
  selectedItems.forEach(item => {
    const smallIcon = tools.getSmallIconHtml(item.tool)
    itemsHtml += `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;">${smallIcon}<span>${tools.escapeHtml(item.tool.name)}</span></div>`
  })

  ui.openConfirmModal('确认删除', `确定要删除以下 ${selectedItems.length} 个工具吗？<br><br>${itemsHtml}<br>此操作不可撤销。`, () => {
    tools.batchDelete(ui.selectedSet)
    ui.exitSelectMode()
    ui.showToast(`已删除 ${selectedItems.length} 个工具`, () => tools.undoDelete())
  })
}

function onToolSaved() {
  // 工具保存后的处理
}

// ========== 导入/导出 ==========
function onExport() {
  const jsonStr = tools.exportData()
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flexikit_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ui.showToast('已导出当前数据')
}

function onImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const addedCount = tools.importData(evt.target?.result as string)
        ui.showToast(`导入成功，新增 ${addedCount} 个自定义工具`)
      } catch (err) {
        ui.showToast('导入失败：文件格式错误')
        console.error(err)
      }
    }
    reader.onerror = () => ui.showToast('读取文件失败')
    reader.readAsText(file)
  }
  input.click()
}

// ========== 键盘快捷键 ==========
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (ui.toolModalOpen) ui.closeToolModal()
    if (ui.renameModalOpen) ui.closeRenameModal()
    if (ui.confirmModalOpen) ui.closeConfirmModal()
    if (ui.selectMode) ui.exitSelectMode()
  }
}

onMounted(() => {
  tools.initData()
  ui.initTheme()
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>
