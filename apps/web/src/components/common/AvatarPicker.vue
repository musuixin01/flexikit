<template>
  <div class="avatar-picker">
    <!-- ===== 预览区（可点击上传） ===== -->
    <div class="preview-wrapper" @click="triggerUpload">
      <div class="avatar-preview-box">
        <span v-if="localType === 'emoji'" class="preview-emoji">{{ previewEmoji }}</span>
        <div v-else-if="localType === 'preset'" class="preview-grad" :style="previewGradStyle">
          {{ initial?.[0]?.toUpperCase() || '?' }}
        </div>
        <img v-else-if="localType === 'upload' && localData?.startsWith('data:image')" :src="localData" class="preview-img">
        <div v-else class="preview-placeholder">
          {{ initial?.[0]?.toUpperCase() || '?' }}
        </div>
      </div>
      <div class="preview-overlay">点击更换</div>
    </div>

    <!-- 提示文字 -->
    <p class="avatar-hint">你可以点击选择自己的头像</p>

    <!-- ===== 选择头像标签 ===== -->
    <label class="avatar-label">选择头像</label>

    <!-- Emoji 预设 -->
    <div class="avatar-grid">
      <button
        v-for="a in PRESET_AVATARS"
        :key="a.id"
        type="button"
        :class="['avatar-chip', { active: localAvatar === a.id && localType === 'emoji' }]"
        @click="pickEmoji(a.id, a.label)"
      >{{ a.label }}</button>
    </div>

    <!-- 渐变色 -->
    <div class="avatar-sub-label">渐变色</div>
    <div class="gradient-grid">
      <button
        v-for="g in PRESET_GRADIENT_AVATARS"
        :key="g.id"
        type="button"
        :class="['gradient-chip', { active: localAvatar === g.id && localType === 'preset' }]"
        :style="{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }"
        @click="pickGradient(g.id)"
      ></button>
    </div>

    <!-- 隐藏的文件输入（用于点击预览区触发上传） -->
    <input type="file" ref="fileRef" accept="image/png,image/jpeg,image/webp" style="display:none" @change="onUpload">
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PRESET_AVATARS, PRESET_GRADIENT_AVATARS } from '@/stores/user'

const props = defineProps<{
  avatar?: string
  avatarType?: 'upload' | 'preset' | 'emoji'
  avatarData?: string
  initial?: string
}>()

const emit = defineEmits<{
  'update:avatar': [val: string]
  'update:avatarType': [val: 'upload' | 'preset' | 'emoji']
  'update:avatarData': [val: string]
}>()

const fileRef = ref<HTMLInputElement | null>(null)

// 本地状态
const localAvatar = ref(props.avatar || 'emoji-🦊')
const localType = ref<'upload' | 'preset' | 'emoji'>(props.avatarType || 'emoji')
const localData = ref(props.avatarData || '')

watch(() => props.avatar, (v) => { if (v) localAvatar.value = v })
watch(() => props.avatarType, (v) => { if (v) localType.value = v })
watch(() => props.avatarData, (v) => { if (v) localData.value = v })

const previewEmoji = computed(() =>
  PRESET_AVATARS.find(a => a.id === localAvatar.value)?.label || '🦊'
)

const previewGradStyle = computed(() => {
  const g = PRESET_GRADIENT_AVATARS.find(g => g.id === localAvatar.value)
  return g ? { background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` } : {}
})

function pickEmoji(id: string, label: string) {
  localAvatar.value = id
  localType.value = 'emoji'
  localData.value = ''
  emit('update:avatar', id)
  emit('update:avatarType', 'emoji')
  emit('update:avatarData', '')
}

function pickGradient(id: string) {
  localAvatar.value = id
  localType.value = 'preset'
  localData.value = ''
  emit('update:avatar', id)
  emit('update:avatarType', 'preset')
  emit('update:avatarData', '')
}

function triggerUpload() {
  fileRef.value?.click()
}

function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    const base64 = evt.target?.result as string
    localData.value = base64
    localAvatar.value = base64
    localType.value = 'upload'
    emit('update:avatarData', base64)
    emit('update:avatar', base64)
    emit('update:avatarType', 'upload')
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.avatar-picker {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 预览区域 */
.preview-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
  cursor: pointer;
}
.avatar-preview-box {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  border: 2px solid var(--glass-border);
  background: var(--input-bg);
  transition: border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.preview-wrapper:hover .avatar-preview-box {
  border-color: var(--accent);
}
.preview-wrapper:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.35);
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.preview-emoji {
  font-size: 36px;
  line-height: 1;
}
.preview-grad {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 28px;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--btn-bg);
}

.avatar-hint {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  text-align: center;
  margin: 0 0 12px 0;
}

.avatar-label {
  display: block;
  font-size: .76rem;
  font-weight: 540;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}
.avatar-sub-label {
  font-size: .68rem;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
.gradient-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}

.avatar-chip {
  width: 38px;
  height: 38px;
  border: 2px solid var(--divider);
  border-radius: 10px;
  background: var(--input-bg);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  user-select: none;
}
.avatar-chip:hover {
  border-color: var(--accent);
  transform: scale(1.1);
  background: var(--accent-soft);
}
.avatar-chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-soft);
  transform: scale(1.12);
}

.gradient-chip {
  width: 34px;
  height: 34px;
  border: 2px solid var(--divider);
  border-radius: 50%;
  cursor: pointer;
  transition: all .15s;
}
.gradient-chip:hover {
  border-color: var(--accent);
  transform: scale(1.15);
}
.gradient-chip.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  transform: scale(1.18);
}
</style>