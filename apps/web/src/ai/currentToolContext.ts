import { readonly, shallowRef } from 'vue'
import type { Tool } from '@/types/tool'

export interface CurrentToolContext {
  id?: number
  name: string
  category?: string
  kind: 'web' | 'local'
  host?: string
}

const currentToolContextState = shallowRef<CurrentToolContext | null>(null)

function compact(value: string | null | undefined, maxLength: number): string | undefined {
  const normalized = value?.trim()
  if (!normalized) return undefined
  return normalized.slice(0, maxLength)
}

function safeWebHost(tool: Tool): string | undefined {
  try {
    const url = new URL(tool.url)
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    return compact(url.hostname.toLowerCase(), 255)
  } catch {
    return undefined
  }
}

export function toCurrentToolContext(tool: Tool): CurrentToolContext | null {
  const name = compact(tool.name, 160)
  if (!name) return null

  const isLocal = Boolean(tool.localPath || tool.local_path)
  const category = compact(tool.category || tool.cat, 120)
  const id = Number.isSafeInteger(tool.id) && (tool.id ?? 0) > 0
    ? tool.id
    : undefined
  const host = isLocal ? undefined : safeWebHost(tool)

  return {
    ...(id ? { id } : {}),
    name,
    ...(category ? { category } : {}),
    kind: isLocal ? 'local' : 'web',
    ...(host ? { host } : {}),
  }
}

export function recordCurrentToolContext(tool: Tool): void {
  const context = toCurrentToolContext(tool)
  if (context) currentToolContextState.value = context
}

export function clearCurrentToolContext(): void {
  currentToolContextState.value = null
}

export const currentToolContext = readonly(currentToolContextState)
