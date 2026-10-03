<template>
  <section class="admin-content-card">
    <div class="section-heading">
      <div>
        <span class="section-kicker">PLATFORM</span>
        <h2>平台概览</h2>
        <p>这里只展示后端已经真实存在的数据，不把未采集指标显示成 0。</p>
      </div>
      <button type="button" class="refresh-btn" :disabled="loading" @click="loadOverview">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <div v-if="errorMessage" class="message-card error-card" role="alert">{{ errorMessage }}</div>
    <div v-else-if="loading && !overview" class="message-card">正在读取平台数据…</div>

    <div v-if="overview" class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ formatNumber(metric.value) }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </div>

    <section class="audit-card">
      <div class="audit-heading">
        <div>
          <span class="section-kicker">AUDIT</span>
          <h3>最近管理操作</h3>
        </div>
        <small>只追加审计记录</small>
      </div>
      <div v-if="auditEvents.length === 0" class="audit-empty">暂无管理员写操作记录。</div>
      <div v-else class="audit-list">
        <article v-for="event in auditEvents" :key="event.id" class="audit-row">
          <span class="audit-dot" aria-hidden="true"></span>
          <div class="audit-copy">
            <strong>{{ auditActionLabel(event.action) }}</strong>
            <span>{{ event.actorUsername }} → {{ event.targetUsername || '系统' }}</span>
            <small>{{ auditDetail(event) }} · {{ formatDateTime(event.createdAt) }}</small>
          </div>
        </article>
      </div>
    </section>

    <article class="next-card">
      <div class="next-icon" aria-hidden="true">AI</div>
      <div>
        <strong>AI Usage & Cost 已启用真实统计</strong>
        <p>Token 只采用 Provider 返回的 usage；成本按版本化官方单价估算，平台 Key 与 BYOK 分账，未知模型保持未定价。</p>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  adminApi,
  type AdminAuditEventItem,
  type AdminOverview,
} from '@/api/admin'
import { getApiErrorMessage } from '@/api/client'

const overview = ref<AdminOverview | null>(null)
const auditEvents = ref<AdminAuditEventItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const numberFormatter = new Intl.NumberFormat('zh-CN')

const metrics = computed(() => overview.value
  ? [
      { label: '总用户', value: overview.value.totalUsers, note: '已注册账户' },
      { label: '正常用户', value: overview.value.activeUsers, note: '可正常登录' },
      { label: '管理员', value: overview.value.adminUsers, note: '持久管理员角色' },
      { label: '已暂停', value: overview.value.suspendedUsers, note: '登录已禁用' },
      { label: '近 7 天新增', value: overview.value.newUsersLast7Days, note: '按账户创建时间' },
      { label: '工具记录', value: overview.value.totalTools, note: '当前数据库记录' },
      { label: '收藏记录', value: overview.value.totalFavorites, note: '当前数据库记录' },
      { label: '有效会话', value: overview.value.activeSessions, note: '未撤销且未过期' },
    ]
  : [])

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function auditActionLabel(action: string): string {
  if (action === 'user.status.changed') return '账号状态变更'
  if (action === 'user.role.changed') return '管理员角色变更'
  return action
}

function auditDetail(event: AdminAuditEventItem): string {
  if (event.action === 'user.status.changed') {
    return `${String(event.metadata.previousStatus ?? '-') } → ${String(event.metadata.nextStatus ?? '-')}`
  }
  if (event.action === 'user.role.changed') {
    return `${String(event.metadata.previousRole ?? '-') } → ${String(event.metadata.nextRole ?? '-')}`
  }
  return event.accessMode === 'bootstrap-admin' ? '引导管理员操作' : '持久管理员操作'
}

async function loadOverview(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    const [overviewResponse, auditResponse] = await Promise.all([
      adminApi.getOverview(),
      adminApi.listAuditEvents({ page: 1, pageSize: 8 }),
    ])
    overview.value = overviewResponse.data
    auditEvents.value = auditResponse.data.items
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '平台概览读取失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<style scoped>
.admin-content-card, .metric-card, .next-card, .message-card, .audit-card { border: 1px solid var(--divider); background: var(--glass-bg); box-shadow: 0 8px 30px rgb(0 0 0 / .06), inset 0 1px 0 rgb(255 255 255 / .1); }
.admin-content-card { padding: clamp(18px, 3vw, 28px); border-radius: 24px; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 18px; }
.section-kicker { color: var(--primary); font-size: .68rem; font-weight: 800; letter-spacing: .12em; }
.section-heading h2 { margin: 5px 0 0; font-size: 1.45rem; letter-spacing: -.025em; }
.section-heading p, .next-card p { margin: 7px 0 0; color: var(--text-tertiary); line-height: 1.65; }
.refresh-btn { min-height: 38px; padding: 0 13px; border: 1px solid var(--divider); border-radius: 12px; background: var(--btn-bg); color: var(--text-primary); font: inherit; font-size: .76rem; font-weight: 700; cursor: pointer; transition: transform 300ms cubic-bezier(.25,.1,.25,1), opacity 300ms cubic-bezier(.25,.1,.25,1); }
.refresh-btn:active:not(:disabled) { transform: scale(.98); }
.refresh-btn:disabled { opacity: .5; cursor: default; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.metric-card { padding: 16px; border-radius: 20px; transition: transform 300ms cubic-bezier(.25,.1,.25,1); }
.metric-card:hover { transform: translateY(-2px); }
.metric-card span, .metric-card small { display: block; color: var(--text-tertiary); font-size: .72rem; }
.metric-card strong { display: block; margin: 10px 0 7px; font-size: clamp(1.45rem, 3vw, 2rem); letter-spacing: -.04em; }
.audit-card { margin-top: 12px; padding: 16px; border-radius: 20px; }
.audit-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
.audit-heading h3 { margin: 4px 0 0; font-size: .92rem; }
.audit-heading small, .audit-empty { color: var(--text-tertiary); font-size: .7rem; }
.audit-list { display: grid; }
.audit-row { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: flex-start; padding: 10px 0; border-top: 1px solid color-mix(in srgb, var(--divider) 75%, transparent); }
.audit-row:first-child { border-top: 0; }
.audit-dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 999px; background: var(--primary); box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary) 8%, transparent); }
.audit-copy strong, .audit-copy span, .audit-copy small { display: block; }
.audit-copy strong { font-size: .75rem; }
.audit-copy span { margin-top: 3px; color: var(--text-secondary); font-size: .7rem; }
.audit-copy small { margin-top: 3px; color: var(--text-tertiary); font-size: .66rem; }
.audit-empty { padding: 10px 0; line-height: 1.6; }
.next-card { display: flex; align-items: flex-start; gap: 13px; margin-top: 12px; padding: 17px; border-radius: 20px; }
.next-icon { width: 40px; height: 40px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 13px; background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); font-size: .7rem; font-weight: 900; }
.message-card { margin-bottom: 12px; padding: 14px 16px; border-radius: 16px; color: var(--text-secondary); line-height: 1.6; }
.error-card { border-color: color-mix(in srgb, var(--danger) 24%, var(--divider)); color: var(--danger); }
@media (max-width: 980px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .section-heading { display: grid; } .refresh-btn { justify-self: start; } .metric-grid { grid-template-columns: 1fr; } }
</style>
