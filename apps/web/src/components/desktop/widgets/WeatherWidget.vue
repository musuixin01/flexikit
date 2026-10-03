<template>
  <section class="weather-widget">
    <header class="weather-head">
      <span>
        <small>WEATHER</small>
        <strong>{{ locationLabel || configuredLocation || '天气' }}</strong>
      </span>
      <div class="weather-actions">
        <button
          v-if="configuredLocation && !editingLocation"
          type="button"
          title="刷新天气"
          aria-label="刷新天气"
          :disabled="loading"
          @click="refreshWeather(true)"
        >↻</button>
        <button
          v-if="configuredLocation"
          type="button"
          class="location-action"
          @click="toggleLocationEditor"
        >{{ editingLocation ? '取消' : '城市' }}</button>
      </div>
    </header>

    <form
      v-if="editingLocation || !configuredLocation"
      class="location-editor"
      @submit.prevent="saveLocation"
    >
      <div>
        <strong>设置天气城市</strong>
        <small>只在你输入城市后联网，不读取系统定位</small>
      </div>
      <label>
        <input
          ref="locationInput"
          v-model="locationDraft"
          type="text"
          maxlength="80"
          autocomplete="off"
          placeholder="例如：南京 / Singapore / Paris, France"
          aria-label="天气城市"
        >
        <button type="submit" :disabled="locationDraft.trim().length < 2">确定</button>
      </label>
      <p v-if="setupError">{{ setupError }}</p>
    </form>

    <div v-else-if="loading && !weather" class="weather-state">
      <span class="weather-spinner"></span>
      <strong>正在获取天气</strong>
      <small>Open-Meteo</small>
    </div>

    <div v-else-if="error && !weather" class="weather-state">
      <strong>{{ error }}</strong>
      <button type="button" @click="refreshWeather(true)">重试</button>
    </div>

    <template v-else-if="weather">
      <div class="current-weather">
        <div class="weather-symbol" aria-hidden="true">{{ weatherSymbol(weather.current.weatherCode, weather.current.isDay) }}</div>
        <div class="temperature">
          <strong>{{ rounded(weather.current.temperature) }}°</strong>
          <span>{{ weatherText(weather.current.weatherCode) }}</span>
        </div>
        <div class="current-meta">
          <span>体感 <b>{{ rounded(weather.current.apparentTemperature) }}°</b></span>
          <span>湿度 <b>{{ rounded(weather.current.humidity) }}%</b></span>
          <span>风速 <b>{{ rounded(weather.current.windSpeed) }} {{ windUnit }}</b></span>
        </div>
      </div>

      <div
        v-if="showForecast"
        class="forecast-list"
        :style="{ gridTemplateColumns: `repeat(${forecastDays.length || 1}, minmax(0, 1fr))` }"
      >
        <article v-for="day in forecastDays" :key="day.date">
          <span>{{ dayLabel(day.date) }}</span>
          <i aria-hidden="true">{{ weatherSymbol(day.weatherCode, 1) }}</i>
          <strong>{{ rounded(day.max) }}°</strong>
          <small>{{ rounded(day.min) }}°</small>
          <b v-if="day.precipitationProbability > 0">{{ rounded(day.precipitationProbability) }}%</b>
        </article>
      </div>

      <footer class="weather-foot">
        <span>{{ updatedLabel }}</span>
        <small>天气数据 · Open-Meteo</small>
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDesktopCanvasStore } from '@/stores/desktopCanvas'
import type { DesktopWidget } from '@/types/desktopWidget'

interface GeocodingResponse {
  results?: Array<{
    name: string
    latitude: number
    longitude: number
    country?: string
    admin1?: string
  }>
}

interface WeatherResponse {
  timezone?: string
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    relative_humidity_2m?: number
    weather_code?: number
    wind_speed_10m?: number
    is_day?: number
    time?: string
  }
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
  }
}

interface WeatherDay {
  date: string
  weatherCode: number
  max: number
  min: number
  precipitationProbability: number
}

interface WeatherViewModel {
  current: {
    temperature: number
    apparentTemperature: number
    humidity: number
    weatherCode: number
    windSpeed: number
    isDay: number
    time: string
  }
  daily: WeatherDay[]
}

interface ResolvedLocation {
  query: string
  latitude: number
  longitude: number
  label: string
}

const props = defineProps<{ widget: DesktopWidget }>()
const canvas = useDesktopCanvasStore()

const locationDraft = ref('')
const editingLocation = ref(false)
const locationInput = ref<HTMLInputElement | null>(null)
const setupError = ref('')
const loading = ref(false)
const error = ref('')
const weather = ref<WeatherViewModel | null>(null)
const locationLabel = ref('')
const resolvedLocation = ref<ResolvedLocation | null>(null)
const lastUpdatedAt = ref(0)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let requestId = 0

const configuredLocation = computed(() => (
  typeof props.widget.config.weatherLocation === 'string'
    ? props.widget.config.weatherLocation.trim().slice(0, 80)
    : ''
))

const temperatureUnit = computed(() => (
  props.widget.config.weatherTemperatureUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius'
))

const showForecast = computed(() => props.widget.config.weatherShowForecast !== false)

const forecastDayCount = computed(() => {
  const value = props.widget.config.weatherForecastDays
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(4, Math.max(1, Math.round(value)))
    : 4
})

const windUnit = computed(() => temperatureUnit.value === 'fahrenheit' ? 'mph' : 'km/h')

const forecastDays = computed(() => weather.value?.daily.slice(0, forecastDayCount.value) ?? [])

const updatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return '尚未更新'
  const value = new Date(lastUpdatedAt.value)
  return `${value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 更新`
})

function finiteOr(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function rounded(value: number): number {
  return Math.round(value)
}

function weatherText(code: number): string {
  if (code === 0) return '晴'
  if (code === 1) return '大部晴朗'
  if (code === 2) return '局部多云'
  if (code === 3) return '阴'
  if (code === 45 || code === 48) return '雾'
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨'
  if ([61, 63, 65, 66, 67].includes(code)) return '雨'
  if ([71, 73, 75, 77].includes(code)) return '雪'
  if ([80, 81, 82].includes(code)) return '阵雨'
  if ([85, 86].includes(code)) return '阵雪'
  if ([95, 96, 99].includes(code)) return '雷暴'
  return '天气'
}

function weatherSymbol(code: number, isDay: number): string {
  if (code === 0) return isDay ? '☀︎' : '☾'
  if (code === 1) return isDay ? '☀︎' : '☾'
  if (code === 2) return '☁︎'
  if (code === 3) return '☁'
  if (code === 45 || code === 48) return '≋'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☂︎'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄︎'
  if ([95, 96, 99].includes(code)) return 'ϟ'
  return '○'
}

function dayLabel(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  const today = new Date()
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  if (value === todayKey) return '今天'
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)
}

function parseWeather(value: WeatherResponse): WeatherViewModel | null {
  const current = value.current
  const daily = value.daily
  if (!current || !daily?.time?.length) return null

  const days = daily.time.map((date, index): WeatherDay => ({
    date,
    weatherCode: finiteOr(daily.weather_code?.[index]),
    max: finiteOr(daily.temperature_2m_max?.[index]),
    min: finiteOr(daily.temperature_2m_min?.[index]),
    precipitationProbability: finiteOr(daily.precipitation_probability_max?.[index]),
  }))

  return {
    current: {
      temperature: finiteOr(current.temperature_2m),
      apparentTemperature: finiteOr(current.apparent_temperature),
      humidity: finiteOr(current.relative_humidity_2m),
      weatherCode: finiteOr(current.weather_code),
      windSpeed: finiteOr(current.wind_speed_10m),
      isDay: finiteOr(current.is_day, 1),
      time: typeof current.time === 'string' ? current.time : '',
    },
    daily: days,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json() as T
  } finally {
    window.clearTimeout(timeout)
  }
}

async function resolveLocation(query: string): Promise<ResolvedLocation | null> {
  const params = new URLSearchParams({
    name: query,
    count: '1',
    language: 'zh',
    format: 'json',
  })
  const result = await fetchJson<GeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  )
  const first = result.results?.[0]
  if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) return null

  const area = [first.name, first.admin1, first.country]
    .filter((part, index, array): part is string => Boolean(part) && array.indexOf(part) === index)
    .join(' · ')

  return {
    query,
    latitude: first.latitude,
    longitude: first.longitude,
    label: area || query,
  }
}

async function fetchForecast(latitude: number, longitude: number): Promise<WeatherViewModel> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '4',
    temperature_unit: temperatureUnit.value,
    wind_speed_unit: temperatureUnit.value === 'fahrenheit' ? 'mph' : 'kmh',
  })
  const result = await fetchJson<WeatherResponse>(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  )
  const parsed = parseWeather(result)
  if (!parsed) throw new Error('invalid weather response')
  return parsed
}

async function refreshWeather(force = false): Promise<void> {
  const query = configuredLocation.value
  if (!query || loading.value) return
  if (!force && lastUpdatedAt.value && Date.now() - lastUpdatedAt.value < 5 * 60_000) return

  const currentRequest = ++requestId
  loading.value = true
  error.value = ''
  try {
    let location = resolvedLocation.value
    if (!location || location.query !== query) {
      location = await resolveLocation(query)
      if (currentRequest !== requestId) return
      if (!location) {
        resolvedLocation.value = null
        weather.value = null
        locationLabel.value = ''
        error.value = '没有找到这个城市'
        return
      }
      resolvedLocation.value = location
    }

    const nextWeather = await fetchForecast(location.latitude, location.longitude)
    if (currentRequest !== requestId) return

    locationLabel.value = location.label
    weather.value = nextWeather
    lastUpdatedAt.value = Date.now()
  } catch {
    if (currentRequest !== requestId) return
    error.value = weather.value ? '本次更新失败，继续显示上次结果' : '暂时无法获取天气'
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

async function toggleLocationEditor(): Promise<void> {
  if (!configuredLocation.value && editingLocation.value) return
  editingLocation.value = !editingLocation.value
  setupError.value = ''
  if (editingLocation.value) {
    locationDraft.value = configuredLocation.value
    await nextTick()
    locationInput.value?.focus()
  }
}

function saveLocation(): void {
  const value = locationDraft.value.trim().slice(0, 80)
  if (value.length < 2) {
    setupError.value = '请输入至少 2 个字符'
    return
  }

  canvas.updateWidget(props.widget.id, {
    config: {
      ...props.widget.config,
      weatherLocation: value,
    },
  })
  setupError.value = ''
  editingLocation.value = false
}

function handleFocus(): void {
  void refreshWeather(false)
}

function startRefreshTimer(): void {
  if (refreshTimer !== null) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => void refreshWeather(true), 30 * 60_000)
}

watch(
  () => [configuredLocation.value, temperatureUnit.value] as const,
  ([location], previous) => {
    const previousLocation = previous?.[0] ?? ''
    requestId += 1
    weather.value = null
    error.value = ''
    lastUpdatedAt.value = 0
    if (location !== previousLocation) {
      resolvedLocation.value = null
      locationLabel.value = ''
    }
    if (location) {
      locationDraft.value = location
      void refreshWeather(true)
    } else if (previousLocation) {
      editingLocation.value = true
    }
  },
)

onMounted(() => {
  locationDraft.value = configuredLocation.value
  editingLocation.value = !configuredLocation.value
  if (configuredLocation.value) void refreshWeather(true)
  startRefreshTimer()
  window.addEventListener('focus', handleFocus)
})

onBeforeUnmount(() => {
  requestId += 1
  if (refreshTimer !== null) clearInterval(refreshTimer)
  window.removeEventListener('focus', handleFocus)
})
</script>

<style scoped>
.weather-widget{height:100%;min-height:0;display:flex;flex-direction:column;padding:14px;color:var(--text-primary)}
.weather-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.weather-head>span{display:grid;gap:1px;min-width:0}
.weather-head small{font-size:.45rem;letter-spacing:.12em;color:var(--text-tertiary)}
.weather-head strong{max-width:190px;font-size:.78rem;font-weight:720;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.weather-actions{display:flex;align-items:center;gap:4px}
.weather-actions button,.weather-state button{height:27px;min-width:27px;padding:0 8px;border:1px solid var(--glass-border);border-radius:8px;background:var(--btn-bg);color:var(--text-secondary);font:inherit;font-size:.5rem;font-weight:650;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.weather-actions button:hover:not(:disabled),.weather-state button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.weather-actions button:active:not(:disabled),.weather-state button:active{transform:scale(.98)}
.weather-actions button:disabled{opacity:.35;cursor:default}
.weather-actions .location-action{min-width:38px}
.location-editor{min-height:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px}
.location-editor>div{display:grid;gap:3px;text-align:center}
.location-editor strong{font-size:.67rem;font-weight:700}
.location-editor small{font-size:.48rem;line-height:1.45;color:var(--text-tertiary)}
.location-editor label{display:flex;gap:6px}
.location-editor input{min-width:0;flex:1;height:36px;padding:0 10px;border:1px solid var(--glass-border);border-radius:11px;outline:0;background:var(--input-bg);color:var(--text-primary);font:inherit;font-size:.59rem;transition:border-color .3s cubic-bezier(.25,.1,.25,1)}
.location-editor input:focus{border-color:color-mix(in srgb,var(--primary) 35%,var(--glass-border))}
.location-editor label button{height:36px;padding:0 11px;border:1px solid color-mix(in srgb,var(--primary) 20%,var(--glass-border));border-radius:11px;background:color-mix(in srgb,var(--primary) 9%,var(--btn-bg));color:var(--text-primary);font:inherit;font-size:.53rem;font-weight:650;cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.location-editor label button:hover:not(:disabled){background:color-mix(in srgb,var(--primary) 14%,var(--btn-bg));transform:scale(1.02)}
.location-editor label button:active:not(:disabled){transform:scale(.98)}
.location-editor label button:disabled{opacity:.35;cursor:default}
.location-editor>p{margin:0;text-align:center;color:var(--danger);font-size:.49rem}
.current-weather{display:grid;grid-template-columns:62px minmax(0,1fr) auto;align-items:center;gap:10px;padding:7px 2px 12px}
.weather-symbol{display:grid;place-items:center;width:58px;height:58px;border:1px solid var(--glass-border);border-radius:18px;background:color-mix(in srgb,var(--btn-bg) 72%,transparent);font-size:2rem;line-height:1;box-shadow:inset 0 1px 0 rgb(255 255 255 / 10%)}
.temperature{display:grid;gap:1px;min-width:0}
.temperature strong{font-size:2rem;line-height:.95;font-weight:730;letter-spacing:-.055em}
.temperature span{font-size:.55rem;color:var(--text-secondary)}
.current-meta{display:grid;gap:4px;text-align:right;color:var(--text-tertiary)}
.current-meta span{font-size:.46rem;white-space:nowrap}
.current-meta b{font-weight:650;color:var(--text-secondary)}
.forecast-list{display:grid;gap:4px}
.forecast-list article{position:relative;min-width:0;display:grid;place-items:center;gap:2px;padding:7px 3px;border:1px solid var(--glass-border);border-radius:11px;background:color-mix(in srgb,var(--btn-bg) 58%,transparent)}
.forecast-list span{font-size:.43rem;color:var(--text-tertiary)}
.forecast-list i{font-style:normal;font-size:.86rem;line-height:1.2}
.forecast-list strong{font-size:.58rem;font-weight:700}
.forecast-list small{font-size:.45rem;color:var(--text-tertiary)}
.forecast-list b{position:absolute;top:4px;right:4px;font-size:.36rem;font-weight:650;color:var(--text-secondary)}
.weather-foot{display:flex;align-items:end;justify-content:space-between;gap:8px;margin-top:auto;padding:8px 2px 0;color:var(--text-tertiary)}
.weather-foot span,.weather-foot small{font-size:.42rem}
.weather-state{min-height:0;flex:1;display:grid;place-content:center;justify-items:center;gap:6px;text-align:center;padding:12px;color:var(--text-tertiary)}
.weather-state strong{font-size:.62rem;font-weight:650;color:var(--text-secondary)}
.weather-state small{font-size:.45rem}
.weather-spinner{width:18px;height:18px;border:2px solid var(--glass-border);border-top-color:var(--primary);border-radius:50%;animation:weather-spin .9s cubic-bezier(.25,.1,.25,1) infinite}
@keyframes weather-spin{to{transform:rotate(360deg)}}
</style>
