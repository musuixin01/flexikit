<template>
  <section class="section-card account-panel byok-panel">
    <div class="byok-header">
      <div>
        <div class="byok-title-row">
          <h3 class="section-title">AI API Key</h3>
          <span class="byok-badge">BYOK</span>
        </div>
        <p class="byok-description">
          使用你自己的模型额度。已保存的 Key 不会在页面中回显。
        </p>
      </div>
      <span class="storage-badge">
        {{ desktopRuntime ? 'Windows DPAPI' : '仅当前运行期' }}
      </span>
    </div>

    <div class="provider-list">
      <article
        v-for="provider in providers"
        :key="provider.id"
        class="provider-row"
        :class="{ configured: configured[provider.id] }"
      >
        <div class="provider-mark" aria-hidden="true">
          {{ provider.mark }}
        </div>

        <div class="provider-main">
          <div class="provider-heading">
            <strong>{{ provider.name }}</strong>
            <span
              class="provider-status"
              :class="{ active: configured[provider.id] }"
            >
              {{ configured[provider.id] ? '已配置' : '未配置' }}
            </span>
          </div>
          <p>{{ provider.description }}</p>

          <div class="credential-controls">
            <input
              v-model="drafts[provider.id]"
              type="password"
              autocomplete="off"
              spellcheck="false"
              :placeholder="configured[provider.id] ? '输入新 Key 可覆盖当前配置' : '粘贴 API Key'"
              :aria-label="`${provider.name} API Key`"
              @keydown.enter.prevent="save(provider.id)"
            >
            <button
              type="button"
              class="save-credential-btn"
              :disabled="busyProvider === provider.id || !drafts[provider.id].trim()"
              @click="save(provider.id)"
            >
              {{ busyProvider === provider.id ? '保存中…' : configured[provider.id] ? '更新' : '保存' }}
            </button>
            <button
              v-if="configured[provider.id]"
              type="button"
              class="remove-credential-btn"
              :disabled="busyProvider === provider.id"
              @click="remove(provider.id, provider.name)"
            >
              删除
            </button>
          </div>
        </div>
      </article>
    </div>

    <p class="byok-security-note">
      <template v-if="desktopRuntime">
        Key 仅以 Windows 当前用户 DPAPI 加密形式保存在本机，不同步到 FlexiKit 数据库。
      </template>
      <template v-else>
        浏览器模式不会持久保存 Key；刷新或关闭页面后需要重新输入。
      </template>
    </p>

    <p v-if="errorMessage" class="byok-error" role="alert">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { isDesktopRuntime } from '@/api/runtime'
import {
  BYOK_PROVIDER_IDS,
  clearByokCredential,
  hasByokCredential,
  storeByokCredential,
  type ByokProviderId,
} from '@/ai/byokCredentialStore'
import { useUiStore } from '@/stores/ui'

interface ProviderPresentation {
  id: ByokProviderId
  name: string
  mark: string
  description: string
}

const providers: readonly ProviderPresentation[] = [
  { id: 'openai', name: 'OpenAI', mark: 'O', description: 'GPT 系列模型' },
  { id: 'gemini', name: 'Google Gemini', mark: 'G', description: 'Gemini 系列模型' },
  { id: 'anthropic', name: 'Anthropic Claude', mark: 'C', description: 'Claude 系列模型' },
]

const ui = useUiStore()
const desktopRuntime = isDesktopRuntime()
const configured = reactive<Record<ByokProviderId, boolean>>({
  openai: false,
  gemini: false,
  anthropic: false,
})
const drafts = reactive<Record<ByokProviderId, string>>({
  openai: '',
  gemini: '',
  anthropic: '',
})
const busyProvider = ref<ByokProviderId | null>(null)
const errorMessage = ref('')

async function refreshStatuses(): Promise<void> {
  errorMessage.value = ''
  try {
    const states = await Promise.all(
      BYOK_PROVIDER_IDS.map(async providerId => [
        providerId,
        await hasByokCredential(providerId),
      ] as const),
    )
    for (const [providerId, state] of states) {
      configured[providerId] = state
    }
  } catch {
    errorMessage.value = '无法读取本机 AI Key 状态，请重新打开此页面后再试。'
  }
}

async function save(providerId: ByokProviderId): Promise<void> {
  if (busyProvider.value || !drafts[providerId].trim()) return

  busyProvider.value = providerId
  errorMessage.value = ''
  try {
    await storeByokCredential(providerId, drafts[providerId])
    drafts[providerId] = ''
    configured[providerId] = true
    ui.showToast('AI API Key 已安全保存')
  } catch {
    errorMessage.value = 'API Key 保存失败，请确认内容有效后重试。'
  } finally {
    busyProvider.value = null
  }
}

async function remove(providerId: ByokProviderId, providerName: string): Promise<void> {
  if (busyProvider.value) return
  if (!window.confirm(`确定删除 ${providerName} 的本机 API Key 吗？`)) return

  busyProvider.value = providerId
  errorMessage.value = ''
  try {
    await clearByokCredential(providerId)
    drafts[providerId] = ''
    configured[providerId] = false
    ui.showToast('AI API Key 已删除')
  } catch {
    errorMessage.value = 'API Key 删除失败，请稍后重试。'
  } finally {
    busyProvider.value = null
  }
}

onMounted(() => {
  void refreshStatuses()
})
</script>

<style scoped>
.byok-panel {
  overflow: hidden;
}

.byok-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.byok-title-row,
.provider-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  margin: 0;
}

.byok-badge,
.storage-badge,
.provider-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 750;
  white-space: nowrap;
}

.byok-badge {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
}

.storage-badge {
  color: var(--text-secondary);
  background: var(--btn-bg);
  border: 1px solid var(--divider);
}

.byok-description,
.byok-security-note,
.provider-main p {
  color: var(--text-tertiary);
  line-height: 1.6;
}

.byok-description {
  margin: 7px 0 0;
  font-size: 0.82rem;
}

.provider-list {
  display: grid;
  gap: 10px;
}

.provider-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--divider);
  border-radius: 20px;
  background: color-mix(in srgb, var(--card-bg) 82%, transparent);
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.04);
  transition:
    transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    border-color 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    background 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

.provider-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--primary) 18%, var(--divider));
}

.provider-row.configured {
  border-color: color-mix(in srgb, var(--primary) 22%, var(--divider));
}

.provider-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 9%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12);
  font-size: 0.86rem;
  font-weight: 800;
}

.provider-main {
  min-width: 0;
}

.provider-main p {
  margin: 4px 0 10px;
  font-size: 0.76rem;
}

.provider-status {
  color: var(--text-tertiary);
  background: var(--btn-bg);
}

.provider-status.active {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 9%, transparent);
}

.credential-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.credential-controls input {
  min-width: 0;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  outline: none;
  background: var(--input-bg, var(--btn-bg));
  color: var(--text-primary);
  font: inherit;
  font-size: 0.78rem;
  transition:
    border-color 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    box-shadow 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

.credential-controls input:focus {
  border-color: color-mix(in srgb, var(--primary) 56%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

.save-credential-btn,
.remove-credential-btn {
  min-height: 38px;
  padding: 0 13px;
  border-radius: 12px;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    opacity 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    background 300ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

.save-credential-btn {
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  background: var(--primary);
  color: white;
}

.remove-credential-btn {
  border: 1px solid var(--divider);
  background: var(--btn-bg);
  color: var(--danger);
}

.save-credential-btn:active:not(:disabled),
.remove-credential-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.save-credential-btn:disabled,
.remove-credential-btn:disabled {
  cursor: default;
  opacity: 0.48;
}

.byok-security-note {
  margin: 13px 0 0;
  font-size: 0.75rem;
}

.byok-error {
  margin: 10px 0 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--danger) 7%, transparent);
  color: var(--danger);
  font-size: 0.76rem;
  line-height: 1.55;
}

@media (max-width: 720px) {
  .byok-header {
    display: grid;
  }

  .storage-badge {
    justify-self: start;
  }

  .credential-controls {
    grid-template-columns: 1fr 1fr;
  }

  .credential-controls input {
    grid-column: 1 / -1;
  }
}
</style>
