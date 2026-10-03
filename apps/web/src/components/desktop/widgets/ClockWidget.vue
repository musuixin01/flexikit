<template>
  <section class="clock-widget">
    <div class="clock-time">{{ timeText }}</div>
    <div v-if="showDate" class="clock-date">{{ dateText }}</div>
    <div v-if="showWeekday" class="clock-day">{{ dayText }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { DesktopWidget } from '@/types/desktopWidget'

const props = defineProps<{ widget: DesktopWidget }>()

const now = ref(new Date())
const timer = window.setInterval(() => { now.value = new Date() }, 1000)

const showSeconds = computed(() => props.widget.config.clockShowSeconds === true)
const showDate = computed(() => props.widget.config.clockShowDate !== false)
const showWeekday = computed(() => props.widget.config.clockShowWeekday !== false)
const useTwelveHour = computed(() => props.widget.config.clockHourCycle === '12')

const timeText = computed(() => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: useTwelveHour.value,
  }
  if (showSeconds.value) options.second = '2-digit'
  return new Intl.DateTimeFormat('zh-CN', options).format(now.value)
})

const dateText = computed(() => new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
}).format(now.value))

const dayText = computed(() => new Intl.DateTimeFormat('zh-CN', {
  weekday: 'long',
}).format(now.value))

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
.clock-widget{height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:18px 20px;color:var(--text-primary)}
.clock-time{font-size:clamp(2rem,5vw,3.35rem);font-weight:720;letter-spacing:-.055em;line-height:.95}
.clock-date{margin-top:10px;font-size:.92rem;font-weight:620;color:var(--text-secondary)}
.clock-day{margin-top:3px;font-size:.74rem;color:var(--text-tertiary)}
</style>
