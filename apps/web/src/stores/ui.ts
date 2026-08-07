import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Theme } from '@/types/tool'

// 预设主题�?
export const PRESET_PRIMARY_COLORS = [
  { name: '蓝色', value: '#0071e3' }, // 苹果蓝（默认�?
  { name: '靛蓝', value: '#6366f1' },
  { name: '紫色', value: '#af52de' },
  { name: '粉色', value: '#ff375f' },
  { name: '橙色', value: '#ff9500' },
  { name: '绿色', value: '#34c759' },
  { name: '青色', value: '#30b0c7' },
  { name: '红色', value: '#ff3b30' },
]

export type CardSize = 'small' | 'medium' | 'large'
export type SidebarPosition = 'left' | 'right'

export interface LayoutSettings {
  gridColumns: number // 3-6�?
  cardSize: CardSize
  sidebarPosition: SidebarPosition
  sidebarCollapsed: boolean
  glassIntensity: number // 0-1 毛玻璃强�?
  borderRadius: number // 圆角大小 8-20px
}

export interface ThemeSettings {
  primaryColor: string
  backgroundColor: string
  customPrimary: boolean
  customBackground: boolean
  buttonBgColor: string
  tagBgColor: string
  iconBgColor: string
  customButtonBg: boolean
  customTagBg: boolean
  customIconBg: boolean
}

const DEFAULT_LAYOUT: LayoutSettings = {
  gridColumns: 4,
  cardSize: 'medium',
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  glassIntensity: 0.7,
  borderRadius: 18,
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#6366f1',
  backgroundColor: '#f0f0f5',
  customPrimary: false,
  customBackground: false,
  buttonBgColor: '',
  tagBgColor: '',
  iconBgColor: '',
  customButtonBg: false,
  customTagBg: false,
  customIconBg: false,
}

export const useUiStore = defineStore('ui', () => {
  // ========== State ==========
  const theme = ref<Theme>('auto')
  const activeCategory = ref('全部')
  const searchQuery = ref('')
  const selectMode = ref(false)
  const selectedSet = ref<Set<string>>(new Set())
  const showOnlyFav = ref(false)
  const toolTypeFilter = ref<'all' | 'web' | 'local'>('all')
  const showToolTypeFilter = ref(true)

  // 布局设置
  const layout = ref<LayoutSettings>({ ...DEFAULT_LAYOUT })
  // 主题设置
  const themeSettings = ref<ThemeSettings>({ ...DEFAULT_THEME })
  // 设置面板是否打开
  const settingsPanelOpen = ref(false)

  // Toast state
  const toastMessage = ref('')
  const toastVisible = ref(false)
  const toastUndoCallback = ref<(() => void) | null>(null)

  // Modal state
  const toolModalOpen = ref(false)
  const toolModalMode = ref<'add' | 'edit'>('add')
  const toolModalBuiltinEdit = ref(false)
  const toolModalBuiltinName = ref('')
  const toolModalBuiltinUrl = ref('')
  const toolModalEditIndex = ref(-1)

  const confirmModalOpen = ref(false)
  const confirmModalTitle = ref('确认删除')
  const confirmModalMessage = ref('')
  const confirmModalCallback = ref<(() => void) | null>(null)

  const renameModalOpen = ref(false)
  const renameModalOldName = ref('')

  // ========== Getters ==========
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const isMobile = computed(() => windowWidth.value <= 860)

  // 响应式列数：移动端固�?�?
  const effectiveGridColumns = computed(() => {
    if (isMobile.value) return 2
    return layout.value.gridColumns
  })

  // 向后兼容：sidebarCollapsed 直接访问
  const sidebarCollapsed = computed({
    get: () => layout.value.sidebarCollapsed,
    set: (val: boolean) => { layout.value.sidebarCollapsed = val }
  })

  function updateWindowWidth() {
    if (typeof window !== 'undefined') windowWidth.value = window.innerWidth
  }

  // ========== Theme ==========
  function setTheme(t: Theme) {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('gtb-theme', t)
    // 切换主题后重新应用CSS变量（深�?浅色模式默认颜色不同�?
    setTimeout(() => applyCssVariables(), 0)
  }

  function initTheme() {
    const saved = (localStorage.getItem('gtb-theme') || 'auto') as Theme
    setTheme(saved)
  }

  function getEffectiveTheme(): 'light' | 'dark' {
    if (theme.value === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
      return 'light'
    }
    return theme.value
  }

  function toggleTheme() {
    const current = getEffectiveTheme()
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  // ========== 自定义主�?==========
  /**
   * 应用CSS变量到根元素
   */
  function applyCssVariables() {
    const root = document.documentElement
    const effectiveTheme = getEffectiveTheme()

    // 主色：未自定义时跟随主题（浅�?0071e3 / 深色#4da6ff），自定义时始终使用所选颜�?
    let primaryToApply = themeSettings.value.primaryColor
    if (!themeSettings.value.customPrimary) {
      // 用户未主动选色，自动适配深/浅色模式变体
      primaryToApply = effectiveTheme === 'dark' ? '#818cf8' : '#6366f1'
    }
    root.style.setProperty('--primary', primaryToApply)
    root.style.setProperty('--primary-hover', adjustColor(primaryToApply, -10))
    root.style.setProperty('--primary-light', adjustColor(primaryToApply, 40))

    // 背景色：仅在用户自定义时覆盖，否则让 CSS 自行处理主题切换
    if (themeSettings.value.customBackground) {
      root.style.setProperty('--bg-primary', themeSettings.value.backgroundColor)
      root.style.setProperty('--bg-secondary', adjustColor(themeSettings.value.backgroundColor, -3))
      root.style.setProperty('--bg-tertiary', adjustColor(themeSettings.value.backgroundColor, -6))
    } else {
      root.style.removeProperty('--bg-primary')
      root.style.removeProperty('--bg-secondary')
      root.style.removeProperty('--bg-tertiary')
    }

    // 毛玻璃背�?
    const glassAlpha = layout.value.glassIntensity * 0.45
    if (effectiveTheme === 'dark') {
      root.style.setProperty('--glass-bg', `rgba(18, 18, 22, ${glassAlpha + 0.2})`)
      root.style.setProperty('--sidebar-bg', `rgba(18, 18, 22, ${glassAlpha + 0.25})`)
    } else {
      root.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${glassAlpha})`)
      root.style.setProperty('--sidebar-bg', `rgba(255, 255, 255, ${glassAlpha + 0.08})`)
    }

    // 圆角
    root.style.setProperty('--radius-lg', `${layout.value.borderRadius}px`)
    root.style.setProperty('--radius-md', `${layout.value.borderRadius - 6}px`)
    root.style.setProperty('--radius-sm', `${layout.value.borderRadius - 10}px`)

    // 自定义组件背景色
    if (themeSettings.value.customButtonBg && themeSettings.value.buttonBgColor) {
      root.style.setProperty('--card-btn-bg', themeSettings.value.buttonBgColor)
    } else {
      root.style.removeProperty('--card-btn-bg')
    }
    if (themeSettings.value.customTagBg && themeSettings.value.tagBgColor) {
      root.style.setProperty('--card-tag-bg', themeSettings.value.tagBgColor)
    } else {
      root.style.removeProperty('--card-tag-bg')
    }
    if (themeSettings.value.customIconBg && themeSettings.value.iconBgColor) {
      root.style.setProperty('--card-icon-bg', themeSettings.value.iconBgColor)
    } else {
      root.style.removeProperty('--card-icon-bg')
    }

    // 卡片大小对应的尺�?
    const cardSizeMap = {
      small: { minHeight: '100px', padding: '14px', fontSize: '13px' },
      medium: { minHeight: '120px', padding: '18px', fontSize: '14px' },
      large: { minHeight: '140px', padding: '22px', fontSize: '15px' },
    }
    const size = cardSizeMap[layout.value.cardSize]
    root.style.setProperty('--card-min-height', size.minHeight)
    root.style.setProperty('--card-padding', size.padding)
    root.style.setProperty('--card-font-size', size.fontSize)

    // 侧边栏位�?
    root.style.setProperty('--sidebar-order', layout.value.sidebarPosition === 'left' ? '0' : '2')
    root.style.setProperty('--content-order', layout.value.sidebarPosition === 'left' ? '1' : '0')
  }

  /**
   * 调整颜色亮度（amount: -100 �?100�?
   */
  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, (num >> 16) + amount))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  function setPrimaryColor(color: string) {
    themeSettings.value.primaryColor = color
    themeSettings.value.customPrimary = !PRESET_PRIMARY_COLORS.some(c => c.value === color)
    saveSettings()
    applyCssVariables()
  }

  function setBackgroundColor(color: string) {
    themeSettings.value.backgroundColor = color
    themeSettings.value.customBackground = true
    saveSettings()
    applyCssVariables()
  }

  function resetThemeColors() {
    themeSettings.value = { ...DEFAULT_THEME }
    saveSettings()
    applyCssVariables()
  }

    // ========== 自定义组件背景色 ==========
  function setButtonBgColor(color: string) {
    themeSettings.value.buttonBgColor = color
    themeSettings.value.customButtonBg = true
    saveSettings()
    applyCssVariables()
  }

  function setTagBgColor(color: string) {
    themeSettings.value.tagBgColor = color
    themeSettings.value.customTagBg = true
    saveSettings()
    applyCssVariables()
  }

  function setIconBgColor(color: string) {
    themeSettings.value.iconBgColor = color
    themeSettings.value.customIconBg = true
    saveSettings()
    applyCssVariables()
  }

  function resetButtonBgColor() {
    themeSettings.value.buttonBgColor = ''
    themeSettings.value.customButtonBg = false
    saveSettings()
    applyCssVariables()
  }

  function resetTagBgColor() {
    themeSettings.value.tagBgColor = ''
    themeSettings.value.customTagBg = false
    saveSettings()
    applyCssVariables()
  }

  function resetIconBgColor() {
    themeSettings.value.iconBgColor = ''
    themeSettings.value.customIconBg = false
    saveSettings()
    applyCssVariables()
  }

  function resetBgColors() {
    resetButtonBgColor()
    resetTagBgColor()
    resetIconBgColor()
  }

  // ========== 布局设置 ==========
  function setGridColumns(columns: number) {
    layout.value.gridColumns = Math.max(3, Math.min(6, columns))
    saveSettings()
    applyCssVariables()
  }

  function setCardSize(size: CardSize) {
    layout.value.cardSize = size
    saveSettings()
    applyCssVariables()
  }

  function setSidebarPosition(position: SidebarPosition) {
    layout.value.sidebarPosition = position
    saveSettings()
    applyCssVariables()
  }

  function toggleSidebar() {
    layout.value.sidebarCollapsed = !layout.value.sidebarCollapsed
    saveSettings()
  }

  function setGlassIntensity(intensity: number) {
    layout.value.glassIntensity = Math.max(0, Math.min(1, intensity))
    saveSettings()
    applyCssVariables()
  }

  function setBorderRadius(radius: number) {
    layout.value.borderRadius = Math.max(8, Math.min(24, radius))
    saveSettings()
    applyCssVariables()
  }

  function resetLayout() {
    layout.value = { ...DEFAULT_LAYOUT }
    saveSettings()
    applyCssVariables()
  }

  // ========== 设置面板 ==========
  function openSettingsPanel() {
    settingsPanelOpen.value = true
  }

  function closeSettingsPanel() {
    settingsPanelOpen.value = false
  }

  function toggleSettingsPanel() {
    settingsPanelOpen.value = !settingsPanelOpen.value
  }

  // ========== 持久�?==========
  function saveSettings() {
    localStorage.setItem('flexikit-layout', JSON.stringify(layout.value))
    localStorage.setItem('flexikit-theme-settings', JSON.stringify(themeSettings.value))
  }

  function loadSettings() {
    try {
      const savedLayout = localStorage.getItem('flexikit-layout')
      if (savedLayout) {
        layout.value = { ...DEFAULT_LAYOUT, ...JSON.parse(savedLayout) }
      }
      const savedTheme = localStorage.getItem('flexikit-theme-settings')
      if (savedTheme) {
        themeSettings.value = { ...DEFAULT_THEME, ...JSON.parse(savedTheme) }
      }
    } catch (e) {
      // ignore parse error
    }
  }

  function initAll() {
    initTheme()
    loadSettings()
    applyCssVariables()

    // 监听系统主题变化
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (theme.value === 'auto') {
          applyCssVariables()
        }
      })
      window.addEventListener('resize', updateWindowWidth)
      updateWindowWidth()
    }
  }

  // ========== Select Mode ==========
  function toggleSelect(key: string) {
    if (selectedSet.value.has(key)) {
      selectedSet.value.delete(key)
    } else {
      selectedSet.value.add(key)
    }
    selectedSet.value = new Set(selectedSet.value)
  }

  function enterSelectMode() {
    selectMode.value = true
  }

  function exitSelectMode() {
    selectMode.value = false
    selectedSet.value = new Set()
  }

  // ========== Toast ==========
  function showToast(message: string, undoCb?: () => void) {
    toastMessage.value = message
    toastVisible.value = true
    toastUndoCallback.value = undoCb || null
  }

  function hideToast() {
    toastVisible.value = false
  }

  // ========== Modals ==========
  function openToolModal(mode: 'add' | 'edit') {
    toolModalMode.value = mode
    toolModalOpen.value = true
  }

  function closeToolModal() {
    toolModalOpen.value = false
    toolModalBuiltinEdit.value = false
  }

  function openConfirmModal(title: string, message: string, callback: () => void) {
    confirmModalTitle.value = title
    confirmModalMessage.value = message
    confirmModalCallback.value = callback
    confirmModalOpen.value = true
  }

  function closeConfirmModal() {
    confirmModalOpen.value = false
    confirmModalCallback.value = null
  }

  function openRenameModal(oldName: string) {
    renameModalOldName.value = oldName
    renameModalOpen.value = true
  }

  function closeRenameModal() {
    renameModalOpen.value = false
  }

  return {
    // state
    theme, activeCategory, searchQuery, selectMode, selectedSet,
    showOnlyFav, sidebarCollapsed, toolTypeFilter, showToolTypeFilter,
    layout, themeSettings, settingsPanelOpen,
    toastMessage, toastVisible, toastUndoCallback,
    toolModalOpen, toolModalMode, toolModalBuiltinEdit,
    toolModalBuiltinName, toolModalBuiltinUrl, toolModalEditIndex,
    confirmModalOpen, confirmModalTitle, confirmModalMessage, confirmModalCallback,
    renameModalOpen, renameModalOldName,
    // getters
    isMobile, effectiveGridColumns,
    // methods
    updateWindowWidth,
    setTheme, initTheme, initAll, getEffectiveTheme, toggleTheme,
    applyCssVariables, setPrimaryColor, setBackgroundColor, resetThemeColors,
    setButtonBgColor, setTagBgColor, setIconBgColor,
    resetButtonBgColor, resetTagBgColor, resetIconBgColor,
    resetBgColors,
    setGridColumns, setCardSize, setSidebarPosition, toggleSidebar,
    setGlassIntensity, setBorderRadius, resetLayout,
    openSettingsPanel, closeSettingsPanel, toggleSettingsPanel,
    toggleSelect, enterSelectMode, exitSelectMode,
    showToast, hideToast,
    openToolModal, closeToolModal,
    openConfirmModal, closeConfirmModal,
    openRenameModal, closeRenameModal,
  }
})

