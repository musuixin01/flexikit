<template>
  <section class="calendar-widget">
    <header class="calendar-head">
      <span>
        <small>CALENDAR</small>
        <strong>{{ monthTitle }}</strong>
      </span>
      <div class="calendar-actions">
        <button type="button" title="上个月" aria-label="上个月" @click="shiftMonth(-1)">‹</button>
        <button type="button" class="today-action" @click="goToday">今天</button>
        <button type="button" title="下个月" aria-label="下个月" @click="shiftMonth(1)">›</button>
      </div>
    </header>

    <div class="weekday-grid" aria-hidden="true">
      <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="month-grid" role="grid" :aria-label="monthTitle">
      <button
        v-for="day in calendarDays"
        :key="day.key"
        type="button"
        class="day-cell"
        :class="{
          adjacent: !day.inCurrentMonth,
          hidden: !day.inCurrentMonth && !showAdjacentDays,
          today: day.isToday,
          selected: day.isSelected,
        }"
        :disabled="!day.inCurrentMonth && !showAdjacentDays"
        :aria-label="day.ariaLabel"
        :aria-pressed="day.isSelected"
        @click="selectDay(day.date)"
      >
        <span>{{ day.dayNumber }}</span>
        <i v-if="day.isToday" aria-hidden="true"></i>
      </button>
    </div>

    <footer class="calendar-foot">
      <span>
        <strong>{{ selectedTitle }}</strong>
        <small>{{ selectedWeekday }}</small>
      </span>
      <b v-if="selectedIsToday">今天</b>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { DesktopWidget } from '@/types/desktopWidget'

interface CalendarDay {
  key: string
  date: Date
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  ariaLabel: string
}

const props = defineProps<{ widget: DesktopWidget }>()

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const now = ref(startOfDay(new Date()))
const viewDate = ref(new Date(now.value.getFullYear(), now.value.getMonth(), 1))
const selectedDate = ref(startOfDay(now.value))

const timer = window.setInterval(() => {
  const next = startOfDay(new Date())
  if (dateKey(next) !== dateKey(now.value)) now.value = next
}, 60_000)

const weekStartsMonday = computed(() => props.widget.config.calendarWeekStartsOn !== 'sunday')
const showAdjacentDays = computed(() => props.widget.config.calendarShowAdjacentDays !== false)

const weekdayLabels = computed(() => (
  weekStartsMonday.value
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['日', '一', '二', '三', '四', '五', '六']
))

const monthTitle = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
}).format(viewDate.value))

const calendarDays = computed<CalendarDay[]>(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = weekStartsMonday.value
    ? (first.getDay() + 6) % 7
    : first.getDay()
  const start = new Date(year, month, 1 - offset)
  const todayKey = dateKey(now.value)
  const selectedKey = dateKey(selectedDate.value)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = dateKey(date)
    return {
      key,
      date,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getFullYear() === year && date.getMonth() === month,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      ariaLabel: new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(date),
    }
  })
})

const selectedTitle = computed(() => new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
}).format(selectedDate.value))

const selectedWeekday = computed(() => new Intl.DateTimeFormat('zh-CN', {
  weekday: 'long',
}).format(selectedDate.value))

const selectedIsToday = computed(() => dateKey(selectedDate.value) === dateKey(now.value))

function shiftMonth(delta: number): void {
  const current = viewDate.value
  viewDate.value = new Date(current.getFullYear(), current.getMonth() + delta, 1)
}

function goToday(): void {
  const today = startOfDay(new Date())
  now.value = today
  selectedDate.value = today
  viewDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
}

function selectDay(date: Date): void {
  selectedDate.value = startOfDay(date)
  if (
    date.getFullYear() !== viewDate.value.getFullYear()
    || date.getMonth() !== viewDate.value.getMonth()
  ) {
    viewDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
}

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
.calendar-widget{height:100%;min-height:0;display:flex;flex-direction:column;padding:14px;color:var(--text-primary);user-select:none}
.calendar-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.calendar-head>span{display:grid;gap:1px;min-width:0}
.calendar-head small{font-size:.46rem;letter-spacing:.12em;color:var(--text-tertiary)}
.calendar-head strong{font-size:.82rem;font-weight:720;letter-spacing:-.018em}
.calendar-actions{display:flex;align-items:center;gap:4px}
.calendar-actions button{height:27px;min-width:27px;padding:0;border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.68rem;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.calendar-actions button.today-action{min-width:38px;padding:0 7px;font-size:.5rem;font-weight:650}
.calendar-actions button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.calendar-actions button:active{transform:scale(.98)}
.weekday-grid,.month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.weekday-grid{margin-bottom:4px}
.weekday-grid span{height:18px;display:grid;place-items:center;font-size:.48rem;font-weight:650;color:var(--text-tertiary)}
.month-grid{flex:1;min-height:0;grid-template-rows:repeat(6,minmax(28px,1fr));gap:2px}
.day-cell{position:relative;min-width:0;min-height:28px;display:grid;place-items:center;padding:0;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-secondary);font:inherit;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.day-cell>span{position:relative;z-index:1;font-size:.59rem;font-weight:590}
.day-cell>i{position:absolute;bottom:4px;width:3px;height:3px;border-radius:50%;background:var(--primary)}
.day-cell:hover:not(:disabled){background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.day-cell:active:not(:disabled){transform:scale(.98)}
.day-cell.adjacent{color:var(--text-tertiary);opacity:.5}
.day-cell.hidden{visibility:hidden;pointer-events:none}
.day-cell.today{color:var(--text-primary);font-weight:720}
.day-cell.selected{border-color:color-mix(in srgb,var(--primary) 24%,var(--glass-border));background:color-mix(in srgb,var(--primary) 10%,var(--btn-bg));color:var(--text-primary);box-shadow:inset 0 1px 0 rgb(255 255 255 / 14%)}
.day-cell.selected.today{border-color:color-mix(in srgb,var(--primary) 38%,var(--glass-border))}
.calendar-foot{min-height:30px;display:flex;align-items:end;justify-content:space-between;gap:10px;margin-top:8px;padding:7px 3px 0;border-top:1px solid var(--glass-border)}
.calendar-foot>span{display:flex;align-items:baseline;gap:6px;min-width:0}
.calendar-foot strong{font-size:.6rem;font-weight:680}
.calendar-foot small{font-size:.49rem;color:var(--text-tertiary)}
.calendar-foot>b{padding:3px 6px;border-radius:7px;background:color-mix(in srgb,var(--primary) 9%,var(--btn-bg));color:var(--text-secondary);font-size:.46rem;font-weight:650}
</style>
