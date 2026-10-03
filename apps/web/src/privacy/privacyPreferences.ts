export const PRIVACY_PREFERENCES_KEY = 'flexikit-privacy-preferences-v1' as const
export const PRIVACY_PREFERENCES_VERSION = 1 as const

export const PRIVACY_DATA_KEYS = {
  searchRecents: 'flexikit-global-search-recents-v1',
  toolUsage: 'flexikit-tool-usage-v1',
  installedAppUsage: 'flexikit-installed-app-usage-v1',
  recommendationBehavior: 'flexikit-recommendation-behavior-v1',
  profileCache: 'flexikit-profiles',
  aiPromptHistory: 'flexikit-ai-prompt-history-v1',
} as const

export interface PrivacyPreferencesV1 {
  version: typeof PRIVACY_PREFERENCES_VERSION
  rememberSearchRecents: boolean
  usagePersonalization: boolean
  cacheProfileLocally: boolean
}

export type PrivacyPreferenceName =
  | 'rememberSearchRecents'
  | 'usagePersonalization'
  | 'cacheProfileLocally'

type LocalStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferencesV1 = {
  version: PRIVACY_PREFERENCES_VERSION,
  rememberSearchRecents: true,
  usagePersonalization: true,
  cacheProfileLocally: true,
}

function defaultStorage(): LocalStorageAdapter {
  return globalThis.localStorage
}

function defaults(): PrivacyPreferencesV1 {
  return { ...DEFAULT_PRIVACY_PREFERENCES }
}

export function readPrivacyPreferences(
  storage: LocalStorageAdapter = defaultStorage(),
): PrivacyPreferencesV1 {
  const raw = storage.getItem(PRIVACY_PREFERENCES_KEY)
  if (!raw) return defaults()

  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults()
    const record = value as Record<string, unknown>
    if (record.version !== PRIVACY_PREFERENCES_VERSION) return defaults()

    return {
      version: PRIVACY_PREFERENCES_VERSION,
      rememberSearchRecents: typeof record.rememberSearchRecents === 'boolean'
        ? record.rememberSearchRecents
        : DEFAULT_PRIVACY_PREFERENCES.rememberSearchRecents,
      usagePersonalization: typeof record.usagePersonalization === 'boolean'
        ? record.usagePersonalization
        : DEFAULT_PRIVACY_PREFERENCES.usagePersonalization,
      cacheProfileLocally: typeof record.cacheProfileLocally === 'boolean'
        ? record.cacheProfileLocally
        : DEFAULT_PRIVACY_PREFERENCES.cacheProfileLocally,
    }
  } catch {
    return defaults()
  }
}

export function clearRecordedActivityData(
  storage: LocalStorageAdapter = defaultStorage(),
): void {
  storage.removeItem(PRIVACY_DATA_KEYS.searchRecents)
  storage.removeItem(PRIVACY_DATA_KEYS.toolUsage)
  storage.removeItem(PRIVACY_DATA_KEYS.installedAppUsage)
  storage.removeItem(PRIVACY_DATA_KEYS.recommendationBehavior)
  storage.removeItem(PRIVACY_DATA_KEYS.aiPromptHistory)
}

export function clearCachedProfileData(
  storage: LocalStorageAdapter = defaultStorage(),
): void {
  storage.removeItem(PRIVACY_DATA_KEYS.profileCache)
}

function enforceDisabledRetention(
  storage: LocalStorageAdapter,
  preferences: PrivacyPreferencesV1,
): void {
  if (!preferences.rememberSearchRecents) {
    storage.removeItem(PRIVACY_DATA_KEYS.searchRecents)
  }
  if (!preferences.usagePersonalization) {
    storage.removeItem(PRIVACY_DATA_KEYS.toolUsage)
    storage.removeItem(PRIVACY_DATA_KEYS.installedAppUsage)
    storage.removeItem(PRIVACY_DATA_KEYS.recommendationBehavior)
  }
  if (!preferences.cacheProfileLocally) {
    clearCachedProfileData(storage)
  }
}

export function savePrivacyPreferences(
  next: PrivacyPreferencesV1,
  storage: LocalStorageAdapter = defaultStorage(),
): PrivacyPreferencesV1 {
  const normalized: PrivacyPreferencesV1 = {
    version: PRIVACY_PREFERENCES_VERSION,
    rememberSearchRecents: next.rememberSearchRecents === true,
    usagePersonalization: next.usagePersonalization === true,
    cacheProfileLocally: next.cacheProfileLocally === true,
  }

  storage.setItem(PRIVACY_PREFERENCES_KEY, JSON.stringify(normalized))
  enforceDisabledRetention(storage, normalized)
  return normalized
}

export function updatePrivacyPreference(
  name: PrivacyPreferenceName,
  enabled: boolean,
  storage: LocalStorageAdapter = defaultStorage(),
): PrivacyPreferencesV1 {
  return savePrivacyPreferences({
    ...readPrivacyPreferences(storage),
    [name]: enabled,
  }, storage)
}

export function isSearchRecentsEnabled(
  storage: LocalStorageAdapter = defaultStorage(),
): boolean {
  return readPrivacyPreferences(storage).rememberSearchRecents
}

export function isUsagePersonalizationEnabled(
  storage: LocalStorageAdapter = defaultStorage(),
): boolean {
  return readPrivacyPreferences(storage).usagePersonalization
}

export function isLocalProfileCacheEnabled(
  storage: LocalStorageAdapter = defaultStorage(),
): boolean {
  return readPrivacyPreferences(storage).cacheProfileLocally
}
