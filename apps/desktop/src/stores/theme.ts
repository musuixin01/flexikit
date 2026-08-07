import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')
const STORAGE_KEY = 'flexikit-desktop-theme'

/**
 * 初始化主题
 */
export async function initTheme() {
  // 从本地存储读取
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved) {
    theme.value = saved
  } else {
    // 跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.value = prefersDark ? 'dark' : 'light'
  }

  // 应用主题
  await applyTheme()

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      theme.value = e.matches ? 'dark' : 'light'
      await applyTheme()
    }
  })
}

/**
 * 切换主题
 */
export async function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  await applyTheme()
}

/**
 * 应用主题到DOM和Tauri窗口
 */
async function applyTheme() {
  const root = document.documentElement
  if (theme.value === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // 保存到本地
  localStorage.setItem(STORAGE_KEY, theme.value)

  // 同步Tauri原生窗口主题
  try {
    // 动态导入Tauri API，浏览器环境下不报错
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    await appWindow.setTheme(theme.value)
  } catch (e) {
    // 浏览器预览环境下忽略错误
    console.log('非Tauri环境，跳过原生主题同步')
  }
}

export function useTheme() {
  return {
    theme,
    toggleTheme,
    initTheme,
  }
}
