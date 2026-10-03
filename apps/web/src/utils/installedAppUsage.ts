import type { InstalledApp } from '@/desktop/installedApps'
import { isSearchRecentsEnabled, isUsagePersonalizationEnabled } from '@/privacy/privacyPreferences'

const STORAGE_KEY = 'flexikit-installed-app-usage-v1'
const GLOBAL_SEARCH_RECENTS_KEY = 'flexikit-global-search-recents-v1'

export interface InstalledAppUsageEntry {
  count: number
  lastOpenedAt: number
}

export type InstalledAppUsageMap = Record<string, InstalledAppUsageEntry>

interface GlobalSearchRecentApp {
  kind?: string
  name?: string
  lastOpenedAt?: number
}

const BASELINE_NOISE = [
  /\buninstall(er)?\b/i,
  /\bupdate(r)?\b/i,
  /\bruntime\b/i,
  /\bredistributable\b/i,
  /\bsdk\b/i,
  /\bdriver\b/i,
  /\bservice\b/i,
  /\bhelper\b/i,
  /\bcomponent\b/i,
  /\binstaller\b/i,
  /\bsetup\b/i,
  /\bcrash\b/i,
  /\bdebug\b/i,
  /\brepair\b/i,
]

export function normalizeInstalledAppName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function getInstalledAppStableKey(app: InstalledApp): string {
  return `app:${normalizeInstalledAppName(app.name)}`
}

export function getInstalledAppUsageKey(app: InstalledApp): string {
  return `${normalizeInstalledAppName(app.name)}|${app.launchKind}|${app.launchTarget.toLocaleLowerCase()}`
}

export function readInstalledAppUsage(): InstalledAppUsageMap {
  if (!isUsagePersonalizationEnabled()) return {}
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return value && typeof value === 'object' ? value as InstalledAppUsageMap : {}
  } catch {
    return {}
  }
}

export function recordInstalledAppUsage(app: InstalledApp): void {
  if (!isUsagePersonalizationEnabled()) return
  const usage = readInstalledAppUsage()
  const key = getInstalledAppUsageKey(app)
  const previous = usage[key]
  usage[key] = {
    count: Math.min((previous?.count || 0) + 1, 10_000),
    lastOpenedAt: Date.now(),
  }

  const compactUsage = Object.fromEntries(
    Object.entries(usage)
      .sort(([, left], [, right]) => right.lastOpenedAt - left.lastOpenedAt)
      .slice(0, 160),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compactUsage))
}

export function getPersonalInstalledAppScore(app: InstalledApp, usage: InstalledAppUsageMap): number {
  const entry = usage[getInstalledAppUsageKey(app)]
  if (!entry) return 0

  const ageHours = Math.max(0, (Date.now() - entry.lastOpenedAt) / 3_600_000)
  const recencyScore = Math.max(0, 24 - ageHours / 8)
  const frequencyScore = Math.log2(entry.count + 1) * 18
  return frequencyScore + recencyScore
}

export function readGlobalSearchAppBoosts(): Record<string, number> {
  if (!isUsagePersonalizationEnabled() || !isSearchRecentsEnabled()) return {}
  try {
    const value = JSON.parse(localStorage.getItem(GLOBAL_SEARCH_RECENTS_KEY) || '[]')
    if (!Array.isArray(value)) return {}

    const boosts: Record<string, number> = {}
    value
      .filter((item): item is GlobalSearchRecentApp => item && typeof item === 'object' && item.kind === 'app' && typeof item.name === 'string')
      .slice(0, 20)
      .forEach((item, index) => {
        const key = normalizeInstalledAppName(item.name || '')
        if (!key) return
        const ageHours = typeof item.lastOpenedAt === 'number'
          ? Math.max(0, (Date.now() - item.lastOpenedAt) / 3_600_000)
          : 0
        boosts[key] = Math.max(boosts[key] || 0, Math.max(4, 36 - index * 2 - ageHours / 24))
      })
    return boosts
  } catch {
    return {}
  }
}

export function getInstalledAppRecommendationScore(
  app: InstalledApp,
  usage: InstalledAppUsageMap,
  globalSearchBoosts: Record<string, number>,
): number {
  if (!app.launchTarget || !app.launchKind) return Number.NEGATIVE_INFINITY

  const personalScore = getPersonalInstalledAppScore(app, usage)
  const recentBoost = globalSearchBoosts[normalizeInstalledAppName(app.name)] || 0
  const sourceScore = app.source.includes('start-menu')
    ? 56
    : app.source.includes('package')
      ? 48
      : 18
  const launchScore = app.launchKind === 'url' ? 3 : 10
  const multiSourceBonus = app.source.includes('+') ? 4 : 0
  const baselinePenalty = personalScore <= 0
    && recentBoost <= 0
    && BASELINE_NOISE.some(pattern => pattern.test(app.name))
    ? 120
    : 0

  return personalScore * 2 + recentBoost + sourceScore + launchScore + multiSourceBonus - baselinePenalty
}
