<template>
  <form @submit.prevent="handleSubmit" class="tab-content tab-scroll">
    <div class="field">
      <label>显示名称</label>
      <input v-model="displayName" placeholder="输入显示名称" maxlength="20">
    </div>
    <div class="avatar-section">
      <AvatarPicker
        :avatar="avatar"
        :avatarType="avatarType"
        :avatarData="avatarData"
        :initial="displayName"
        @update:avatar="avatar = $event"
        @update:avatarType="avatarType = $event"
        @update:avatarData="avatarData = $event"
      />
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <button type="submit" class="submit-btn">保存修改</button>
    <button type="button" class="secondary-btn" @click="$emit('logout')">退出登录</button>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AvatarPicker from '@/components/common/AvatarPicker.vue'

const props = defineProps<{
  initialDisplayName: string
  initialAvatar: string
  initialAvatarType: 'upload' | 'preset' | 'emoji'
  initialAvatarData: string
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update', data: { displayName: string; avatar: string; avatarType: any; avatarData: string }): void
  (e: 'logout'): void
}>()

const displayName = ref(props.initialDisplayName)
const avatar = ref(props.initialAvatar)
const avatarType = ref(props.initialAvatarType)
const avatarData = ref(props.initialAvatarData)
const error = ref('')

watch(() => props.error, (val) => { error.value = val || '' })

function handleSubmit() {
  emit('update', {
    displayName: displayName.value,
    avatar: avatar.value,
    avatarType: avatarType.value,
    avatarData: avatarData.value
  })
}
</script>

<style scoped>
.avatar-section {
  margin: 20px 0 16px;
  padding: 14px;
  background: var(--btn-bg);
  border-radius: 14px;
  border: 1px solid var(--divider);
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
  font-family: inherit;
  font-size: .82rem;
  color: var(--text-primary);
  transition: all .22s;
}
.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
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
.secondary-btn {
  width: 100%;
  height: 40px;
  margin-top: 8px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--btn-bg);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: .82rem;
  font-weight: 540;
  cursor: pointer;
  transition: all .18s;
}
.secondary-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--text-primary);
}
.tab-scroll {
  max-height: 55vh;
  overflow-y: auto;
}
</style>