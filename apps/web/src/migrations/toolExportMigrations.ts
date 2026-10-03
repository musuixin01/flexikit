import type { ExportData, Tool } from '../types/tool.js'

export const TOOL_EXPORT_VERSION = '1.0' as const

export interface ToolExportDataV1 extends Omit<ExportData, 'version' | 'theme'> {
  version: typeof TOOL_EXPORT_VERSION
  theme: 'auto' | 'light' | 'dark'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function isToolImportCandidate(value: unknown): value is Tool {
  if (!isRecord(value)) return false
  return typeof value.name === 'string'
    && typeof value.url === 'string'
}

export function migrateToolExportData(value: unknown): ToolExportDataV1 {
  if (!isRecord(value)) {
    throw new Error('无效的工具导入文件格式')
  }

  const sourceVersion = value.version
  if (sourceVersion !== undefined && sourceVersion !== TOOL_EXPORT_VERSION) {
    throw new Error(`不支持的工具导入版本：${String(sourceVersion)}`)
  }

  if (!Array.isArray(value.customTools)) {
    throw new Error('无效的工具导入文件格式')
  }

  const customTools = value.customTools.filter(isToolImportCandidate)
  if (customTools.length !== value.customTools.length) {
    throw new Error('工具导入文件包含无效工具数据')
  }

  const theme: ToolExportDataV1['theme'] = value.theme === 'light' || value.theme === 'dark' || value.theme === 'auto'
    ? value.theme
    : 'auto'

  return {
    version: TOOL_EXPORT_VERSION,
    exportDate: typeof value.exportDate === 'string' ? value.exportDate : '',
    customTools,
    catOrder: stringArray(value.catOrder),
    toolOrder: stringArray(value.toolOrder),
    theme,
    favorites: stringArray(value.favorites),
  }
}
