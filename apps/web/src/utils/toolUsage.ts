import type { Tool } from '@/types/tool'
import { isUsagePersonalizationEnabled } from '@/privacy/privacyPreferences'
import { recordRecommendationBehaviorEvent } from '@/recommendations/behaviorEvents'

const STORAGE_KEY = 'flexikit-tool-usage-v1'

export interface ToolUsageEntry {
  count: number
  lastOpenedAt: number
}

export type ToolUsageMap = Record<string, ToolUsageEntry>

export function getToolUsageKey(tool: Tool): string {
  if (tool.id != null) return `id:${tool.id}`
  return `${tool.name}|${tool.url || tool.localPath || tool.local_path || ''}`.trim().toLowerCase()
}

export function readToolUsage(): ToolUsageMap {
  if (!isUsagePersonalizationEnabled()) return {}
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return value && typeof value === 'object' ? value as ToolUsageMap : {}
  } catch {
    return {}
  }
}

export function recordToolUsage(tool: Tool): void {
  if (!isUsagePersonalizationEnabled()) return
  const usage = readToolUsage()
  const key = getToolUsageKey(tool)
  const previous = usage[key]
  usage[key] = {
    count: Math.min((previous?.count || 0) + 1, 10_000),
    lastOpenedAt: Date.now(),
  }

  const compactUsage = Object.fromEntries(
    Object.entries(usage)
      .sort(([, a], [, b]) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, 120),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compactUsage))
  if (tool.id != null) {
    recordRecommendationBehaviorEvent('tool_open', tool.id)
  }
}

export function getPersonalToolScore(tool: Tool, usage: ToolUsageMap): number {
  const entry = usage[getToolUsageKey(tool)]
  if (!entry) return 0

  const ageHours = Math.max(0, (Date.now() - entry.lastOpenedAt) / 3_600_000)
  const recencyScore = Math.max(0, 18 - ageHours / 12)
  const frequencyScore = Math.log2(entry.count + 1) * 14
  return frequencyScore + recencyScore
}
