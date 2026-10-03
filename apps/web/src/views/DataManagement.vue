<template>
  <div class="data-page">
    <div class="data-container">
      <router-link to="/app" class="back-link">← 返回工具箱</router-link>
      <h1>数据管理</h1>
      <p class="subtitle">管理您的个人数据和隐私偏好</p>
      <!-- 隐私设置 -->
      <section class="data-section glass-card privacy-section">
        <div class="section-header">
          <div class="section-icon">🛡️</div>
          <div>
            <h2>隐私设置</h2>
            <p>这些设置只保存在当前设备，不上传到服务器，也不会随本地加密备份迁移到其他设备。关闭记录类功能时会立即删除对应的已有历史。</p>
          </div>
        </div>

        <div class="privacy-list">
          <label class="privacy-row">
            <span class="privacy-copy">
              <strong>保留搜索最近项</strong>
              <small>记录您从全局搜索打开过的应用、文件和文件夹，用于“最近使用”。关闭后会清除已有搜索最近项。</small>
            </span>
            <span class="privacy-toggle">
              <input
                type="checkbox"
                :checked="privacyPreferences.rememberSearchRecents"
                @change="onPrivacyToggle('rememberSearchRecents', $event)"
              />
              <span class="privacy-toggle-track"></span>
            </span>
          </label>

          <label class="privacy-row">
            <span class="privacy-copy">
              <strong>使用历史个性化</strong>
              <small>仅在当前设备记录工具/应用使用历史，以及最小化的工具打开与收藏行为事件，用于本地排序与推荐；行为事件在读/写时会淘汰超过 90 天的数据，最多保留 400 条，不上传服务器，也不进入本地备份。关闭后会立即清除这些历史。</small>
            </span>
            <span class="privacy-toggle">
              <input
                type="checkbox"
                :checked="privacyPreferences.usagePersonalization"
                @change="onPrivacyToggle('usagePersonalization', $event)"
              />
              <span class="privacy-toggle-track"></span>
            </span>
          </label>

          <label class="privacy-row">
            <span class="privacy-copy">
              <strong>缓存账户资料到本机</strong>
              <small>允许在当前设备缓存邮箱、显示名称和头像等资料副本，不包含密码。关闭后会立即删除已有资料缓存。</small>
            </span>
            <span class="privacy-toggle">
              <input
                type="checkbox"
                :checked="privacyPreferences.cacheProfileLocally"
                @change="onPrivacyToggle('cacheProfileLocally', $event)"
              />
              <span class="privacy-toggle-track"></span>
            </span>
          </label>

          <div class="privacy-row">
            <span class="privacy-copy">
              <strong>AI Prompt 历史</strong>
              <small>当前版本固定为仅本次会话：Prompt、回答以及工具/文件/Clipboard 上下文都不会持久化。未来若增加本机历史，必须先提供独立的显式授权开关。</small>
            </span>
            <span class="privacy-state-pill">{{ assistantHistoryPolicy.displayLabel }}</span>
          </div>
        </div>

        <div class="privacy-actions">
          <button class="action-btn clear-btn" @click="clearRecordedActivity">
            清除已记录活动
          </button>
          <router-link to="/privacy" class="privacy-policy-link">查看隐私政策</router-link>
        </div>
        <p class="privacy-note">Canvas 便签、待办和文件夹配置属于您主动保存的本地内容，不属于被动使用历史；其完整导出与删除由数据生命周期功能单独管理。</p>
        <p v-if="privacyStatus" class="success-msg">{{ privacyStatus }}</p>
      </section>

      <!-- 数据导出 -->
      <section class="data-section glass-card">
        <div class="section-header">
          <div class="section-icon">📥</div>
          <div>
            <h2>导出服务器数据</h2>
            <p>下载账户在服务器保存的个人资料、自定义工具、收藏、分类、排序和安全会话元数据。导出不包含密码哈希、Token/Token Hash、Embedding，也不包含本设备 Canvas 或搜索历史。</p>
          </div>
        </div>
        <button class="action-btn export-btn" @click="exportData" :disabled="exporting">
          {{ exporting ? '正在导出...' : '导出数据 (JSON)' }}
        </button>
        <p v-if="exportError" class="error-msg">{{ exportError }}</p>
        <p v-if="exportSuccess" class="success-msg">{{ exportSuccess }}</p>
      </section>

      <!-- 本地加密备份 -->
      <section class="data-section glass-card">
        <div class="section-header">
          <div class="section-icon">🔐</div>
          <div>
            <h2>加密备份此设备</h2>
            <p>
              备份本设备的布局、主题、自定义工具缓存、Canvas 便签/待办/文件夹配置、搜索最近项和使用历史。
              备份文件使用密码加密，不包含 Access / Refresh Token、登录 Cookie、客户端实例 ID、Cookie 同意记录或诊断日志。
            </p>
          </div>
        </div>

        <div class="backup-fields">
          <label class="field-label">
            <span>备份密码</span>
            <input
              v-model="backupPassword"
              class="confirm-input"
              type="password"
              autocomplete="new-password"
              placeholder="至少 8 个字符"
            />
          </label>
          <label class="field-label">
            <span>确认密码</span>
            <input
              v-model="backupPasswordConfirm"
              class="confirm-input"
              type="password"
              autocomplete="new-password"
              placeholder="再次输入备份密码"
              @keyup.enter="createLocalBackup"
            />
          </label>
        </div>

        <div class="backup-actions">
          <button
            class="action-btn export-btn"
            :disabled="backingUp"
            @click="createLocalBackup"
          >
            {{ backingUp ? '正在加密...' : '创建加密备份' }}
          </button>
        </div>
        <p class="backup-note">备份密码不会上传或保存。忘记密码后无法恢复该备份。</p>
        <p v-if="backupError" class="error-msg">{{ backupError }}</p>
        <p v-if="backupSuccess" class="success-msg">{{ backupSuccess }}</p>

        <div class="backup-divider"></div>

        <div class="restore-block">
          <h3>恢复本地备份</h3>
          <p>恢复会覆盖当前设备中属于备份白名单的本地数据；当前登录状态和服务器数据保持不变。</p>
          <div class="restore-row">
            <input
              v-model="restorePassword"
              class="confirm-input"
              type="password"
              autocomplete="current-password"
              placeholder="输入备份密码"
              @keyup.enter="selectRestoreFile"
            />
            <button
              class="action-btn clear-btn"
              :disabled="restoring"
              @click="selectRestoreFile"
            >
              {{ restoring ? '正在校验...' : '选择备份文件并恢复' }}
            </button>
          </div>
          <input
            ref="restoreFileInput"
            class="hidden-file-input"
            type="file"
            accept=".json,application/json"
            @change="handleRestoreFile"
          />
          <p v-if="restoreError" class="error-msg">{{ restoreError }}</p>
        </div>
      </section>
      <!-- 本地用户数据清除 -->
      <section class="data-section glass-card">
        <div class="section-header">
          <div class="section-icon">🧽</div>
          <div>
            <h2>清除本地用户数据</h2>
            <p>
              删除当前设备上的自定义工具缓存、Canvas 便签/待办/文件夹配置、搜索最近项、工具/应用使用历史、资料缓存和桌宠临时数据。
              不删除服务器账户，不退出登录，并保留主题/布局、隐私偏好和此设备的客户端实例 ID。
            </p>
          </div>
        </div>
        <button class="action-btn clear-btn" :disabled="clearingLocalUserData" @click="requestClearLocalUserData">
          {{ clearingLocalUserData ? '正在清除...' : '清除本地用户数据' }}
        </button>
        <p v-if="localUserDataStatus" class="success-msg">{{ localUserDataStatus }}</p>
      </section>
      <!-- 数据删除 -->
      <section class="data-section glass-card danger-section">
        <div class="section-header">
          <div class="section-icon">🗑️</div>
          <div>
            <h2>删除账户</h2>
            <p class="danger-text">
              ⚠️ 此操作不可撤销。删除账户后，FlexiKit 会在一个服务器事务中删除当前账户及其关联数据，并使该账户的全部登录会话失效。
              当前设备上的 Canvas、搜索/使用历史、资料缓存等用户数据会同时清除；主题/布局、隐私偏好和设备实例 ID 保留。其他设备上的本地副本无法远程删除，需要在对应设备单独清理。
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
            <h2>重置界面偏好</h2>
            <p>重置主题、布局和网页登录提示记录。不会删除 Canvas、搜索/使用历史、资料缓存、登录凭据或服务器数据。</p>
          </div>
        </div>
        <button class="action-btn clear-btn" @click="clearLocalData">
          重置界面偏好
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

import { usersApi } from '@/api/users'
import { getApiErrorMessage } from '@/api/client'
import { isDesktopRuntime } from '@/api/runtime'
import {
  assertBackupAccountCompatible,
  createEncryptedLocalBackup,
  decryptLocalBackup,
  localBackupFileName,
  restoreLocalBackup,
  type LocalBackupAccount,
  type LocalBackupPayloadV1,
} from '@/utils/localDataBackup'
import {
  clearRecordedActivityData,
  readPrivacyPreferences,
  updatePrivacyPreference,
  type PrivacyPreferenceName,
} from '@/privacy/privacyPreferences'
import { clearLocalUserData } from '@/utils/localDataLifecycle'
import { ASSISTANT_HISTORY_POLICY } from '@/privacy/assistantHistoryPolicy'

const user = useUserStore()
const tools = useToolsStore()
const ui = useUiStore()


const exporting = ref(false)
const exportError = ref('')
const exportSuccess = ref('')
const deleting = ref(false)
const deleteError = ref('')
const deleteConfirmStep = ref(false)
const deleteInput = ref('')
const localCleared = ref('')
const clearingLocalUserData = ref(false)
const localUserDataStatus = ref('')
const backupPassword = ref('')
const backupPasswordConfirm = ref('')
const restorePassword = ref('')
const backingUp = ref(false)
const restoring = ref(false)
const backupError = ref('')
const backupSuccess = ref('')
const restoreError = ref('')
const restoreFileInput = ref<HTMLInputElement | null>(null)
const privacyPreferences = ref(readPrivacyPreferences())
const privacyStatus = ref('')
const assistantHistoryPolicy = ASSISTANT_HISTORY_POLICY

function onPrivacyToggle(name: PrivacyPreferenceName, event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  privacyPreferences.value = updatePrivacyPreference(name, target.checked)
  privacyStatus.value = target.checked
    ? '隐私设置已更新。'
    : '隐私设置已更新，并已清除该功能已有的本地记录。'
  window.setTimeout(() => { privacyStatus.value = '' }, 3500)
}

function clearRecordedActivity() {
  clearRecordedActivityData()
  privacyStatus.value = '搜索最近项、工具/应用使用历史和任何 AI Prompt 历史残留已从当前设备清除。'
  window.setTimeout(() => { privacyStatus.value = '' }, 3500)
}

function currentBackupAccount(): LocalBackupAccount | null {
  if (!user.isLoggedIn || !user.profile) return null
  return {
    id: user.profile.id,
    username: user.profile.username,
  }
}

function downloadJsonFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function createLocalBackup() {
  backingUp.value = true
  backupError.value = ''
  backupSuccess.value = ''

  try {
    const account = currentBackupAccount()
    if (!account) throw new Error('请先登录账户后再创建本地备份')
    if (backupPassword.value !== backupPasswordConfirm.value) {
      throw new Error('两次输入的备份密码不一致')
    }

    const backupJson = await createEncryptedLocalBackup(
      localStorage,
      backupPassword.value,
      {
        runtime: isDesktopRuntime() ? 'desktop' : 'browser',
        account,
      },
    )

    downloadJsonFile(backupJson, localBackupFileName())
    backupPassword.value = ''
    backupPasswordConfirm.value = ''
    backupSuccess.value = '加密备份已创建。请将文件与密码分开妥善保存。'
  } catch (e: unknown) {
    backupError.value = e instanceof Error ? e.message : '创建备份失败'
  } finally {
    backingUp.value = false
  }
}

function selectRestoreFile() {
  restoreError.value = ''
  if (!restorePassword.value) {
    restoreError.value = '请先输入备份密码'
    return
  }
  restoreFileInput.value?.click()
}

function confirmRestore(payload: LocalBackupPayloadV1) {
  ui.openConfirmModal(
    '恢复本地备份',
    '恢复会覆盖当前设备的布局、Canvas、本地工具缓存、搜索最近项与使用历史。登录凭据、Refresh Cookie 和服务器数据不会被修改。恢复完成后页面会自动刷新。',
    () => {
      try {
        const result = restoreLocalBackup(localStorage, payload)
        restorePassword.value = ''
        ui.showToast(`备份已恢复：写入 ${result.restoredKeys} 项，清理 ${result.removedKeys} 项`)
        setTimeout(() => window.location.reload(), 800)
      } catch (e: unknown) {
        restoreError.value = e instanceof Error ? e.message : '恢复备份失败'
      }
    },
  )
}

async function handleRestoreFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  restoring.value = true
  restoreError.value = ''

  try {
    const payload = await decryptLocalBackup(await file.text(), restorePassword.value)
    assertBackupAccountCompatible(payload, currentBackupAccount())
    confirmRestore(payload)
  } catch (e: unknown) {
    restoreError.value = e instanceof Error ? e.message : '备份文件校验失败'
  } finally {
    restoring.value = false
    input.value = ''
  }
}
// 数据导出
async function exportData() {
  exporting.value = true
  exportError.value = ''
  exportSuccess.value = ''

  try {
    if (!user.isLoggedIn) throw new Error('未登录')

    const res = await usersApi.exportData()
    const data = res.data

    downloadJsonFile(
      JSON.stringify(data, null, 2),
      `flexikit_server_data_export_${new Date().toISOString().slice(0, 10)}.json`,
    )

    exportSuccess.value = '数据已导出，请妥善保存文件。'
  } catch (e: unknown) {
    exportError.value = getApiErrorMessage(e, '导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

function requestClearLocalUserData() {
  ui.openConfirmModal(
    '清除本地用户数据',
    '这会永久删除当前设备上的 Canvas、搜索记录、使用历史、资料缓存和本地工具数据，但不会删除服务器账户或退出登录。',
    () => clearLocalUserContent(),
  )
}

function clearLocalUserContent() {
  clearingLocalUserData.value = true
  localUserDataStatus.value = ''

  try {
    const result = clearLocalUserData(localStorage)
    tools.clearUserData()
    localUserDataStatus.value = '已清除 ' + result.removedKeys.length + ' 项本地用户数据，页面即将刷新。'
    ui.showToast('本地用户数据已清除')
    setTimeout(() => window.location.reload(), 800)
  } finally {
    clearingLocalUserData.value = false
  }
}

// 删除账户
async function deleteAccount() {
  if (deleteInput.value !== 'DELETE') return

  deleting.value = true
  deleteError.value = ''

  try {
    if (!user.isLoggedIn) throw new Error('未登录')

    await usersApi.deleteAccount('DELETE')
    await user.logout({ server: false })
    clearLocalUserData(localStorage)
    localStorage.removeItem('gtb-token')

    ui.showToast('账户与当前设备用户数据已删除，即将返回首页')
    setTimeout(() => window.location.assign('/'), 1200)
  } catch (e: unknown) {
    deleteError.value = getApiErrorMessage(e, '删除失败，请稍后重试')
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
  localCleared.value = '界面偏好已重置。刷新页面后生效。'
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

.privacy-list {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.privacy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid var(--divider);
}

.privacy-row:last-child {
  border-bottom: none;
}

.privacy-copy {
  display: grid;
  gap: 5px;
}

.privacy-copy strong {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.privacy-copy small,
.privacy-note {
  color: var(--text-tertiary);
  font-size: 0.78rem;
  line-height: 1.55;
}

.privacy-state-pill {
  flex: 0 0 auto;
  padding: 5px 9px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 650;
  background: var(--btn-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.privacy-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  flex: 0 0 44px;
}

.privacy-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.privacy-toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: 0.2s ease;
}

.privacy-toggle-track::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  transition: 0.2s ease;
}

.privacy-toggle input:checked + .privacy-toggle-track {
  background: var(--accent);
  border-color: var(--accent);
}

.privacy-toggle input:checked + .privacy-toggle-track::after {
  transform: translateX(20px);
}

.privacy-toggle input:focus-visible + .privacy-toggle-track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.privacy-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
  margin-bottom: 10px;
}

.privacy-policy-link {
  color: var(--accent);
  font-size: 0.84rem;
  text-decoration: none;
}

.privacy-policy-link:hover {
  text-decoration: underline;
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

.backup-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.field-label {
  display: grid;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.backup-actions,
.restore-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.backup-note,
.restore-block p {
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 0.8rem;
  line-height: 1.6;
}

.backup-divider {
  height: 1px;
  margin: 22px 0;
  background: var(--divider);
}

.restore-block h3 {
  color: var(--text-primary);
  font-size: 0.96rem;
  margin-bottom: 4px;
}

.restore-row {
  margin-top: 12px;
}

.restore-row .confirm-input {
  min-width: 0;
}

.hidden-file-input {
  display: none;
}
.danger-section {
  border: 1px solid var(--danger-soft);
}

@media (max-width: 640px) {
  .data-page { padding: 20px 14px 60px; }
  h1 { font-size: 1.4rem; }
  .section-header { flex-direction: column; gap: 10px; }
  .confirm-input-row,
  .restore-row { flex-direction: column; align-items: stretch; }
  .backup-fields { grid-template-columns: 1fr; }
}
</style>
