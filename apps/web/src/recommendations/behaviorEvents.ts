import { isUsagePersonalizationEnabled } from '../privacy/privacyPreferences'

export const RECOMMENDATION_BEHAVIOR_STORAGE_KEY = 'flexikit-recommendation-behavior-v1'
export const RECOMMENDATION_BEHAVIOR_VERSION = 1 as const
export const RECOMMENDATION_BEHAVIOR_MAX_EVENTS = 400
export const RECOMMENDATION_BEHAVIOR_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export type RecommendationBehaviorEventType =
  | 'tool_open'
  | 'favorite_add'
  | 'favorite_remove'

export interface RecommendationBehaviorEvent {
  type: RecommendationBehaviorEventType
  toolId: number
  occurredAt: number
}

interface RecommendationBehaviorStoreV1 {
  version: typeof RECOMMENDATION_BEHAVIOR_VERSION
  events: RecommendationBehaviorEvent[]
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const EVENT_TYPES = new Set<RecommendationBehaviorEventType>([
  'tool_open',
  'favorite_add',
  'favorite_remove',
])

function defaultStorage(): StorageAdapter {
  return globalThis.localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeEvent(
  value: unknown,
  now: number,
): RecommendationBehaviorEvent | null {
  if (!isRecord(value)) return null

  const type = value.type
  const toolId = value.toolId
  const occurredAt = value.occurredAt
  if (
    typeof type !== 'string'
    || !EVENT_TYPES.has(type as RecommendationBehaviorEventType)
    || !Number.isSafeInteger(toolId)
    || Number(toolId) <= 0
    || typeof occurredAt !== 'number'
    || !Number.isFinite(occurredAt)
    || occurredAt < now - RECOMMENDATION_BEHAVIOR_RETENTION_MS
    || occurredAt > now + 5 * 60 * 1000
  ) {
    return null
  }

  return {
    type: type as RecommendationBehaviorEventType,
    toolId: Number(toolId),
    occurredAt,
  }
}

export function readRecommendationBehaviorEvents(
  storage: StorageAdapter = defaultStorage(),
  now = Date.now(),
): RecommendationBehaviorEvent[] {
  if (!isUsagePersonalizationEnabled(storage)) return []

  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(RECOMMENDATION_BEHAVIOR_STORAGE_KEY) || '{}',
    )
    if (!isRecord(parsed) || parsed.version !== RECOMMENDATION_BEHAVIOR_VERSION) {
      return []
    }
    if (!Array.isArray(parsed.events)) return []

    return parsed.events
      .map(event => normalizeEvent(event, now))
      .filter((event): event is RecommendationBehaviorEvent => event !== null)
      .sort((left, right) => left.occurredAt - right.occurredAt)
      .slice(-RECOMMENDATION_BEHAVIOR_MAX_EVENTS)
  } catch {
    return []
  }
}

export function recordRecommendationBehaviorEvent(
  type: RecommendationBehaviorEventType,
  toolId: number,
  storage: StorageAdapter = defaultStorage(),
  occurredAt = Date.now(),
): boolean {
  if (!isUsagePersonalizationEnabled(storage)) return false
  if (!EVENT_TYPES.has(type)) return false
  if (!Number.isSafeInteger(toolId) || toolId <= 0) return false
  if (!Number.isFinite(occurredAt)) return false

  const events = readRecommendationBehaviorEvents(storage, occurredAt)
  events.push({ type, toolId, occurredAt })

  const payload: RecommendationBehaviorStoreV1 = {
    version: RECOMMENDATION_BEHAVIOR_VERSION,
    events: events.slice(-RECOMMENDATION_BEHAVIOR_MAX_EVENTS),
  }
  storage.setItem(RECOMMENDATION_BEHAVIOR_STORAGE_KEY, JSON.stringify(payload))
  return true
}

export function clearRecommendationBehaviorEvents(
  storage: StorageAdapter = defaultStorage(),
): void {
  storage.removeItem(RECOMMENDATION_BEHAVIOR_STORAGE_KEY)
}
