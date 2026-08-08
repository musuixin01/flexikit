export interface Tool {
  name: string
  cat: string
  desc: string
  url: string
  tags: string[]
  icon: string
  isCustom?: boolean
  customIcon?: string | null
  localPath?: string | null
  cardColor?: string | null
  id?: number
  description?: string
  category?: string | null
  is_custom?: boolean
  local_path?: string | null
  card_color?: string | null
}

export interface ToolListResponse {
  items: Tool[]
  total: number
}

export interface WebsitePreview {
  title: string
  description: string
  imageUrl: string | null
  themeColor: string | null
}

export interface DeletedItem {
  tool: Tool
  type: 'builtin' | 'custom'
  index: number
}

export interface DeletedBatch {
  items: DeletedItem[]
  isBatch: boolean
}

export interface ExportData {
  version: string
  exportDate: string
  customTools: Tool[]
  catOrder: string[]
  toolOrder: string[]
  theme: string
  favorites: string[]
}

export type Theme = 'auto' | 'light' | 'dark'
