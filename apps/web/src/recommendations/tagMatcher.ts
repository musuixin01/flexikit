import type { Tool } from '../types/tool'
import type {
  RecommendationBehaviorEvent,
  RecommendationBehaviorEventType,
} from './behaviorEvents'

const EVENT_WEIGHTS: Readonly<Record<RecommendationBehaviorEventType, number>> = {
  tool_open: 1,
  favorite_add: 4,
  favorite_remove: -4,
}

const TAG_MULTIPLIER = 2
const CATEGORY_MULTIPLIER = 1
const FEATURE_AFFINITY_LIMIT = 24
const MAX_FEATURE_LENGTH = 64

export interface TagAffinityProfile {
  tags: ReadonlyMap<string, number>
  categories: ReadonlyMap<string, number>
}

export interface TagMatchResult<T extends Tool> {
  tool: T
  score: number
  matchedTag?: string
  matchedCategory?: string
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeFeature(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
  if (!normalized || normalized.length > MAX_FEATURE_LENGTH) return null
  return normalized
}

function normalizedTags(tool: Tool): string[] {
  const rawTags: unknown = tool.tags
  if (!Array.isArray(rawTags)) return []
  const result = new Set<string>()
  for (const rawTag of rawTags) {
    const tag = normalizeFeature(rawTag)
    if (tag) result.add(tag)
  }
  return [...result]
}

function normalizedCategory(tool: Tool): string | null {
  const category = normalizeFeature(tool.category || tool.cat)
  if (!category || category === '未分类') return null
  return category
}

function addAffinity(target: Map<string, number>, feature: string, delta: number): void {
  target.set(
    feature,
    clamp(
      (target.get(feature) ?? 0) + delta,
      -FEATURE_AFFINITY_LIMIT,
      FEATURE_AFFINITY_LIMIT,
    ),
  )
}

export function buildTagAffinityProfile(
  catalog: readonly Tool[],
  events: readonly RecommendationBehaviorEvent[],
): TagAffinityProfile {
  const toolsById = new Map<number, Tool>()
  for (const tool of catalog) {
    if (tool.id != null && Number.isSafeInteger(tool.id) && tool.id > 0) {
      toolsById.set(tool.id, tool)
    }
  }

  const tags = new Map<string, number>()
  const categories = new Map<string, number>()
  for (const event of events) {
    const sourceTool = toolsById.get(event.toolId)
    if (!sourceTool) continue
    const eventWeight = EVENT_WEIGHTS[event.type]
    for (const tag of normalizedTags(sourceTool)) {
      addAffinity(tags, tag, eventWeight * TAG_MULTIPLIER)
    }
    const category = normalizedCategory(sourceTool)
    if (category) {
      addAffinity(categories, category, eventWeight * CATEGORY_MULTIPLIER)
    }
  }

  return { tags, categories }
}

export function getTagMatchScore(
  tool: Tool,
  profile: Readonly<TagAffinityProfile>,
): number {
  let score = 0
  for (const tag of normalizedTags(tool)) {
    score += profile.tags.get(tag) ?? 0
  }
  const category = normalizedCategory(tool)
  if (category) score += profile.categories.get(category) ?? 0
  return score
}

function strongestPositiveFeature(
  tool: Tool,
  profile: Readonly<TagAffinityProfile>,
): Pick<TagMatchResult<Tool>, 'matchedTag' | 'matchedCategory'> {
  let matchedTag: string | undefined
  let tagAffinity = 0
  for (const tag of normalizedTags(tool)) {
    const affinity = profile.tags.get(tag) ?? 0
    if (affinity > tagAffinity) {
      tagAffinity = affinity
      matchedTag = tag
    }
  }

  const category = normalizedCategory(tool)
  const categoryAffinity = category ? (profile.categories.get(category) ?? 0) : 0
  if (category && categoryAffinity > 0 && categoryAffinity > tagAffinity) {
    return { matchedCategory: category }
  }
  return matchedTag && tagAffinity > 0 ? { matchedTag } : {}
}

export function rankToolsByTagMatch<T extends Tool>(
  candidates: readonly T[],
  catalog: readonly Tool[],
  events: readonly RecommendationBehaviorEvent[],
): TagMatchResult<T>[] {
  const profile = buildTagAffinityProfile(catalog, events)
  return candidates
    .map((tool, index) => ({
      tool,
      score: getTagMatchScore(tool, profile),
      index,
      ...strongestPositiveFeature(tool, profile),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ tool, score, matchedTag, matchedCategory }) => ({
      tool,
      score,
      ...(matchedTag ? { matchedTag } : {}),
      ...(matchedCategory ? { matchedCategory } : {}),
    }))
}
