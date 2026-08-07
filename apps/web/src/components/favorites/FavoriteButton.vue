<script setup lang="ts">
import { useToolsStore } from '../../stores/tools'

const props = defineProps<{
  toolId: number
}>()

const emit = defineEmits<{
  toggle: [toolId: number]
}>()

const store = useToolsStore()
const isActive = () => store.favoriteIds.includes(props.toolId)
</script>

<template>
  <button
    class="card-fav-btn"
    :class="{ active: isActive() }"
    @click.stop="emit('toggle', toolId)"
    aria-label="收藏"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  </button>
</template>
