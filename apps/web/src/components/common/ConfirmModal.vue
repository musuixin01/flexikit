<template>
  <div v-if="ui.confirmModalOpen" class="confirm-modal" id="confirmModal" @click.self="cancel">
    <div class="confirm-modal-content">
      <h4>{{ ui.confirmModalTitle }}</h4>
      <p v-html="ui.confirmModalMessage"></p>
      <div class="confirm-actions">
        <button class="btn-secondary" @click="cancel">取消</button>
        <button class="btn-danger" @click="confirm">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

function confirm() {
  if (ui.confirmModalCallback) {
    ui.confirmModalCallback()
  }
  ui.closeConfirmModal()
}

function cancel() {
  ui.closeConfirmModal()
}
</script>
