export const LOCAL_USER_DATA_KEYS = [
  'gtb-custom',
  'gtb-order',
  'gtb-favorites',
  'gtb-cat-order',
  'flexikit-desktop-canvas-v1',
  'flexikit-desktop-canvas-v2',
  'flexikit-global-search-recents-v1',
  'flexikit-installed-app-usage-v1',
  'flexikit-tool-usage-v1',
  'flexikit-recommendation-behavior-v1',
  'flexikit-profiles',
  'flexikit-trending-tools-v1',
  'flexikit-pet-search',
  'flexikit-ai-prompt-history-v1',
] as const

export type LocalUserDataKey = typeof LOCAL_USER_DATA_KEYS[number]

export interface ClearLocalUserDataResult {
  removedKeys: LocalUserDataKey[]
}

type LocalStorageAdapter = Pick<Storage, 'getItem' | 'removeItem'>

function defaultStorage(): LocalStorageAdapter {
  return globalThis.localStorage
}

export function clearLocalUserData(
  storage: LocalStorageAdapter = defaultStorage(),
): ClearLocalUserDataResult {
  const removedKeys: LocalUserDataKey[] = []

  for (const key of LOCAL_USER_DATA_KEYS) {
    if (storage.getItem(key) !== null) {
      storage.removeItem(key)
      removedKeys.push(key)
    }
  }

  return { removedKeys }
}
