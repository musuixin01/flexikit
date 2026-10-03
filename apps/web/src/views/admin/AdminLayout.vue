<template>
  <div class="admin-page">
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <span class="admin-eyebrow">FLEXIKIT · ADMIN CONSOLE</span>
          <h1>管理端</h1>
          <p>平台运行、账号权限、管理审计与 AI 成本数据。</p>
          <span v-if="access" class="access-badge">
            {{ access.accessMode === 'bootstrap-admin' ? '引导管理员' : '持久管理员' }}
          </span>
        </div>
        <RouterLink to="/app" class="back-link">返回工作台</RouterLink>
      </header>

      <nav class="admin-nav" aria-label="管理端导航">
        <RouterLink to="/admin/overview" class="admin-nav-item">
          <span class="nav-icon" aria-hidden="true">⌘</span>
          <span><strong>Overview</strong><small>平台概览</small></span>
        </RouterLink>
        <RouterLink to="/admin/users" class="admin-nav-item">
          <span class="nav-icon" aria-hidden="true">◎</span>
          <span><strong>Users</strong><small>用户数据</small></span>
        </RouterLink>
        <RouterLink to="/admin/ai-usage" class="admin-nav-item">
          <span class="nav-icon" aria-hidden="true">◇</span>
          <span><strong>AI Usage & Cost</strong><small>Token 与成本</small></span>
        </RouterLink>
      </nav>

      <div v-if="accessState === 'checking'" class="admin-state-card">
        <span class="state-orb" aria-hidden="true"></span>
        <div>
          <strong>正在验证管理权限</strong>
          <p>管理权限由服务端校验，前端状态不能授予管理员访问。</p>
        </div>
      </div>

      <div v-else-if="accessState === 'denied'" class="admin-state-card danger-state">
        <span class="state-orb" aria-hidden="true"></span>
        <div>
          <strong>当前账号没有管理端权限</strong>
          <p>需要持久管理员角色，或由服务端 ADMIN_USER_IDS 提供引导/恢复权限。</p>
        </div>
      </div>

      <div v-else-if="accessState === 'unauthenticated'" class="admin-state-card">
        <span class="state-orb" aria-hidden="true"></span>
        <div>
          <strong>请先登录</strong>
          <p>管理端只接受已登录账号。登录成功后会重新校验服务器端管理员权限。</p>
          <RouterLink to="/login" class="retry-btn">前往登录</RouterLink>
        </div>
      </div>

      <div v-else-if="accessState === 'error'" class="admin-state-card">
        <span class="state-orb" aria-hidden="true"></span>
        <div>
          <strong>暂时无法验证管理权限</strong>
          <p>{{ errorMessage }}</p>
          <button type="button" class="retry-btn" @click="verifyAccess">重新验证</button>
        </div>
      </div>

      <RouterView v-else />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi, type AdminAccess } from '@/api/admin'
import { getApiErrorMessage } from '@/api/client'

type AccessState = 'checking' | 'allowed' | 'unauthenticated' | 'denied' | 'error'

const accessState = ref<AccessState>('checking')
const errorMessage = ref('')
const access = ref<AdminAccess | null>(null)

async function verifyAccess(): Promise<void> {
  accessState.value = 'checking'
  errorMessage.value = ''
  access.value = null
  try {
    const result = await adminApi.inspectAccess()
    accessState.value = result.status
    access.value = result.access
  } catch (error: unknown) {
    accessState.value = 'error'
    errorMessage.value = getApiErrorMessage(error, '管理端服务暂时不可用，请稍后重试。')
  }
}

onMounted(() => {
  void verifyAccess()
})
</script>

<style scoped>
.admin-page { position: relative; z-index: 1; width: 100%; min-height: 100vh; padding: clamp(20px, 3vw, 42px); color: var(--text-primary); }
.admin-shell { width: min(1180px, 100%); margin: 0 auto; }
.admin-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 22px; }
.admin-eyebrow { display: block; margin-bottom: 8px; color: var(--primary); font-size: .72rem; font-weight: 800; letter-spacing: .13em; }
.admin-header h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.15rem); letter-spacing: -.045em; }
.admin-header p, .admin-state-card p { margin: 8px 0 0; color: var(--text-tertiary); line-height: 1.7; }
.access-badge { display: inline-flex; min-height: 26px; align-items: center; margin-top: 10px; padding: 0 9px; border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--divider)); border-radius: 999px; background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); font-size: .68rem; font-weight: 800; }
.back-link, .retry-btn { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0 15px; border: 1px solid var(--divider); border-radius: 14px; background: var(--glass-bg); color: var(--text-primary); font: inherit; font-size: .78rem; font-weight: 700; text-decoration: none; cursor: pointer; box-shadow: 0 8px 30px rgb(0 0 0 / .06), inset 0 1px 0 rgb(255 255 255 / .1); transition: transform 300ms cubic-bezier(.25,.1,.25,1), border-color 300ms cubic-bezier(.25,.1,.25,1); }
.back-link:hover, .retry-btn:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--primary) 26%, var(--divider)); }
.back-link:active, .retry-btn:active { transform: scale(.98); }
.admin-nav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
.admin-nav-item { display: flex; align-items: center; gap: 11px; min-width: 0; padding: 13px 14px; border: 1px solid var(--divider); border-radius: 20px; background: var(--glass-bg); color: var(--text-secondary); text-decoration: none; box-shadow: 0 8px 30px rgb(0 0 0 / .04), inset 0 1px 0 rgb(255 255 255 / .08); transition: transform 300ms cubic-bezier(.25,.1,.25,1), border-color 300ms cubic-bezier(.25,.1,.25,1), background 300ms cubic-bezier(.25,.1,.25,1); }
.admin-nav-item:hover { transform: translateY(-1px); }
.admin-nav-item.router-link-active { border-color: color-mix(in srgb, var(--primary) 32%, var(--divider)); background: color-mix(in srgb, var(--primary) 9%, var(--glass-bg)); color: var(--text-primary); }
.admin-nav-item strong, .admin-nav-item small { display: block; }
.admin-nav-item strong { font-size: .84rem; }
.admin-nav-item small { margin-top: 3px; color: var(--text-tertiary); font-size: .7rem; }
.nav-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); font-weight: 800; }
.admin-state-card { display: flex; gap: 14px; align-items: flex-start; padding: 18px; border: 1px solid var(--divider); border-radius: 20px; background: var(--glass-bg); box-shadow: 0 8px 30px rgb(0 0 0 / .06), inset 0 1px 0 rgb(255 255 255 / .1); }
.state-orb { width: 12px; height: 12px; flex: 0 0 auto; margin-top: 5px; border-radius: 999px; background: var(--primary); box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 10%, transparent); }
.danger-state .state-orb { background: var(--danger); box-shadow: 0 0 0 6px color-mix(in srgb, var(--danger) 10%, transparent); }
.retry-btn { margin-top: 12px; }
@media (max-width: 760px) {
  .admin-page { padding: 18px 14px 28px; }
  .admin-header { display: grid; }
  .back-link { justify-self: start; }
  .admin-nav { grid-template-columns: 1fr; }
}
</style>
