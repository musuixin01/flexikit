<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme, initTheme } from '../stores/theme'

const { theme, toggleTheme } = useTheme()

// 模拟工具数据
const tools = ref([
  { id: 1, name: '浏览器', icon: '🌐', desc: '快速访问网页' },
  { id: 2, name: '终端', icon: '💻', desc: '命令行工具' },
  { id: 3, name: '文件管理器', icon: '📁', desc: '管理本地文件' },
  { id: 4, name: '设置', icon: '⚙️', desc: '系统设置' },
  { id: 5, name: '计算器', icon: '🧮', desc: '科学计算器' },
  { id: 6, name: '记事本', icon: '📝', desc: '快速记录' },
  { id: 7, name: '截图', icon: '📸', desc: '屏幕截图' },
  { id: 8, name: '音乐', icon: '🎵', desc: '音乐播放器' },
])

// 导航菜单
const navItems = [
  { icon: '🏠', name: '首页', active: true },
  { icon: '🔧', name: '工具', active: false },
  { icon: '🔍', name: '发现', active: false },
  { icon: '⭐', name: '收藏', active: false },
  { icon: '📊', name: '统计', active: false },
]

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
    <!-- 自定义标题栏 -->
    <div class="titlebar h-10 flex items-center justify-between px-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/20 dark:border-slate-800/50">
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-xs font-bold">F</div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">FlexiKit</span>
      </div>
      <div class="flex items-center gap-3">
        <!-- 主题切换按钮 -->
        <button
          @click="toggleTheme"
          class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          :title="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        >
          <span v-if="theme === 'dark'" class="text-base">☀️</span>
          <span v-else class="text-base">🌙</span>
        </button>
        <!-- 窗口控制按钮（最小化/最大化/关闭），Tauri会自动接管，这里预留位置 -->
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span class="text-xs">−</span>
          </button>
          <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span class="text-xs">□</span>
          </button>
          <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
            <span class="text-xs">✕</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="flex h-[calc(100vh-40px)]">
      <!-- 左侧导航栏 -->
      <div class="w-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-r border-white/20 dark:border-slate-800/50 flex flex-col items-center py-4 gap-2">
        <button
          v-for="item in navItems"
          :key="item.name"
          class="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
          :class="item.active ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'"
        >
          <span class="text-lg">{{ item.icon }}</span>
        </button>
      </div>

      <!-- 右侧内容区域 -->
      <div class="flex-1 p-6 overflow-y-auto">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">我的工具</h1>
        <!-- 工具卡片网格 -->
        <div class="grid grid-cols-4 gap-4">
          <div
            v-for="tool in tools"
            :key="tool.id"
            class="tool-card relative overflow-hidden rounded-2xl p-4 bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/20 cursor-pointer"
          >
            <div class="text-3xl mb-2">{{ tool.icon }}</div>
            <h3 class="font-medium text-gray-800 dark:text-gray-100 text-sm">{{ tool.name }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ tool.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
