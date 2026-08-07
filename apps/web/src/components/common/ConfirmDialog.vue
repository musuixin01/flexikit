<script setup lang="ts">
import { useUiStore } from '../../stores/ui'

const ui = useUiStore()

function onCancel() {
  ui.closeConfirmModal()
}

function onConfirm() {
  ui.confirmModalCallback?.()
  ui.closeConfirmModal()
}

function onOverlayClick() {
  onCancel()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') onCancel()
}
</script>

<template>
  <div v-if="ui.confirmModalOpen" class="confirm-modal" @click.self="onOverlayClick" @keydown="onKeydown">
    <div class="confirm-modal-content">
      <h4>{{ ui.confirmModalTitle }}</h4>
      <p v-html="ui.confirmModalMessage"></p>
      <div class="confirm-actions">
        <button class="btn-secondary" @click="onCancel">取消</button>
        <button class="btn-danger" @click="onConfirm">删除</button>
      </div>
    </div>
  </div>
</template>
