<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="uiStore.settingsPanelOpen" class="settings-overlay" @click="uiStore.closeSettingsPanel()">
        <div class="settings-panel glass" @click.stop>
          <div class="settings-header">
            <h3>外观与布局设置</h3>
            <button class="close-btn" @click="uiStore.closeSettingsPanel()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="settings-content">
            <!-- 主题模式 -->
            <section class="settings-section">
              <h4>主题模式</h4>
              <div class="theme-mode-buttons">
                <button
                  v-for="mode in themeModes"
                  :key="mode.value"
                  :class="['mode-btn', { active: uiStore.theme === mode.value }]"
                  @click="uiStore.setTheme(mode.value)"
                >
                  <component :is="mode.icon" />
                  <span>{{ mode.label }}</span>
                </button>
              </div>
            </section>

            <!-- 主题色 -->
            <section class="settings-section">
              <h4>主题色</h4>
              <div class="color-picker-row">
                <div
                  v-for="color in PRESET_PRIMARY_COLORS"
                  :key="color.value"
                  :class="['color-dot', { active: uiStore.themeSettings.primaryColor === color.value }]"
                  :style="{ background: color.value }"
                  :title="color.name"
                  @click="uiStore.setPrimaryColor(color.value)"
                >
                  <svg v-if="uiStore.themeSettings.primaryColor === color.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <label class="custom-color-btn" :style="{ background: uiStore.themeSettings.primaryColor }">
                  <input
                    type="color"
                    :value="uiStore.themeSettings.primaryColor"
                    @input="(e) => uiStore.setPrimaryColor((e.target as HTMLInputElement).value)"
                    class="hidden-color-input"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </label>
              </div>
            </section>

            <!-- 按钮背景色 -->
            <section class="settings-section">
              <h4>按钮背景色</h4>
              <div class="color-picker-row">
                <div
                  :class="['color-dot', { active: !uiStore.themeSettings.customButtonBg }]"
                  title="默认（跟随主题）"
                  @click="uiStore.resetButtonBgColor()"
                >
                  <svg v-if="!uiStore.themeSettings.customButtonBg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div
                  v-for="color in PRESET_PRIMARY_COLORS"
                  :key="'btn-' + color.value"
                  :class="['color-dot', { active: uiStore.themeSettings.customButtonBg && uiStore.themeSettings.buttonBgColor === color.value }]"
                  :style="{ background: color.value }"
                  :title="color.name"
                  @click="uiStore.setButtonBgColor(color.value)"
                >
                  <svg v-if="uiStore.themeSettings.customButtonBg && uiStore.themeSettings.buttonBgColor === color.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <label class="custom-color-btn" :style="{ background: uiStore.themeSettings.customButtonBg ? uiStore.themeSettings.buttonBgColor : 'var(--text-tertiary)' }">
                  <input
                    type="color"
                    :value="uiStore.themeSettings.customButtonBg ? uiStore.themeSettings.buttonBgColor : '#6366f1'"
                    @input="(e) => uiStore.setButtonBgColor((e.target as HTMLInputElement).value)"
                    class="hidden-color-input"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </label>
              </div>
            </section>

            <!-- 标签背景色 -->
            <section class="settings-section">
              <h4>标签背景色</h4>
              <div class="color-picker-row">
                <div
                  :class="['color-dot', { active: !uiStore.themeSettings.customTagBg }]"
                  title="默认（跟随主题）"
                  @click="uiStore.resetTagBgColor()"
                >
                  <svg v-if="!uiStore.themeSettings.customTagBg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div
                  v-for="color in PRESET_PRIMARY_COLORS"
                  :key="'tag-' + color.value"
                  :class="['color-dot', { active: uiStore.themeSettings.customTagBg && uiStore.themeSettings.tagBgColor === color.value }]"
                  :style="{ background: color.value }"
                  :title="color.name"
                  @click="uiStore.setTagBgColor(color.value)"
                >
                  <svg v-if="uiStore.themeSettings.customTagBg && uiStore.themeSettings.tagBgColor === color.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <label class="custom-color-btn" :style="{ background: uiStore.themeSettings.customTagBg ? uiStore.themeSettings.tagBgColor : 'var(--text-tertiary)' }">
                  <input
                    type="color"
                    :value="uiStore.themeSettings.customTagBg ? uiStore.themeSettings.tagBgColor : '#6366f1'"
                    @input="(e) => uiStore.setTagBgColor((e.target as HTMLInputElement).value)"
                    class="hidden-color-input"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 5v14M5 12h16"/>
                  </svg>
                </label>
              </div>
            </section>

            <!-- 图标容器背景色 -->
            <section class="settings-section">
              <h4>图标容器背景色</h4>
              <div class="color-picker-row">
                <div
                  :class="['color-dot', { active: !uiStore.themeSettings.customIconBg }]"
                  title="默认（跟随主题）"
                  @click="uiStore.resetIconBgColor()"
                >
                  <svg v-if="!uiStore.themeSettings.customIconBg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div
                  v-for="color in PRESET_PRIMARY_COLORS"
                  :key="'icon-' + color.value"
                  :class="['color-dot', { active: uiStore.themeSettings.customIconBg && uiStore.themeSettings.iconBgColor === color.value }]"
                  :style="{ background: color.value }"
                  :title="color.name"
                  @click="uiStore.setIconBgColor(color.value)"
                >
                  <svg v-if="uiStore.themeSettings.customIconBg && uiStore.themeSettings.iconBgColor === color.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <label class="custom-color-btn" :style="{ background: uiStore.themeSettings.customIconBg ? uiStore.themeSettings.iconBgColor : 'var(--text-tertiary)' }">
                  <input
                    type="color"
                    :value="uiStore.themeSettings.customIconBg ? uiStore.themeSettings.iconBgColor : '#6366f1'"
                    @input="(e) => uiStore.setIconBgColor((e.target as HTMLInputElement).value)"
                    class="hidden-color-input"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 5v14M5 12h16"/>
                  </svg>
                </label>
              </div>
            </section>

            <!-- 卡片大小 -->
            <section class="settings-section">
              <h4>卡片大小</h4>
              <div class="size-buttons">
                <button
                  v-for="size in cardSizes"
                  :key="size.value"
                  :class="['size-btn', { active: uiStore.layout.cardSize === size.value }]"
                  @click="uiStore.setCardSize(size.value)"
                >
                  {{ size.label }}
                </button>
              </div>
            </section>

            <!-- 网格列数 -->
            <section class="settings-section">
              <h4>网格列数: {{ uiStore.layout.gridColumns }} 列</h4>
              <input
                type="range"
                min="3"
                max="6"
                step="1"
                :value="uiStore.layout.gridColumns"
                @input="(e) => uiStore.setGridColumns(Number((e.target as HTMLInputElement).value))"
                class="slider"
              >
              <div class="slider-labels">
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </section>

            <!-- 侧边栏位置 -->
            <section class="settings-section">
              <h4>侧边栏位置</h4>
              <div class="position-buttons">
                <button
                  :class="['position-btn', { active: uiStore.layout.sidebarPosition === 'left' }]"
                  @click="uiStore.setSidebarPosition('left')"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <rect x="3" y="3" width="6" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/>
                  </svg>
                  <span>左侧</span>
                </button>
                <button
                  :class="['position-btn', { active: uiStore.layout.sidebarPosition === 'right' }]"
                  @click="uiStore.setSidebarPosition('right')"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <rect x="15" y="3" width="6" height="18" rx="2" fill="currentColor" fill-opacity="0.2"/>
                  </svg>
                  <span>右侧</span>
                </button>
              </div>
            </section>

            <!-- 毛玻璃效果 -->
            <section class="settings-section">
              <h4>毛玻璃效果: {{ Math.round(uiStore.layout.glassIntensity * 100) }}%</h4>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                :value="uiStore.layout.glassIntensity"
                @input="(e) => uiStore.setGlassIntensity(Number((e.target as HTMLInputElement).value))"
                class="slider"
              >
              <div class="slider-labels">
                <span>清晰</span>
                <span>磨砂</span>
              </div>
            </section>

            <!-- 圆角大小 -->
            <section class="settings-section">
              <h4>圆角大小: {{ uiStore.layout.borderRadius }}px</h4>
              <input
                type="range"
                min="8"
                max="24"
                step="2"
                :value="uiStore.layout.borderRadius"
                @input="(e) => uiStore.setBorderRadius(Number((e.target as HTMLInputElement).value))"
                class="slider"
              >
              <div class="slider-labels">
                <span>直角</span>
                <span>圆润</span>
              </div>
            </section>

            <!-- 重置按钮 -->
            <section class="settings-section">
              <button class="reset-btn" @click="resetAll">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                恢复默认设置
              </button>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useUiStore, PRESET_PRIMARY_COLORS } from '@/stores/ui'

const uiStore = useUiStore()

// 主题模式图标
const SunIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 5 }),
  h('path', { d: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' }),
])

const MoonIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }),
])

const AutoIcon = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
  h('path', { d: 'M3 12h18M12 3v18' }),
])

const themeModes = [
  { value: 'light' as const, label: '浅色', icon: SunIcon },
  { value: 'dark' as const, label: '深色', icon: MoonIcon },
  { value: 'auto' as const, label: '跟随系统', icon: AutoIcon },
]

const cardSizes = [
  { value: 'small' as const, label: '小' },
  { value: 'medium' as const, label: '中' },
  { value: 'large' as const, label: '大' },
]

function resetAll() {
  uiStore.resetLayout()
  uiStore.resetThemeColors()
  uiStore.setTheme('auto')
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.settings-panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

:global(.dark) .settings-panel {
  background: var(--glass-bg-dark);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--btn-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s cubic-bezier(0.25,0.1,0.25,1.0);
}

.close-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--text-primary);
  transform: scale(1.05);
}

.settings-content {
  padding: 20px 24px;
}

.settings-section {
  margin-bottom: 28px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 主题模式按钮 */
.theme-mode-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.mode-btn:hover {
  background: var(--bg-hover);
}

.mode-btn.active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

/* 颜色选择 */
.color-picker-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-dot:hover {
  transform: scale(1.1);
}

.color-dot.active {
  border-color: white;
  box-shadow: 0 0 0 2px var(--primary);
}

.custom-color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px dashed rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
}

.custom-color-btn:hover {
  transform: scale(1.1);
}

.hidden-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* 大小按钮 */
.size-buttons, .position-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.position-buttons {
  grid-template-columns: repeat(2, 1fr);
}

.size-btn, .position-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.size-btn:hover, .position-btn:hover {
  background: var(--bg-hover);
}

.size-btn.active, .position-btn.active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

/* 滑块 */
.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 重置按钮 */
.reset-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.reset-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--danger);
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-enter-active .settings-panel,
.fade-leave-active .settings-panel {
  transition: transform 0.2s ease;
}

.fade-enter-from .settings-panel,
.fade-leave-to .settings-panel {
  transform: scale(0.95) translateY(10px);
}
</style>
