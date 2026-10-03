import type { WidgetAppearance, WidgetAppearancePreset } from '@/types/desktopWidget'

export interface WidgetAppearancePresetDefinition {
  id: Exclude<WidgetAppearancePreset, 'custom'>
  title: string
  description: string
  appearance: WidgetAppearance
}

export const DEFAULT_WIDGET_APPEARANCE: WidgetAppearance = {
  preset: 'glass',
  tone: 'adaptive',
  opacity: 0.94,
  borderRadius: 20,
  blur: 28,
  surfaceOpacity: 0.72,
  borderStrength: 0.18,
  shadowStrength: 0.06,
}

export const WIDGET_APPEARANCE_PRESETS: readonly WidgetAppearancePresetDefinition[] = [
  {
    id: 'glass',
    title: '玻璃',
    description: '平衡通透与层次',
    appearance: { ...DEFAULT_WIDGET_APPEARANCE },
  },
  {
    id: 'space',
    title: '深空',
    description: '更沉稳的深色表面',
    appearance: {
      preset: 'space',
      tone: 'dark',
      opacity: 0.97,
      borderRadius: 22,
      blur: 34,
      surfaceOpacity: 0.88,
      borderStrength: 0.12,
      shadowStrength: 0.2,
    },
  },
  {
    id: 'clear',
    title: '轻透',
    description: '更轻、更少遮挡桌面',
    appearance: {
      preset: 'clear',
      tone: 'adaptive',
      opacity: 0.92,
      borderRadius: 20,
      blur: 16,
      surfaceOpacity: 0.3,
      borderStrength: 0.16,
      shadowStrength: 0.04,
    },
  },
  {
    id: 'solid',
    title: '实色',
    description: '清晰稳定、弱化玻璃',
    appearance: {
      preset: 'solid',
      tone: 'adaptive',
      opacity: 1,
      borderRadius: 18,
      blur: 0,
      surfaceOpacity: 0.98,
      borderStrength: 0.1,
      shadowStrength: 0.1,
    },
  },
]

export function isWidgetAppearancePreset(value: unknown): value is WidgetAppearancePreset {
  return value === 'glass'
    || value === 'space'
    || value === 'clear'
    || value === 'solid'
    || value === 'custom'
}

export function isWidgetSurfaceTone(value: unknown): value is WidgetAppearance['tone'] {
  return value === 'adaptive' || value === 'dark' || value === 'light'
}
