<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="modal-overlay" :class="{ open: visible }" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <slot />
    </div>
  </div>
</template>
