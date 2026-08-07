<template>
  <form @submit.prevent="handleSubmit" class="tab-content">
    <div class="field">
      <label>用户名 / 邮箱</label>
      <input v-model="form.username" placeholder="输入用户名或邮箱" maxlength="50" autocomplete="username">
    </div>
    <div class="field">
      <label>密码</label>
      <input :type="showPassword ? 'text' : 'password'" v-model="form.password" placeholder="输入密码" maxlength="30" autocomplete="current-password">
      <button type="button" class="pwd-toggle" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁' }}</button>
    </div>

    <div class="field-links">
      <button type="button" class="link-btn" @click="$emit('forgot-pwd')">忘记密码了吗？</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <button type="submit" class="submit-btn" :disabled="loading">
      <span v-if="loading" class="spinner"></span>
      {{ loading ? '登录中...' : '登 录' }}
    </button>

    <div class="switch-hint">
      没有账号？<button type="button" class="link-btn" @click="$emit('switch-tab', 'register')">创建一个账户</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const props = defineProps<{
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: { username: string; password: string }): void
  (e: 'switch-tab', tab: 'register' | 'profile'): void
  (e: 'forgot-pwd'): void
}>()

const form = reactive({ username: '', password: '' })
const showPassword = ref(false)
const error = ref('')

watch(() => props.error, (val) => { error.value = val || '' })

function handleSubmit() {
  emit('submit', { username: form.username, password: form.password })
}
</script>

<style scoped>
/* 复用父组件样式，此处仅作占位，实际样式由父组件控制 */
/* 但由于 scoped 隔离，我们再次定义关键样式以保证独立 */
.tab-content {
  animation: fadeSlideIn .25s ease;
}
@keyframes fadeSlideIn {
  from { opacity:0; transform:translateY(10px); }
  to { opacity:1; transform:translateY(0); }
}
.field {
  margin-bottom: 12px;
  position: relative;
}
.field label {
  display: block;
  font-size: .74rem;
  font-weight: 540;
  color: var(--text-secondary);
  margin-bottom: 3px;
}
.field input {
  width: 100%;
  border: none;
  outline: none;
  background: var(--input-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 8px 12px;
  padding-right: 36px;
  font-family: inherit;
  font-size: .82rem;
  color: var(--text-primary);
  transition: all .22s;
}
.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.pwd-toggle {
  position: absolute;
  right: 8px;
  bottom: 6px;
  background: transparent;
  border: none;
  font-size: 15px;
  cursor: pointer;
  opacity: .45;
  transition: opacity .15s;
}
.pwd-toggle:hover { opacity: 1; }
.field-links {
  display: flex;
  justify-content: flex-end;
  margin: -2px 0 8px;
}
.link-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: .72rem;
  cursor: pointer;
  padding: 2px 0;
  transition: opacity .15s;
}
.link-btn:hover {
  opacity: .75;
  text-decoration: underline;
}
.error {
  font-size: .7rem;
  color: var(--danger);
  margin-bottom: 8px;
  padding: 5px 10px;
  background: var(--danger-soft);
  border-radius: 8px;
}
.submit-btn {
  width: 100%;
  height: 40px;
  border: none;
  outline: none;
  background: var(--accent);
  color: #fff;
  border-radius: 10px;
  font-family: inherit;
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s cubic-bezier(.4,0,.2,1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.submit-btn:hover {
  opacity: .9;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0,113,227,.3);
}
.submit-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.switch-hint {
  text-align: center;
  font-size: .76rem;
  color: var(--text-tertiary);
  margin-top: 14px;
}
</style>