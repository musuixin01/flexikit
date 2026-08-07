<script setup lang="ts">
const props = defineProps<{
  categories: string[];
  active: string;
}>();
const emit = defineEmits<{ select: [cat: string]; rename: [cat: string] }>();
const colors = ['#0071e3', '#5e5ce6', '#ff375f', '#34c759', '#ff9f0a', '#30b0c7'];
</script>

<template>
  <nav class="cat-nav">
    <button v-for="(cat, i) in categories" :key="cat"
      class="cat-item" :class="{ active: active === cat }"
      @click="emit('select', cat)"
      @dblclick="emit('rename', cat)">
      <span class="cat-dot" :style="{ background: active === cat ? 'var(--accent)' : colors[i % colors.length] }"></span>
      <span>{{ cat }}</span>
    </button>
  </nav>
</template>
