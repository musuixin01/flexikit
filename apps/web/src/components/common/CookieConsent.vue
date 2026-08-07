<template>
  <Transition name="cookie-slide">
    <div v-if="visible" class="cookie-banner glass">
      <div class="cookie-content">
        <div class="cookie-icon">🍪</div>
        <div class="cookie-text">
          <p class="cookie-title">我们使用 Cookie</p>
          <p class="cookie-desc">
            FlexiKit 使用必要的 Cookie 来保证服务正常运行，并使用功能 Cookie 来记住您的偏好。
            详情请参阅我们的
            <router-link to="/privacy" class="cookie-link">隐私政策</router-link>。
          </p>
        </div>
      </div>
      <div class="cookie-actions">
        <button class="cookie-btn cookie-btn-customize" @click="openPanel">
          自定义
        </button>
        <button class="cookie-btn cookie-btn-accept" @click="acceptAll">
          全部接受
        </button>
      </div>

      <!-- 自定义面板 -->
      <div v-if="showPanel" class="cookie-panel">
        <h4>Cookie 偏好设置</h4>
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>必要 Cookie</strong>
            <span>用于用户认证和安全防护，无法禁用。</span>
          </div>
          <label class="toggle disabled">
            <input type="checkbox" checked disabled />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>功能 Cookie</strong>
            <span>记住主题偏好、布局设置、语言选择。</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.functional" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="cookie-option">
          <div class="cookie-option-info">
            <strong>分析 Cookie</strong>
            <span>匿名统计访问量和使用情况，帮助我们改进服务。</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="prefs.analytics" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="cookie-panel-actions">
          <button class="cookie-btn cookie-btn-save" @click="savePrefs">
            保存偏好
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const COOKIE_CONSENT_KEY = 'flexikit-cookie-consent'

interface ConsentPrefs {
  necessary: boolean  // always true
  functional: boolean
  analytics: boolean
  timestamp: number
}

const visible = ref(false)
const showPanel = ref(false)

const prefs = ref<Omit<ConsentPrefs, 'necessary' | 'timestamp'>>({
  functional: true,
  analytics: false,
})

onMounted(() => {
  const saved = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!saved) {
    // 未同意过，显示横幅
    visible.value = true
  } else {
    try {
      const consent: ConsentPrefs = JSON.parse(saved)
      // 超过 365 天重新询问
      if (Date.now() - consent.timestamp > 365 * 24 * 60 * 60 * 1000) {
        visible.value = true
      }
    } catch {
      visible.value = true
    }
  }
})

function saveConsent(consent: ConsentPrefs) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
  visible.value = false
  showPanel.value = false
}

function acceptAll() {
  saveConsent({
    necessary: true,
    functional: true,
    analytics: true,
    timestamp: Date.now(),
  })
}

function savePrefs() {
  saveConsent({
    necessary: true,
    functional: prefs.value.functional,
    analytics: prefs.value.analytics,
    timestamp: Date.now(),
  })
}

function openPanel() {
  showPanel.value = !showPanel.value
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: 560px;
  width: calc(100% - 40px);
  border-radius: var(--radius-lg, 18px);
  padding: 20px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.cookie-content {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.cookie-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.cookie-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.cookie-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.cookie-link {
  color: var(--accent);
  text-decoration: underline;
}

.cookie-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cookie-btn {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.cookie-btn-accept {
  background: var(--accent);
  color: #fff;
}
.cookie-btn-accept:hover {
  opacity: 0.88;
}

.cookie-btn-customize {
  background: var(--btn-bg);
  color: var(--text-secondary);
  border: 1px solid var(--divider);
}
.cookie-btn-customize:hover {
  background: var(--btn-bg-hover);
  color: var(--text-primary);
}

/* 自定义面板 */
.cookie-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

.cookie-panel h4 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 14px;
  color: var(--text-primary);
}

.cookie-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.cookie-option-info strong {
  display: block;
  font-size: 0.82rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.cookie-option-info span {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: 24px;
  transition: 0.25s;
  border: 1px solid var(--border);
}

.toggle-slider::before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle input:checked + .toggle-slider {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle.disabled .toggle-slider {
  cursor: not-allowed;
}

.cookie-panel-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.cookie-btn-save {
  background: var(--accent);
  color: #fff;
}
.cookie-btn-save:hover {
  opacity: 0.88;
}

/* 动画 */
.cookie-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}
.cookie-slide-leave-active {
  transition: all 0.3s ease-in;
}
.cookie-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(60px);
}
.cookie-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(60px);
}

@media (max-width: 640px) {
  .cookie-banner {
    bottom: 10px;
    padding: 16px 18px;
    border-radius: 16px;
  }
  .cookie-actions {
    flex-direction: column;
  }
  .cookie-btn {
    width: 100%;
  }
}
</style>
