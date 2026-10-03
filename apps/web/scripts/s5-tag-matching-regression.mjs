import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-tag-matching-test-'))
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc')
const sources = [
  path.join(process.cwd(), 'src', 'recommendations', 'tagMatcher.ts'),
  path.join(process.cwd(), 'src', 'recommendations', 'behaviorEvents.ts'),
  path.join(process.cwd(), 'src', 'privacy', 'privacyPreferences.ts'),
  path.join(process.cwd(), 'src', 'types', 'tool.ts'),
]

function tool(id, name, category, tags) {
  return { id, name, cat: category, category, desc: '', url: 'https://example.test/' + id, tags, icon: '' }
}

try {
  execFileSync(process.execPath, [
    tsc,
    ...sources,
    '--target', 'ES2022',
    '--module', 'CommonJS',
    '--moduleResolution', 'Node',
    '--lib', 'ES2022,DOM',
    '--skipLibCheck',
    '--outDir', workDir,
  ], { stdio: 'pipe' })

  const require = createRequire(import.meta.url)
  const matcher = require(path.join(workDir, 'recommendations', 'tagMatcher.js'))
  const catalog = [
    tool(1, 'Code Tool', 'Developer', ['Code', 'AI']),
    tool(2, 'Design Tool', 'Design', [' UI ', 'ai']),
  ]
  const candidates = [
    tool(11, 'Code Candidate', 'developer', ['code']),
    tool(12, 'Design Candidate', 'DESIGN', ['ui']),
    tool(13, 'Neutral A', 'Office', ['docs']),
    tool(14, 'Neutral B', 'Office', ['docs']),
  ]

  const designFavored = matcher.rankToolsByTagMatch(candidates, catalog, [
    { type: 'tool_open', toolId: 1, occurredAt: 1 },
    { type: 'favorite_add', toolId: 2, occurredAt: 2 },
  ])
  assert.equal(designFavored[0].tool.id, 12)
  assert.ok(designFavored[0].score > designFavored[1].score)
  assert.equal(designFavored[0].matchedTag, 'ui')
  assert.equal(designFavored[0].matchedCategory, undefined)

  const designRemoved = matcher.rankToolsByTagMatch(candidates, catalog, [
    { type: 'tool_open', toolId: 1, occurredAt: 1 },
    { type: 'favorite_add', toolId: 2, occurredAt: 2 },
    { type: 'favorite_remove', toolId: 2, occurredAt: 3 },
  ])
  assert.equal(designRemoved[0].tool.id, 11)
  assert.equal(designRemoved[0].matchedTag, 'code')

  const ties = matcher.rankToolsByTagMatch([candidates[2], candidates[3]], catalog, [])
  assert.deepEqual(ties.map(item => item.tool.id), [13, 14])

  const malformedProfile = matcher.buildTagAffinityProfile(
    [{ ...tool(5, 'Malformed', '未分类', []), tags: [null, 4, ' AI ', 'ai'] }],
    [{ type: 'tool_open', toolId: 5, occurredAt: 1 }],
  )
  assert.equal(malformedProfile.tags.get('ai'), 2)
  assert.equal(malformedProfile.categories.size, 0)

  const missingToolProfile = matcher.buildTagAffinityProfile(
    catalog,
    [{ type: 'favorite_add', toolId: 999, occurredAt: 1 }],
  )
  assert.equal(missingToolProfile.tags.size, 0)

  const repeated = Array.from({ length: 100 }, (_, index) => ({
    type: 'tool_open',
    toolId: 1,
    occurredAt: index,
  }))
  const bounded = matcher.buildTagAffinityProfile(catalog, repeated)
  assert.equal(bounded.tags.get('code'), 24)
  assert.equal(bounded.categories.get('developer'), 24)

  const root = process.cwd()
  const sourceText = readFileSync(sources[0], 'utf8')
  const discover = readFileSync(path.join(root, 'src', 'views', 'Discover.vue'), 'utf8')
  assert.equal(/hot_score|view_count|click_count|Math\.random|Date\.now/.test(sourceText), false)
  assert.equal(sourceText.includes('fetch('), false)
  assert.match(discover, /rankToolsByTagMatch/)
  assert.match(discover, /readRecommendationBehaviorEvents/)
  assert.equal(/rankList\.value\s*=\s*rankToolsByTagMatch/.test(discover), false)

  const typecheck = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(typecheck.status, 0, typecheck.stderr || typecheck.stdout)

  console.log('tag/category affinity uses deterministic bounded event weights: PASS')
  console.log('favorite removal cancels prior favorite affinity and missing tools are ignored: PASS')
  console.log('tag normalization handles case/whitespace/malformed runtime tags: PASS')
  console.log('equal tag scores preserve original candidate order: PASS')
  console.log('tag matcher contains no heat/recency/random/server behavior: PASS')
  console.log('Discover recommendation candidates use local tag matching without touching ranking list: PASS')
  console.log('positive local affinity exposes only the strongest matched tag/category for explanation: PASS')
  console.log('S5.3 tag matching regression: PASS')
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
