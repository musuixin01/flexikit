<script setup lang="ts">
import { ref, watch } from 'vue';

const emit = defineEmits<{ search: [query: string] }>();
const query = ref('');
let timer: ReturnType<typeof setTimeout> | null = null;

watch(query, (val) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => emit('search', val), 300);
});
</script>

<template>
  <div class="search-wrap">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <input v-model="query" type="search" placeholder="搜索工具名称、描述或标签..." />
  </div>
</template>
