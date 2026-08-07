<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToolsStore } from '../../stores/tools'
import { useUiStore } from '../../stores/ui'
import type { Tool } from '../../types'

const props = defineProps<{
  visible: boolean
  editTool?: Tool | null
}>()

const emit = defineEmits<{
  save: [data: any]
  close: []
}>()

const store = useToolsStore()
const appStore = useUiStore()

const name = ref('')
const url = ref('')
const localPath = ref('')
const description = ref('')
const tagsStr = ref('')
const category = ref('')
const iconData = ref('')
const nameError = ref(false)
const urlError = ref(false)
const showDropdown = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const localFileInput = ref<HTMLInputElement | null>(null)

const categories = computed(() => store.categories.filter(c => c !== '全部'))

const iconPreview = computed(() => {
  if (iconData.value && iconData.value.startsWith('data:image')) {
    return `<img src="${iconData.value}" style="width:100%;height:100%;object-fit:contain;" alt="">`
  }
  if (iconData.value && iconData.value.startsWith('<svg')) {
    return iconData.value
  }
  if (url.value && /^https?:\/\//i.test(url.value)) {
    try {
      const domain = new URL(url.value).hostname
      return `<img src="https://favicon.im/${domain}?size=64" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none'" alt="">`
    } catch {}
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2"/><circle cx="8" cy="8" r="2"/><path d="m12 8 2 2-2 2"/></svg>`
})

function resetIcon() { iconData.value = '' }

function onFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => { iconData.value = evt.target?.result as string || '' }
  reader.readAsDataURL(file)
}

function handleSave() {
  nameError.value = false; urlError.value = false
  const n = name.value.trim()
  if (!n) { nameError.value = true; return }
  const u = url.value.trim()
  const lp = localPath.value.trim()
  // 至少需要 URL 或本地路径之一
  if (!lp && (!u || !/^https?:\/\//i.test(u))) {
    urlError.value = true; appStore.showToast('请填写官网 URL 或本地路径'); return
  }
  const desc = description.value.trim() || n
  const tags = tagsStr.value.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
  const cat = category.value.trim() || '自定义工具'
  emit('save', { name: n, url: u || '#', local_path: lp, description: desc, tags, category: cat, icon: iconData.value })
}

function pickLocalPath() {
  localFileInput.value?.click()
}

function onLocalPathPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    // 浏览器安全限制：只能获取文件名，无法获取完整路径
    // 所以让用户手动输入路径，文件选择器只做辅助提示
    localPath.value = file.name
    appStore.showToast('请手动填写完整路径，或在此路径上修改。浏览器限制无法自动获取完整路径。')
  }
}

function resetForm() {
  name.value = props.editTool?.name || ''
  url.value = props.editTool?.url || ''
  localPath.value = props.editTool?.localPath || ''
  description.value = props.editTool?.description || ''
  tagsStr.value = (props.editTool?.tags || []).join(', ')
  category.value = props.editTool?.category || ''
  iconData.value = props.editTool?.icon || ''
  nameError.value = false; urlError.value = false; showDropdown.value = false
}

watch(() => props.visible, (v) => { if (v) resetForm() })
</script>

<template>
  <div class="modal-overlay" :class="{open: visible}" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <h3>{{ editTool ? '编辑工具' : '添加工具' }}</h3>
      <label>工具名称 *</label>
      <input v-model="name" placeholder="例如：MyTool" maxlength="60" />
      <div class="field-error" :class="{visible: nameError}">请输入工具名称</div>
      <label>官网 URL（本地工具可不填）</label>
      <input v-model="url" type="url" placeholder="https://example.com" maxlength="300" />
      <div class="field-error" :class="{visible: urlError}">请输入有效的 URL 或本地路径</div>
      <label>📁 本地路径（可选）</label>
      <div class="local-path-row">
        <input v-model="localPath" placeholder="C:\Program Files\...\app.exe 或文件夹路径" />
        <button type="button" class="btn-small" @click="pickLocalPath">📂 浏览</button>
        <input type="file" ref="localFileInput" style="display:none" @change="onLocalPathPick" />
      </div>
      <div class="field-hint">添加后可直接打开本地程序/文件/文件夹</div>
      <label>描述</label>
      <textarea v-model="description" placeholder="这个工具是做什么的…" maxlength="200"></textarea>
      <label>标签（用逗号分隔）</label>
      <input v-model="tagsStr" placeholder="免费, 效率, 开发" maxlength="120" />
      <div class="field-hint">最多 5 个标签</div>
      <label>分类 (可输入新分类)</label>
      <div class="category-select-wrapper">
        <div class="category-input-group">
          <input v-model="category" placeholder="选择或输入分类" @focus="showDropdown = true" />
          <button type="button" class="category-dropdown-btn" @click="showDropdown = !showDropdown">▼</button>
        </div>
        <div class="custom-dropdown" :class="{show: showDropdown}">
          <div v-for="cat in categories" :key="cat" class="dropdown-item" @click="category = cat; showDropdown = false">{{ cat }}</div>
        </div>
      </div>
      <label>自定义图标 (可选)</label>
      <div class="icon-custom-area">
        <div class="icon-preview"><div class="card-icon preview-icon" v-html="iconPreview"></div></div>
        <div class="icon-options">
          <button type="button" class="btn-small" @click="fileInput?.click()">📁 上传图片</button>
          <button type="button" class="btn-small" @click="resetIcon">🔄 重置为自动获取</button>
          <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="onFileUpload" />
        </div>
        <div class="icon-hint">提示：上传图片将作为固定图标；不设置则自动获取 favicon。</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="emit('close')">取消</button>
        <button type="button" class="btn-primary" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>
