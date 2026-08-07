<template>
  <form @submit.prevent="handleSubmit" class="tab-content register-form">
    <div class="register-grid">
      <!-- 左栏 -->
      <div class="register-left">
        <div class="register-header-wrapper">
          <button type="button" class="back-link" @click="$emit('switch-tab', 'login')">← 返回登录</button>
        </div>
        <div class="register-title-area">
          <h2 class="register-title">创建账户</h2>
          <p class="register-sub">加入 FlexiKit，管理你的专属工具箱</p>
        </div>

        <div class="field">
          <label>邮箱 <span class="required">*</span></label>
          <input v-model="form.email" type="email" placeholder="your@email.com" maxlength="50" required>
        </div>

        <div class="form-row">
          <div class="form-col">
            <div class="field">
              <label>用户名 <span class="required">*</span></label>
              <input v-model="form.username" placeholder="至少2个字符" maxlength="20" required>
            </div>
          </div>
          <div class="form-col">
            <div class="field">
              <label>显示名称</label>
              <input v-model="form.displayName" placeholder="别人看到的名字" maxlength="20">
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <div class="field">
              <label>密码 <span class="required">*</span></label>
              <input :type="showPassword ? 'text' : 'password'" v-model="form.password" placeholder="至少6位" maxlength="30" minlength="6" required>
              <button type="button" class="pwd-toggle" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁' }}</button>
            </div>
          </div>
          <div class="form-col">
            <div class="field">
              <label>确认密码 <span class="required">*</span></label>
              <input :type="showConfirmPassword ? 'text' : 'password'" v-model="form.confirmPassword" placeholder="再次输入密码" maxlength="30" minlength="6" required>
              <button type="button" class="pwd-toggle" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? '🙈' : '👁' }}</button>
            </div>
          </div>
        </div>

        <div v-if="error" class="error">{{ error }}</div>
        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '注册中...' : '创建账户' }}
        </button>

        <div class="switch-hint" style="margin-top:14px;">
          已有账号？<button type="button" class="link-btn" @click="$emit('switch-tab', 'login')">立即登录</button>
        </div>
      </div>

      <!-- 右栏 -->
      <div class="register-right">
        <AvatarPicker
          :avatar="form.avatar"
          :avatarType="form.avatarType"
          :avatarData="form.avatarData"
          :initial="form.displayName || form.username"
          @update:avatar="form.avatar = $event"
          @update:avatarType="form.avatarType = $event"
          @update:avatarData="form.avatarData = $event"
        />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import AvatarPicker from '@/components/common/AvatarPicker.vue'

const props = defineProps<{
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: any): void
  (e: 'switch-tab', tab: 'login' | 'profile'): void
}>()

const form = reactive({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  avatar: 'emoji-🦊',
  avatarType: 'emoji' as 'upload' | 'preset' | 'emoji',
  avatarData: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const error = ref('')

watch(() => props.error, (val) => { error.value = val || '' })

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<style scoped>
.register-grid {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}
.register-left {
  flex: 3;
  min-width: 0;
}
.register-right {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-top: 0;
  padding-top: 0;
}
.register-right .avatar-picker {
  width: 100%;
}

.register-header-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0;
}
.back-link {
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: .78rem;
  cursor: pointer;
  padding: 0;
}
.back-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.register-title-area {
  text-align: left;
  margin-bottom: 16px;
}
.register-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);  /* 暗黑自动变白 */
  margin: 0 0 2px;
}
.register-sub {
  font-size: .74rem;
  color: var(--text-tertiary);
  margin: 0;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}
.form-col {
  flex: 1;
  min-width: 0;
}
.form-col .field {
  margin-bottom: 12px;
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
.required { color: var(--danger); }
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
@media (max-width: 700px) {
  .register-grid {
    flex-direction: column;
    gap: 16px;
  }
  .register-right {
    flex: none;
    width: 100%;
    align-items: center;
    margin-top: 0;
  }
  .register-right .avatar-picker {
    width: auto;
  }
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>