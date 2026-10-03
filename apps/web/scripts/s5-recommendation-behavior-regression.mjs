import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries))
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
}

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-behavior-events-test-'))
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc')
const behaviorSource = path.join(process.cwd(), 'src', 'recommendations', 'behaviorEvents.ts')
const privacySource = path.join(process.cwd(), 'src', 'privacy', 'privacyPreferences.ts')

try {
  execFileSync(process.execPath, [
    tsc,
    behaviorSource,
    privacySource,
    '--target', 'ES2022',
    '--module', 'CommonJS',
    '--moduleResolution', 'Node',
    '--lib', 'ES2022,DOM',
    '--skipLibCheck',
    '--outDir', workDir,
  ], { stdio: 'pipe' })

  const require = createRequire(import.meta.url)
  const behavior = require(path.join(workDir, 'recommendations', 'behaviorEvents.js'))
  const privacy = require(path.join(workDir, 'privacy', 'privacyPreferences.js'))
  const storage = new FakeStorage()
  const now = Date.UTC(2026, 8, 27, 2, 0, 0)

  assert.equal(behavior.recordRecommendationBehaviorEvent('tool_open', 7, storage, now), true)
  assert.equal(behavior.recordRecommendationBehaviorEvent('favorite_add', 7, storage, now + 1), true)
  assert.equal(behavior.recordRecommendationBehaviorEvent('favorite_remove', 7, storage, now + 2), true)
  assert.equal(behavior.recordRecommendationBehaviorEvent('tool_open', 0, storage, now + 3), false)

  assert.deepEqual(behavior.readRecommendationBehaviorEvents(storage, now + 10), [
    { type: 'tool_open', toolId: 7, occurredAt: now },
    { type: 'favorite_add', toolId: 7, occurredAt: now + 1 },
    { type: 'favorite_remove', toolId: 7, occurredAt: now + 2 },
  ])
  const serialized = storage.getItem(behavior.RECOMMENDATION_BEHAVIOR_STORAGE_KEY)
  assert.equal(serialized.includes('query'), false)
  assert.equal(serialized.includes('name'), false)
  assert.equal(serialized.includes('url'), false)
  assert.equal(serialized.includes('path'), false)

  const oldTime = now - behavior.RECOMMENDATION_BEHAVIOR_RETENTION_MS - 1
  storage.setItem(
    behavior.RECOMMENDATION_BEHAVIOR_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      events: [
        { type: 'tool_open', toolId: 1, occurredAt: oldTime },
        { type: 'tool_open', toolId: 2, occurredAt: now },
      ],
    }),
  )
  assert.deepEqual(
    behavior.readRecommendationBehaviorEvents(storage, now),
    [{ type: 'tool_open', toolId: 2, occurredAt: now }],
  )

  const capped = new FakeStorage()
  for (let index = 0; index < behavior.RECOMMENDATION_BEHAVIOR_MAX_EVENTS + 5; index += 1) {
    behavior.recordRecommendationBehaviorEvent('tool_open', 9, capped, now + index)
  }
  assert.equal(
    behavior.readRecommendationBehaviorEvents(
      capped,
      now + behavior.RECOMMENDATION_BEHAVIOR_MAX_EVENTS + 10,
    ).length,
    behavior.RECOMMENDATION_BEHAVIOR_MAX_EVENTS,
  )

  privacy.updatePrivacyPreference('usagePersonalization', false, capped)
  assert.equal(capped.getItem(behavior.RECOMMENDATION_BEHAVIOR_STORAGE_KEY), null)
  assert.equal(behavior.recordRecommendationBehaviorEvent('tool_open', 9, capped, now), false)

  const projectRoot = process.cwd()
  const toolUsage = readFileSync(path.join(projectRoot, 'src', 'utils', 'toolUsage.ts'), 'utf8')
  const toolsStore = readFileSync(path.join(projectRoot, 'src', 'stores', 'tools.ts'), 'utf8')
  const privacySourceText = readFileSync(privacySource, 'utf8')
  const lifecycle = readFileSync(path.join(projectRoot, 'src', 'utils', 'localDataLifecycle.ts'), 'utf8')
  const backup = readFileSync(path.join(projectRoot, 'src', 'utils', 'localDataBackup.ts'), 'utf8')
  const dataManagement = readFileSync(path.join(projectRoot, 'src', 'views', 'DataManagement.vue'), 'utf8')
  const behaviorText = readFileSync(behaviorSource, 'utf8')

  assert.match(toolUsage, /recordRecommendationBehaviorEvent\('tool_open', tool\.id\)/)
  assert.match(toolsStore, /recordRecommendationBehaviorEvent\('favorite_add', targetTool\.id\)/)
  assert.match(toolsStore, /recordRecommendationBehaviorEvent\('favorite_remove', targetTool\.id\)/)
  assert.match(privacySourceText, /recommendationBehavior: 'flexikit-recommendation-behavior-v1'/)
  assert.match(lifecycle, /'flexikit-recommendation-behavior-v1'/)
  const backupAllowlist = backup.slice(
    backup.indexOf('export const BACKUP_STORAGE_KEYS'),
    backup.indexOf('] as const', backup.indexOf('export const BACKUP_STORAGE_KEYS')) + 10,
  )
  assert.equal(backupAllowlist.includes('flexikit-recommendation-behavior-v1'), false)
  assert.match(dataManagement, /不上传服务器/)
  assert.equal(behaviorText.includes('fetch('), false)
  assert.equal(behaviorText.includes('@/api'), false)

  console.log('behavior taxonomy stores only tool id, event type and timestamp: PASS')
  console.log('behavior retention is bounded to 90 days and 400 events: PASS')
  console.log('usage personalization opt-out purges and blocks behavior recording: PASS')
  console.log('tool opens and favorite add/remove feed the local event foundation: PASS')
  console.log('behavior data is covered by local clear lifecycle and excluded from backup/upload: PASS')
  console.log('S5.3 recommendation behavior regression: PASS')
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
