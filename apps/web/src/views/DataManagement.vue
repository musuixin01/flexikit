<template>
  <div class="data-page">
    <div class="data-container">
      <router-link to="/app" class="back-link">← 返回工具箱</router-link>
      <h1>数据管理</h1>
      <p class="subtitle">管理您的个人数据和隐私偏好</p>

      <!-- 数据导出 -->
      <section class="data-section glass-card">
        <div class="section-header">
          <div class="section-icon">📥</div>
          <div>
            <h2>导出我的数据</h2>
            <p>下载您的所有个人数据，包括个人资料、工具、收藏和偏好设置。数据将以 JSON 格式导出。</p>
          </div>
        </div>
        <button class="action-btn export-btn" @click="exportData" :disabled="exporting">
          {{ exporting ? '正在导出...' : '导出数据 (JSON)' }}
        </button>
        <p v-if="exportError" class="error-msg">{{ exportError }}</p>
        <p v-if="exportSuccess" class="success-msg">{{ exportSuccess }}</p>
      </section>

      <!-- 数据删除 -->
      <section class="data-section glass-card danger-section">
        <div class="section-header">
          <div class="section-icon">🗑️</div>
          <div>
            <h2>删除账户</h2>
            <p class="danger-text">
              ⚠️ 此操作不可撤销。删除账户后，您的所有数据（个人资料、自定义工具、收藏、订单）将被永久删除。
              根据隐私政策，数据将在 30 天内完全清除。
            </p>
          </div>
        </div>
        <div class="delete-flow">
          <div v-if="!deleteConfirmStep" class="delete-step-1">
            <button class="action-btn delete-btn" @click="deleteConfirmStep = true">
              删除我的账户
            </button>
          </div>
          <div v-else class="delete-step-2">
            <p class="confirm-text">请输入 <strong>DELETE</strong> 以确认：</p>
            <div class="confirm-input-row">
              <input
                v-model="deleteInput"
                type="text"
                placeholder="输入 DELETE"
                class="confirm-input"
                @keyup.enter="deleteAccount"
              />
              <button
                class="action-btn final-delete-btn"
                :disabled="deleteInput !== 'DELETE' || deleting"
                @click="deleteAccount"
              >
                {{ deleting ? '正在删除...' : '确认删除' }}
              </button>
            </div>
            <button class="cancel-link" @click="deleteConfirmStep = false; deleteInput = ''">
              取消
            </button>
            <p v-if="deleteError" class="error-msg">{{ deleteError }}</p>
          </div>
        </div>
      </section>

      <!-- 本地数据清除 -->
      <section class="data-section glass-card">
        <div class="section-header">
          <div class="section-icon">🧹</div>
          <div>
            <h2>清除本地数据</h2>
            <p>清除浏览器中存储的所有本地数据（主题偏好、布局设置、Cookie 同意记录）。不会影响服务器端数据。</p>
          </div>
        </div>
        <button class="action-btn clear-btn" @click="clearLocalData">
          清除本地数据
        </button>
        <p v-if="localCleared" class="success-msg">{{ localCleared }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToolsStore } from '@/stores/tools'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'

const user = useUserStore()
const tools = useToolsStore()
const ui = useUiStore()
const router = useRouter()

const exporting = ref(false)
const exportError = ref('')
const exportSuccess = ref('')
const deleting = ref(false)
const deleteError = ref('')
const deleteConfirmStep = ref(false)
const deleteInput = ref('')
const localCleared = ref('')

// 数据导出
async function exportData() {
  exporting.value = true
  exportError.value = ''
  exportSuccess.value = ''

  try {
    const token = user.token || localStorage.getItem('gtb-token')
    if (!token) throw new Error('未登录')

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'
    const res = await fetch(`${baseUrl}/api/users/export-data`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || '导出失败')
    }

    const data = await res.json()

    // 下载 JSON 文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flexikit_data_export_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportSuccess.value = '数据已导出，请妥善保存文件。'
  } catch (e: any) {
    exportError.value = e.message || '导出失败，请稍后重试'
  } finally {
    exporting.value = false
  }
}

// 删除账户
async function deleteAccount() {
  if (deleteInput.value !== 'DELETE') return

  deleting.value = true
  deleteError.value = ''

  try {
    const token = user.token || localStorage.getItem('gtb-token')
    if (!token) throw new Error('未登录')

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030'
    const res = await fetch(`${baseUrl}/api/users/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || '删除失败')
    }

    // 清除本地状态
    user.logout()
    tools.resetToBuiltinDefaults()
    ui.resetLayout()
    ui.resetThemeColors()
    localStorage.removeItem('gtb-token')
    localStorage.removeItem('gtb-theme')
    localStorage.removeItem('flexikit-layout')
    localStorage.removeItem('flexikit-theme-settings')
    localStorage.removeItem('flexikit-cookie-consent')

    ui.showToast('账户已删除，即将跳转到首页')
    setTimeout(() => router.push('/'), 1500)
  } catch (e: any) {
    deleteError.value = e.message || '删除失败，请稍后重试'
  } finally {
    deleting.value = false
  }
}

// 清除本地数据
function clearLocalData() {
  localStorage.removeItem('flexikit-layout')
  localStorage.removeItem('flexikit-theme-settings')
  localStorage.removeItem('flexikit-cookie-consent')
  ui.resetLayout()
  ui.resetThemeColors()
  localCleared.value = '本地数据已清除。刷新页面后生效。'
  setTimeout(() => { localCleared.value = '' }, 3000)
}
</script>

<style scoped>
.data-page {
  min-height: 100vh;
  background: var(--body-bg);
  padding: 40px 20px 80px;
}

.data-container {
  max-width: 720px;
  margin: 0 auto;
}

.back-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  display: inline-block;
  margin-bottom: 20px;
  transition: opacity 0.2s;
}
.back-link:hover { opacity: 0.7; }

h1 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 32px;
}

.data-section {
  border-radius: var(--radius-lg, 18px);
  padding: 24px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.section-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.section-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.section-header p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.danger-text {
  color: var(--danger) !important;
}

.action-btn {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.export-btn {
  background: var(--accent);
  color: #fff;
}
.export-btn:hover:not(:disabled) { opacity: 0.88; }
.export-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.delete-btn {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}
.delete-btn:hover {
  background: var(--danger-soft);
}

.final-delete-btn {
  background: var(--danger);
  color: #fff;
}
.final-delete-btn:hover:not(:disabled) { opacity: 0.85; }
.final-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.clear-btn {
  background: var(--btn-bg);
  color: var(--text-secondary);
  border: 1px solid var(--divider);
}
.clear-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--text-primary);
}

.confirm-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.confirm-input-row {
  display: flex;
  gap: 10px;
}

.confirm-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.confirm-input:focus {
  border-color: var(--danger);
}

.cancel-link {
  display: inline-block;
  margin-top: 10px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 0.82rem;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}
.cancel-link:hover { color: var(--text-secondary); }

.error-msg {
  margin-top: 10px;
  color: var(--danger);
  font-size: 0.82rem;
}

.success-msg {
  margin-top: 10px;
  color: var(--success);
  font-size: 0.82rem;
}

.danger-section {
  border: 1px solid var(--danger-soft);
}

@media (max-width: 640px) {
  .data-page { padding: 20px 14px 60px; }
  h1 { font-size: 1.4rem; }
  .section-header { flex-direction: column; gap: 10px; }
  .confirm-input-row { flex-direction: column; }
}
</style>
