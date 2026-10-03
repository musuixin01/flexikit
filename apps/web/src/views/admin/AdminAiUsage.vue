<template>
  <section class="admin-content-card">
    <div class="section-heading">
      <div>
        <span class="section-kicker">AI FINOPS</span>
        <h2>AI Usage & Cost</h2>
        <p>基于 Provider 返回的真实 Token usage 统计，不从 Prompt 字符数推测 Token。</p>
      </div>
      <span class="status-badge">Provider usage 已接入</span>
    </div>

    <div v-if="loading" class="state-card">正在读取 AI 统计状态…</div>
    <div v-else-if="errorMessage" class="state-card error-card" role="alert">{{ errorMessage }}</div>

    <template v-else-if="summary">
      <article class="notice-card">
        <span class="notice-icon" aria-hidden="true">∑</span>
        <div>
          <strong>统计底座已启用</strong>
          <p>{{ summary.message }}</p>
        </div>
      </article>

      <div class="metric-grid">
        <article>
          <span>请求</span>
          <strong>{{ formatNumber(summary.requestCount) }}</strong>
          <small>平台 {{ formatNumber(summary.platformRequestCount) }} · BYOK {{ formatNumber(summary.byokRequestCount) }}</small>
        </article>
        <article>
          <span>总 Token</span>
          <strong>{{ formatNumber(summary.totalTokens) }}</strong>
          <small>输入 {{ formatNumber(summary.inputTokens) }} · 输出 {{ formatNumber(summary.outputTokens) }}</small>
        </article>
        <article>
          <span>平台 Token 成本估算</span>
          <strong>{{ formatUsd(summary.platformEstimatedCostUsd) }}</strong>
          <small>仅平台 Key；不包含 BYOK 用户自付</small>
        </article>
        <article>
          <span>BYOK 用户自付估算</span>
          <strong>{{ formatUsd(summary.byokEstimatedCostUsd) }}</strong>
          <small>仅用于用量观察，不计入平台成本</small>
        </article>
      </div>

      <div class="token-grid">
        <article><span>缓存输入</span><strong>{{ formatNumber(summary.cachedInputTokens) }}</strong></article>
        <article><span>推理 Token</span><strong>{{ formatNumber(summary.reasoningTokens) }}</strong></article>
        <article><span>已定价请求</span><strong>{{ formatNumber(summary.pricedRequestCount) }}</strong></article>
        <article><span>未定价请求</span><strong>{{ formatNumber(summary.unpricedRequestCount) }}</strong></article>
      </div>

      <div v-if="summary.requestCount === 0" class="state-card empty-card">
        统计已启用，当前还没有 Provider 调用记录。
      </div>

      <section v-else class="breakdown-card">
        <div class="breakdown-heading">
          <div>
            <span class="section-kicker">BREAKDOWN</span>
            <h3>Provider / 模型</h3>
          </div>
          <small>{{ summary.byProviderModel.length }} 个模型组合</small>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provider / 模型</th>
                <th>请求</th>
                <th>输入</th>
                <th>输出</th>
                <th>总 Token</th>
                <th>成本估算</th>
                <th>未定价</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in summary.byProviderModel" :key="item.providerId + ':' + item.modelId">
                <td><strong>{{ item.providerId }}</strong><small>{{ item.modelId }}</small></td>
                <td>{{ formatNumber(item.requestCount) }}</td>
                <td>{{ formatNumber(item.inputTokens) }}</td>
                <td>{{ formatNumber(item.outputTokens) }}</td>
                <td>{{ formatNumber(item.totalTokens) }}</td>
                <td>{{ formatUsd(item.estimatedCostUsd) }}</td>
                <td>{{ formatNumber(item.unpricedRequestCount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <article class="policy-card">
        <strong>口径说明</strong>
        <p>
          定价目录 {{ summary.pricingCatalogVersion }} · {{ summary.currency }} ·
          {{ summary.costScope === 'token-request-only' ? '仅请求 Token 成本' : summary.costScope }}。
          未识别模型或过期促销价不会猜价，而是计入“未定价请求”。Provider 账单中的工具、搜索、缓存存储或其他非 Token 费用不在本页估算中。
        </p>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi, type AdminAiUsageSummary } from '@/api/admin'
import { getApiErrorMessage } from '@/api/client'

const summary = ref<AdminAiUsageSummary | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const numberFormatter = new Intl.NumberFormat('zh-CN')

async function loadStatus(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    summary.value = (await adminApi.getAiUsageStatus()).data
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, 'AI Usage 统计读取失败')
  } finally {
    loading.value = false
  }
}

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatUsd(value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '$0.000000'
  return '$' + numeric.toLocaleString('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 12,
  })
}

onMounted(() => {
  void loadStatus()
})
</script>

<style scoped>
.admin-content-card, .state-card, .notice-card, .metric-grid article, .token-grid article, .breakdown-card, .policy-card { border: 1px solid var(--divider); background: var(--glass-bg); box-shadow: 0 8px 30px rgb(0 0 0 / .06), inset 0 1px 0 rgb(255 255 255 / .1); }
.admin-content-card { padding: clamp(18px, 3vw, 28px); border-radius: 24px; }
.section-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 18px; }
.section-kicker { color: var(--primary); font-size: .68rem; font-weight: 800; letter-spacing: .12em; }
.section-heading h2 { margin: 5px 0 0; font-size: 1.45rem; letter-spacing: -.025em; }
.section-heading p, .notice-card p, .policy-card p { margin: 7px 0 0; color: var(--text-tertiary); line-height: 1.65; }
.status-badge { display: inline-flex; min-height: 28px; align-items: center; padding: 0 10px; border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--divider)); border-radius: 999px; background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); font-size: .7rem; font-weight: 800; white-space: nowrap; }
.notice-card { display: flex; gap: 13px; padding: 18px; border-radius: 20px; }
.notice-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 14px; background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); font-size: 1.05rem; font-weight: 800; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.metric-grid article { padding: 16px; border-radius: 20px; transition: transform 300ms cubic-bezier(.25,.1,.25,1); }
.metric-grid article:hover { transform: translateY(-2px); }
.metric-grid span, .metric-grid small { display: block; color: var(--text-tertiary); font-size: .7rem; }
.metric-grid strong { display: block; margin: 9px 0 6px; font-size: clamp(1.25rem, 2.5vw, 1.75rem); letter-spacing: -.04em; }
.token-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.token-grid article { padding: 12px 14px; border-radius: 16px; }
.token-grid span { display: block; color: var(--text-tertiary); font-size: .66rem; }
.token-grid strong { display: block; margin-top: 5px; font-size: .9rem; }
.breakdown-card { margin-top: 12px; padding: 16px; border-radius: 20px; }
.breakdown-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.breakdown-heading h3 { margin: 4px 0 0; font-size: .92rem; }
.breakdown-heading small { color: var(--text-tertiary); font-size: .68rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 720px; }
th, td { padding: 10px 8px; border-top: 1px solid color-mix(in srgb, var(--divider) 75%, transparent); text-align: right; font-size: .7rem; }
th { color: var(--text-tertiary); font-size: .64rem; font-weight: 700; }
th:first-child, td:first-child { text-align: left; }
td strong, td small { display: block; }
td small { margin-top: 3px; color: var(--text-tertiary); }
.policy-card { margin-top: 12px; padding: 15px 17px; border-radius: 18px; }
.policy-card strong { font-size: .76rem; }
.policy-card p { font-size: .7rem; }
.state-card { padding: 16px; border-radius: 16px; color: var(--text-tertiary); }
.empty-card { margin-top: 12px; }
.error-card { border-color: color-mix(in srgb, var(--danger) 24%, var(--divider)); color: var(--danger); }
@media (max-width: 980px) { .metric-grid, .token-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .section-heading { display: grid; } .status-badge { justify-self: start; } .metric-grid, .token-grid { grid-template-columns: 1fr; } }
</style>
