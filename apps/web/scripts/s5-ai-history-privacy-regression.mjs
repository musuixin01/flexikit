import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8')
const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-ai-history-policy-'))
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const policySource = path.join(root, 'src', 'privacy', 'assistantHistoryPolicy.ts')

try {
  execFileSync(process.execPath, [
    tsc,
    policySource,
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--moduleResolution', 'Bundler',
    '--lib', 'ES2022,DOM',
    '--skipLibCheck',
    '--outDir', workDir,
  ], { stdio: 'pipe' })

  const policy = await import(
    pathToFileURL(path.join(workDir, 'assistantHistoryPolicy.js')).href
      + '?v=' + Date.now()
  )

  assert.equal(policy.ASSISTANT_HISTORY_POLICY.mode, 'session-only')
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.clientPersistence, 'disabled')
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.serverPersistence, 'disabled')
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.retention, 'until-page-reload')
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.attachmentRetention, 'excluded')
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.backup, 'excluded')
  assert.equal(
    policy.ASSISTANT_HISTORY_POLICY.futureLocalPersistenceRequiresExplicitOptIn,
    true,
  )
  assert.equal(policy.isAssistantHistoryPersistenceAllowed(), false)
  assert.equal(
    policy.AI_PROMPT_HISTORY_STORAGE_KEY,
    'flexikit-ai-prompt-history-v1',
  )
  assert.equal(policy.ASSISTANT_HISTORY_POLICY.displayLabel, '仅本次会话')

  const assistant = read('src', 'views', 'AiAssistant.vue')
  const dataManagement = read('src', 'views', 'DataManagement.vue')
  const privacyPreferences = read('src', 'privacy', 'privacyPreferences.ts')
  const lifecycle = read('src', 'utils', 'localDataLifecycle.ts')
  const backup = read('src', 'utils', 'localDataBackup.ts')
  const backendAssistant = read('..', '..', 'backend', 'src', 'ai', 'ai-assistant.service.ts')

  assert.equal(assistant.includes('ASSISTANT_HISTORY_POLICY'), true)
  assert.equal(assistant.includes('Prompt 历史隐私'), true)
  assert.equal(assistant.includes('assistantHistoryPolicy.displayLabel'), true)
  assert.equal(assistant.includes('清空本次对话'), true)
  assert.equal(assistant.includes('messages.value = []'), true)
  assert.equal(
    assistant.includes('工具/文件/Clipboard 上下文也不会进入历史'),
    true,
  )
  assert.equal(assistant.includes('localStorage'), false)
  assert.equal(assistant.includes('sessionStorage'), false)
  assert.equal(assistant.includes('indexedDB'), false)

  assert.equal(dataManagement.includes('AI Prompt 历史'), true)
  assert.equal(dataManagement.includes('当前版本固定为仅本次会话'), true)
  assert.equal(dataManagement.includes('必须先提供独立的显式授权开关'), true)

  assert.equal(privacyPreferences.includes('flexikit-ai-prompt-history-v1'), true)
  assert.equal(
    privacyPreferences.includes('storage.removeItem(PRIVACY_DATA_KEYS.aiPromptHistory)'),
    true,
  )
  assert.equal(lifecycle.includes('flexikit-ai-prompt-history-v1'), true)

  const allowlistBlock = backup.slice(
    backup.indexOf('export const BACKUP_STORAGE_KEYS'),
    backup.indexOf('] as const', backup.indexOf('export const BACKUP_STORAGE_KEYS')) + 10,
  )
  assert.equal(allowlistBlock.includes('flexikit-ai-prompt-history-v1'), false)

  assert.equal(/Repository|DataSource/.test(backendAssistant), false)
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(backendAssistant), false)

  console.log('Assistant history defaults to session-only with persistence disabled: PASS')
  console.log('Prompt/response history has a visible privacy disclosure and manual session clear: PASS')
  console.log('Future local history requires explicit opt-in before persistence can be enabled: PASS')
  console.log('Reserved AI history data is covered by activity/local-data deletion: PASS')
  console.log('AI prompt history is excluded from encrypted local backup and Backend persistence: PASS')
  console.log('Tool/file/Clipboard attachments are excluded from persisted history policy: PASS')
  console.log('S5.2 AI history privacy regression: PASS')
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
