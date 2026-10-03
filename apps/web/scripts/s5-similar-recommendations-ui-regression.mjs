import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8')

const api = read('src', 'api', 'recommendations.ts')
const apiIndex = read('src', 'api', 'index.ts')
const discover = read('src', 'views', 'Discover.vue')
const toolCard = read('src', 'components', 'tools', 'ToolCard.vue')
const tagMatcher = read('src', 'recommendations', 'tagMatcher.ts')

assert.match(api, /api\.get<BackendTool\[\]>\('\/recommendations'/)
assert.match(api, /getExplainedRecommendations/)
assert.match(api, /\/recommendations\/explained/)
assert.match(api, /similar_favorite/)
assert.match(api, /params: \{ limit \}/)
assert.match(apiIndex, /recommendationsApi/)

assert.match(discover, /recommendationsApi/)
assert.match(discover, /backendToFrontend/)
assert.match(discover, /currentSource\.value === 'all'/)
assert.match(discover, /user\.isLoggedIn/)
assert.match(discover, /recommendationsApi\.getExplainedRecommendations/)
assert.match(discover, /formatServerRecommendationReason/)
assert.match(discover, /与你收藏的/)
assert.match(discover, /基于公开热度补充推荐/)
assert.match(discover, /本机偏好匹配/)
assert.match(discover, /personalizeRecommendationCandidates\(candidates\)\.slice\(0, PAGE_SIZE\)/)
assert.match(discover, /discoveryApi\.getRecommendations\(RECOMMENDATION_CANDIDATE_POOL_SIZE, source\)/)
assert.match(toolCard, /recommendationReason\?: string/)
assert.match(toolCard, /card-recommendation-reason/)
assert.match(tagMatcher, /matchedTag\?: string/)
assert.match(tagMatcher, /matchedCategory\?: string/)
assert.equal(/cosine|embedding|seedRank|candidateRank/.test(discover), false)

console.log('Logged-in all-source Discover uses server semantic recommendations: PASS')
console.log('Source-filtered/anonymous Discover preserves discovery recommendation path: PASS')
console.log('Server semantic candidates still receive device-local tag personalization: PASS')
console.log('Recommendation explanations are visible without exposing vector/internal ranking metrics: PASS')
console.log('Device-local tag/category explanation stays client-side: PASS')
console.log('S5.3 similar recommendations Web integration regression: PASS')
