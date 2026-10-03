<template>
  <section class="admin-content-card">
    <div class="section-heading">
      <div>
        <span class="section-kicker">ACCOUNTS</span>
        <h2>用户</h2>
        <p>管理账号状态与管理员角色。密码、Token、BYOK Key 和私人内容不会出现在这里。</p>
      </div>
      <input
        v-model="search"
        class="search-input"
        type="search"
        autocomplete="off"
        placeholder="搜索用户名、邮箱或昵称"
        aria-label="搜索用户"
        @input="scheduleSearch"
      >
    </div>

    <div v-if="errorMessage" class="error-card" role="alert">{{ errorMessage }}</div>
    <div v-if="successMessage" class="success-card global-success" role="status">{{ successMessage }}</div>

    <div class="users-layout">
      <div class="users-list-card">
        <div class="list-header">
          <span>{{ pagination.total }} 个账户</span>
          <span>第 {{ pagination.totalPages === 0 ? 0 : pagination.page }} / {{ pagination.totalPages }} 页</span>
        </div>

        <div v-if="loading" class="empty-state">正在读取用户…</div>
        <div v-else-if="users.length === 0" class="empty-state">没有找到符合条件的用户。</div>
        <template v-else>
          <button
            v-for="user in users"
            :key="user.id"
            type="button"
            class="user-row"
            :class="{ selected: selectedUserId === user.id }"
            @click="loadUserDetail(user.id)"
          >
            <span class="user-avatar">{{ userInitial(user) }}</span>
            <span class="user-copy">
              <strong>{{ user.displayName || user.username }}</strong>
              <small>@{{ user.username }} · {{ user.email }}</small>
              <span class="badge-row">
                <span class="mini-badge" :class="user.role">{{ roleLabel(user.role) }}</span>
                <span class="mini-badge" :class="user.status">{{ accountStatusLabel(user.status) }}</span>
              </span>
            </span>
            <span class="user-meta">
              <small>#{{ user.id }}</small>
              <small>{{ formatDate(user.createdAt) }}</small>
            </span>
          </button>
        </template>

        <div class="pagination-bar">
          <button
            type="button"
            :disabled="loading || pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >
            上一页
          </button>
          <button
            type="button"
            :disabled="loading || pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <aside class="user-detail-card">
        <div v-if="detailLoading" class="empty-state">正在读取用户详情…</div>
        <div v-else-if="!selectedUser" class="empty-state">选择一个用户查看安全账户详情。</div>

        <template v-else>
          <div class="detail-profile">
            <span class="detail-avatar">{{ userInitial(selectedUser) }}</span>
            <div>
              <strong>{{ selectedUser.displayName || selectedUser.username }}</strong>
              <small>@{{ selectedUser.username }}</small>
              <span class="badge-row">
                <span class="mini-badge" :class="selectedUser.role">{{ roleLabel(selectedUser.role) }}</span>
                <span class="mini-badge" :class="selectedUser.status">{{ accountStatusLabel(selectedUser.status) }}</span>
              </span>
            </div>
          </div>

          <dl class="detail-list">
            <div><dt>用户 ID</dt><dd>{{ selectedUser.id }}</dd></div>
            <div><dt>邮箱</dt><dd>{{ selectedUser.email }}</dd></div>
            <div><dt>注册时间</dt><dd>{{ formatDateTime(selectedUser.createdAt) }}</dd></div>
          </dl>

          <div class="detail-metrics">
            <div><strong>{{ selectedUser.toolCount }}</strong><span>工具</span></div>
            <div><strong>{{ selectedUser.favoriteCount }}</strong><span>收藏</span></div>
            <div><strong>{{ selectedUser.activeSessionCount }}</strong><span>有效会话</span></div>
          </div>

          <div class="management-section">
            <div class="management-heading">
              <div>
                <strong>账号管理</strong>
                <small>服务端权限控制，所有变更都会进入管理员审计。</small>
              </div>
            </div>

            <div class="management-actions">
              <button
                v-if="canChangeSelectedStatus"
                type="button"
                class="manage-btn"
                :class="{ danger: selectedUser.status === 'active' }"
                :disabled="actionLoading"
                @click="requestStatusChange"
              >
                {{ selectedUser.status === 'active' ? '暂停账号' : '恢复账号' }}
              </button>
              <button
                v-if="canChangeSelectedRole"
                type="button"
                class="manage-btn"
                :disabled="actionLoading"
                @click="requestRoleChange"
              >
                {{ selectedUser.role === 'admin' ? '撤销管理员' : '设为管理员' }}
              </button>
              <button
                v-if="canDeleteSelected"
                type="button"
                class="manage-btn danger"
                :disabled="actionLoading"
                @click="requestDeleteUser"
              >
                删除账号
              </button>
              <span
                v-if="!canChangeSelectedStatus && !canChangeSelectedRole && !canDeleteSelected"
                class="management-note"
              >
                当前账号没有可执行的管理操作。
              </span>
            </div>

            <div v-if="pendingAction" class="confirm-card">
              <div>
                <strong>{{ pendingAction.title }}</strong>
                <p>{{ pendingAction.message }}</p>
              </div>
              <div class="confirm-actions">
                <button
                  type="button"
                  class="manage-btn"
                  :disabled="actionLoading"
                  @click="pendingAction = null"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="manage-btn confirm"
                  :class="{ danger: pendingAction.danger }"
                  :disabled="actionLoading"
                  @click="confirmPendingAction"
                >
                  {{ actionLoading ? '处理中…' : '确认' }}
                </button>
              </div>
            </div>

            <div v-if="deleteConfirmationOpen" class="delete-confirm-card">
              <strong>永久删除 @{{ selectedUser.username }}</strong>
              <p>
                此操作不可恢复。该账号的登录会话、工具、分类、收藏和相关账户数据会被事务化清理。
                请输入完整用户名 <b>{{ selectedUser.username }}</b> 继续。
              </p>
              <input
                v-model="deleteConfirmationUsername"
                class="delete-confirm-input"
                type="text"
                autocomplete="off"
                :placeholder="selectedUser.username"
                :disabled="actionLoading"
                aria-label="输入用户名确认删除"
                @keyup.enter="confirmDeleteUser"
              >
              <div class="confirm-actions">
                <button
                  type="button"
                  class="manage-btn"
                  :disabled="actionLoading"
                  @click="cancelDeleteConfirmation"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="manage-btn danger"
                  :disabled="actionLoading || deleteConfirmationUsername !== selectedUser.username"
                  @click="confirmDeleteUser"
                >
                  {{ actionLoading ? '删除中…' : '永久删除账号' }}
                </button>
              </div>
            </div>
          </div>

          <div class="session-section">
            <div class="session-heading">
              <strong>最近设备 / 会话</strong>
              <span>{{ selectedUser.sessionCount }} 条</span>
            </div>
            <div v-if="selectedUser.recentSessions.length === 0" class="session-empty">暂无会话记录。</div>
            <div
              v-for="(session, index) in selectedUser.recentSessions"
              v-else
              :key="`${session.clientType}-${session.createdAt}-${index}`"
              class="session-row"
            >
              <span class="session-dot" :class="session.status"></span>
              <div>
                <strong>{{ session.clientName || session.clientType }}</strong>
                <small>{{ session.lastUsedAt ? `最近 ${formatDateTime(session.lastUsedAt)}` : `创建 ${formatDateTime(session.createdAt)}` }}</small>
              </div>
              <span class="session-status">{{ sessionStatusLabel(session.status) }}</span>
            </div>
          </div>
        </template>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  adminApi,
  type AdminAccess,
  type AdminUserDetail,
  type AdminUserListItem,
  type AdminUserRole,
  type AdminUserStatus,
} from '@/api/admin'
import { getApiErrorMessage } from '@/api/client'

const users = ref<AdminUserListItem[]>([])
const selectedUser = ref<AdminUserDetail | null>(null)
const selectedUserId = ref<number | null>(null)
const search = ref('')
const loading = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const access = ref<AdminAccess | null>(null)
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const deleteConfirmationOpen = ref(false)
const deleteConfirmationUsername = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

interface PendingAdminAction {
  kind: 'status' | 'role'
  value: AdminUserStatus | AdminUserRole
  title: string
  message: string
  danger: boolean
}

const pendingAction = ref<PendingAdminAction | null>(null)
const canWriteStatus = computed(
  () => access.value?.permissions.includes('admin.users.status.write') ?? false,
)
const canWriteRole = computed(
  () => access.value?.permissions.includes('admin.users.role.write') ?? false,
)
const canWriteDelete = computed(
  () => access.value?.permissions.includes('admin.users.delete.write') ?? false,
)
const canChangeSelectedStatus = computed(() => {
  const selected = selectedUser.value
  const currentAccess = access.value
  if (!selected || !currentAccess || !canWriteStatus.value) return false
  if (selected.id === currentAccess.userId) return false
  if (selected.role === 'admin' && currentAccess.accessMode !== 'bootstrap-admin') return false
  return true
})
const canChangeSelectedRole = computed(() => {
  const selected = selectedUser.value
  const currentAccess = access.value
  if (!selected || !currentAccess || !canWriteRole.value) return false
  if (selected.id === currentAccess.userId && selected.role === 'admin') return false
  return true
})
const canDeleteSelected = computed(() => {
  const selected = selectedUser.value
  const currentAccess = access.value
  if (!selected || !currentAccess || !canWriteDelete.value) return false
  if (selected.id === currentAccess.userId) return false
  if (selected.role === 'admin') return false
  return true
})

function userInitial(user: Pick<AdminUserListItem, 'displayName' | 'username'>): string {
  return (user.displayName || user.username).trim().slice(0, 1).toUpperCase() || 'U'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function sessionStatusLabel(status: 'active' | 'revoked' | 'expired'): string {
  if (status === 'active') return '有效'
  if (status === 'revoked') return '已撤销'
  return '已过期'
}

function roleLabel(role: AdminUserRole): string {
  return role === 'admin' ? '管理员' : '普通用户'
}

function accountStatusLabel(status: AdminUserStatus): string {
  return status === 'active' ? '正常' : '已暂停'
}

async function loadAccess(): Promise<void> {
  try {
    access.value = await adminApi.checkAccess()
  } catch {
    access.value = null
  }
}

async function loadUsers(page = pagination.value.page): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await adminApi.listUsers({
      page,
      pageSize: pagination.value.pageSize,
      ...(search.value.trim() ? { search: search.value.trim() } : {}),
    })
    users.value = response.data.items
    pagination.value = response.data.pagination
    if (selectedUserId.value !== null && !users.value.some(user => user.id === selectedUserId.value)) {
      selectedUserId.value = null
      selectedUser.value = null
    }
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '用户列表读取失败')
  } finally {
    loading.value = false
  }
}

async function loadUserDetail(userId: number): Promise<void> {
  pendingAction.value = null
  cancelDeleteConfirmation()
  selectedUserId.value = userId
  detailLoading.value = true
  errorMessage.value = ''
  try {
    const response = await adminApi.getUserDetail(userId)
    if (selectedUserId.value === userId) selectedUser.value = response.data
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '用户详情读取失败')
  } finally {
    if (selectedUserId.value === userId) detailLoading.value = false
  }
}

function requestStatusChange(): void {
  if (!selectedUser.value) return
  cancelDeleteConfirmation()
  const nextStatus: AdminUserStatus = selectedUser.value.status === 'active'
    ? 'suspended'
    : 'active'
  pendingAction.value = {
    kind: 'status',
    value: nextStatus,
    title: nextStatus === 'suspended' ? '确认暂停这个账号？' : '确认恢复这个账号？',
    message: nextStatus === 'suspended'
      ? '暂停后该用户现有登录会话会立即撤销，新的登录与 Token 刷新也会被拒绝。'
      : '恢复后该用户可以重新登录，但此前被撤销的会话不会自动恢复。',
    danger: nextStatus === 'suspended',
  }
}

function requestRoleChange(): void {
  if (!selectedUser.value) return
  cancelDeleteConfirmation()
  const nextRole: AdminUserRole = selectedUser.value.role === 'admin' ? 'user' : 'admin'
  pendingAction.value = {
    kind: 'role',
    value: nextRole,
    title: nextRole === 'admin' ? '确认授予管理员角色？' : '确认撤销管理员角色？',
    message: nextRole === 'admin'
      ? '持久管理员可进入管理端并管理普通用户状态。角色变更会记录到管理员审计。'
      : '撤销后该账号会立即失去持久管理端权限。系统会阻止撤销最后一个有效持久管理员。',
    danger: nextRole === 'user',
  }
}

function requestDeleteUser(): void {
  if (!canDeleteSelected.value || !selectedUser.value) return
  pendingAction.value = null
  successMessage.value = ''
  deleteConfirmationUsername.value = ''
  deleteConfirmationOpen.value = true
}

function cancelDeleteConfirmation(): void {
  deleteConfirmationOpen.value = false
  deleteConfirmationUsername.value = ''
}

async function confirmDeleteUser(): Promise<void> {
  const selected = selectedUser.value
  if (
    !selected
    || !canDeleteSelected.value
    || deleteConfirmationUsername.value !== selected.username
  ) {
    return
  }

  const deletedUsername = selected.username
  const currentPage = pagination.value.page
  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await adminApi.deleteUser(selected.id, deleteConfirmationUsername.value)
    selectedUserId.value = null
    selectedUser.value = null
    pendingAction.value = null
    cancelDeleteConfirmation()
    successMessage.value = `账号 @${deletedUsername} 已永久删除。`
    await loadUsers(currentPage)
    if (
      pagination.value.totalPages > 0
      && pagination.value.page > pagination.value.totalPages
    ) {
      await loadUsers(pagination.value.totalPages)
    }
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '删除账号失败')
  } finally {
    actionLoading.value = false
  }
}

async function confirmPendingAction(): Promise<void> {
  const selected = selectedUser.value
  const action = pendingAction.value
  if (!selected || !action) return

  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = action.kind === 'status'
      ? await adminApi.updateUserStatus(selected.id, action.value as AdminUserStatus)
      : await adminApi.updateUserRole(selected.id, action.value as AdminUserRole)
    selectedUser.value = response.data
    pendingAction.value = null
    successMessage.value = action.kind === 'status'
      ? '账号状态已更新。'
      : '管理员角色已更新。'
    await loadUsers(pagination.value.page)
    await loadAccess()
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, '管理操作失败')
  } finally {
    actionLoading.value = false
  }
}

function changePage(page: number): void {
  if (page < 1 || page > pagination.value.totalPages) return
  void loadUsers(page)
}

function scheduleSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadUsers(1), 300)
}

onMounted(() => {
  void Promise.all([loadUsers(1), loadAccess()])
})
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.admin-content-card, .users-list-card, .user-detail-card, .error-card { border: 1px solid var(--divider); background: var(--glass-bg); box-shadow: 0 8px 30px rgb(0 0 0 / .06), inset 0 1px 0 rgb(255 255 255 / .1); }
.admin-content-card { padding: clamp(18px, 3vw, 28px); border-radius: 24px; }
.section-heading { display: flex; justify-content: space-between; gap: 18px; align-items: flex-end; margin-bottom: 16px; }
.section-kicker { color: var(--primary); font-size: .68rem; font-weight: 800; letter-spacing: .12em; }
.section-heading h2 { margin: 5px 0 0; font-size: 1.45rem; letter-spacing: -.025em; }
.section-heading p { max-width: 680px; margin: 7px 0 0; color: var(--text-tertiary); line-height: 1.65; }
.search-input { width: min(340px, 44vw); min-height: 40px; padding: 0 13px; border: 1px solid var(--divider); border-radius: 13px; outline: none; background: var(--input-bg, var(--btn-bg)); color: var(--text-primary); font: inherit; font-size: .78rem; transition: border-color 300ms cubic-bezier(.25,.1,.25,1), box-shadow 300ms cubic-bezier(.25,.1,.25,1); }
.search-input:focus { border-color: color-mix(in srgb, var(--primary) 52%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent); }
.users-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(310px, .65fr); gap: 12px; }
.users-list-card, .user-detail-card { overflow: hidden; border-radius: 20px; }
.list-header, .session-heading, .pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.list-header { padding: 12px 14px; border-bottom: 1px solid var(--divider); color: var(--text-tertiary); font-size: .72rem; }
.user-row { width: 100%; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 11px; padding: 13px 14px; border: 0; border-bottom: 1px solid var(--divider); background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; transition: background 300ms cubic-bezier(.25,.1,.25,1), transform 300ms cubic-bezier(.25,.1,.25,1); }
.user-row:hover, .user-row.selected { background: color-mix(in srgb, var(--primary) 7%, transparent); }
.user-row:active { transform: scale(.995); }
.user-avatar, .detail-avatar { display: grid; place-items: center; border-radius: 14px; background: color-mix(in srgb, var(--primary) 11%, transparent); color: var(--primary); font-weight: 800; }
.user-avatar { width: 38px; height: 38px; font-size: .8rem; }
.user-copy strong, .user-copy small, .user-meta small { display: block; }
.user-copy strong { overflow: hidden; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
.user-copy small, .user-meta small { margin-top: 3px; color: var(--text-tertiary); font-size: .7rem; }
.badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.mini-badge { display: inline-flex; min-height: 22px; align-items: center; padding: 0 8px; border: 1px solid var(--divider); border-radius: 999px; background: color-mix(in srgb, var(--btn-bg) 72%, transparent); color: var(--text-tertiary); font-size: .62rem; font-weight: 700; }
.mini-badge.admin { border-color: color-mix(in srgb, var(--primary) 26%, var(--divider)); background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); }
.mini-badge.active { color: #248a3d; }
.mini-badge.suspended { border-color: color-mix(in srgb, var(--danger) 25%, var(--divider)); background: color-mix(in srgb, var(--danger) 7%, transparent); color: var(--danger); }
.user-meta { text-align: right; }
.pagination-bar { padding: 12px 14px; }
.pagination-bar button { min-height: 34px; padding: 0 11px; border: 1px solid var(--divider); border-radius: 11px; background: var(--btn-bg); color: var(--text-primary); font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer; }
.pagination-bar button:disabled { opacity: .4; cursor: default; }
.user-detail-card { align-self: start; padding: 16px; }
.detail-profile { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--divider); }
.detail-avatar { width: 46px; height: 46px; }
.detail-profile strong, .detail-profile small { display: block; }
.detail-profile small { margin-top: 3px; color: var(--text-tertiary); font-size: .72rem; }
.detail-list { margin: 12px 0; }
.detail-list > div { display: grid; grid-template-columns: 88px minmax(0,1fr); gap: 10px; padding: 7px 0; }
.detail-list dt { color: var(--text-tertiary); font-size: .72rem; }
.detail-list dd { margin: 0; overflow-wrap: anywhere; font-size: .76rem; }
.detail-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; padding: 12px 0; border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider); }
.detail-metrics div { padding: 9px; border-radius: 13px; background: color-mix(in srgb, var(--btn-bg) 72%, transparent); }
.detail-metrics strong, .detail-metrics span { display: block; }
.detail-metrics span { margin-top: 3px; color: var(--text-tertiary); font-size: .66rem; }
.management-section { padding: 14px 0; border-bottom: 1px solid var(--divider); }
.management-heading strong, .management-heading small { display: block; }
.management-heading strong { font-size: .76rem; }
.management-heading small { margin-top: 4px; color: var(--text-tertiary); font-size: .67rem; line-height: 1.55; }
.management-actions, .confirm-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.manage-btn { min-height: 34px; padding: 0 11px; border: 1px solid var(--divider); border-radius: 11px; background: var(--btn-bg); color: var(--text-primary); font: inherit; font-size: .7rem; font-weight: 700; cursor: pointer; transition: transform 300ms cubic-bezier(.25,.1,.25,1), border-color 300ms cubic-bezier(.25,.1,.25,1), background 300ms cubic-bezier(.25,.1,.25,1), opacity 300ms cubic-bezier(.25,.1,.25,1); }
.manage-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: color-mix(in srgb, var(--primary) 30%, var(--divider)); }
.manage-btn:active:not(:disabled) { transform: scale(.98); }
.manage-btn:disabled { opacity: .45; cursor: default; }
.manage-btn.confirm { border-color: color-mix(in srgb, var(--primary) 30%, var(--divider)); background: color-mix(in srgb, var(--primary) 10%, var(--btn-bg)); color: var(--primary); }
.manage-btn.danger { border-color: color-mix(in srgb, var(--danger) 28%, var(--divider)); background: color-mix(in srgb, var(--danger) 8%, var(--btn-bg)); color: var(--danger); }
.management-note { color: var(--text-tertiary); font-size: .68rem; line-height: 1.55; }
.confirm-card { margin-top: 10px; padding: 12px; border: 1px solid color-mix(in srgb, var(--primary) 18%, var(--divider)); border-radius: 14px; background: color-mix(in srgb, var(--primary) 5%, var(--glass-bg)); }
.confirm-card strong { display: block; font-size: .74rem; }
.confirm-card p { margin: 5px 0 0; color: var(--text-tertiary); font-size: .68rem; line-height: 1.6; }
.delete-confirm-card { margin-top: 10px; padding: 12px; border: 1px solid color-mix(in srgb, var(--danger) 26%, var(--divider)); border-radius: 14px; background: color-mix(in srgb, var(--danger) 6%, var(--glass-bg)); box-shadow: inset 0 1px 0 rgb(255 255 255 / .08); }
.delete-confirm-card strong { display: block; color: var(--danger); font-size: .74rem; }
.delete-confirm-card p { margin: 6px 0 0; color: var(--text-tertiary); font-size: .68rem; line-height: 1.65; }
.delete-confirm-card b { color: var(--text-primary); }
.delete-confirm-input { width: 100%; min-height: 38px; margin-top: 10px; padding: 0 11px; border: 1px solid color-mix(in srgb, var(--danger) 24%, var(--divider)); border-radius: 11px; outline: none; background: var(--input-bg, var(--btn-bg)); color: var(--text-primary); font: inherit; font-size: .72rem; transition: border-color 300ms cubic-bezier(.25,.1,.25,1), box-shadow 300ms cubic-bezier(.25,.1,.25,1), opacity 300ms cubic-bezier(.25,.1,.25,1); }
.delete-confirm-input:focus { border-color: color-mix(in srgb, var(--danger) 60%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 10%, transparent); }
.delete-confirm-input:disabled { opacity: .45; }
.success-card { margin-top: 10px; padding: 10px 12px; border: 1px solid rgb(52 199 89 / .2); border-radius: 12px; background: rgb(52 199 89 / .07); color: #248a3d; font-size: .7rem; font-weight: 700; }
.global-success { margin: 0 0 12px; }
.session-section { margin-top: 14px; }
.session-heading { margin-bottom: 8px; font-size: .74rem; }
.session-heading span { color: var(--text-tertiary); font-size: .68rem; }
.session-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 9px; align-items: center; padding: 9px 0; border-top: 1px solid color-mix(in srgb, var(--divider) 72%, transparent); }
.session-row strong, .session-row small { display: block; }
.session-row strong { font-size: .72rem; }
.session-row small, .session-status, .session-empty { margin-top: 2px; color: var(--text-tertiary); font-size: .66rem; }
.session-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--text-tertiary); }
.session-dot.active { background: #34c759; }
.session-dot.revoked { background: var(--danger); }
.empty-state, .session-empty { padding: 18px; color: var(--text-tertiary); line-height: 1.6; }
.error-card { margin-bottom: 12px; padding: 12px 14px; border-radius: 14px; border-color: color-mix(in srgb, var(--danger) 24%, var(--divider)); color: var(--danger); line-height: 1.6; }
@media (max-width: 900px) { .users-layout { grid-template-columns: 1fr; } }
@media (max-width: 650px) { .section-heading { display: grid; align-items: stretch; } .search-input { width: 100%; } .user-row { grid-template-columns: auto minmax(0,1fr); } .user-meta { grid-column: 2; text-align: left; } }
</style>
