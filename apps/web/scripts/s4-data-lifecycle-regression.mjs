import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  removeItem(key) { this.map.delete(key); }
}

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-data-lifecycle-test-'));
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
const source = path.join(process.cwd(), 'src', 'utils', 'localDataLifecycle.ts');

try {
  execFileSync(process.execPath, [
    tsc,
    source,
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--moduleResolution', 'Bundler',
    '--lib', 'ES2022,DOM',
    '--skipLibCheck',
    '--outDir', workDir,
  ], { stdio: 'pipe' });

  const modulePath = path.join(workDir, 'localDataLifecycle.js');
  const lifecycle = await import(pathToFileURL(modulePath).href + '?v=' + Date.now());

  const storage = new FakeStorage({
    'gtb-custom': '[{"name":"private"}]',
    'gtb-order': '["custom:private"]',
    'gtb-favorites': '["private"]',
    'gtb-cat-order': '["private"]',
    'flexikit-desktop-canvas-v1': '[]',
    'flexikit-desktop-canvas-v2': '{"version":2,"widgets":[],"monitors":[]}',
    'flexikit-global-search-recents-v1': '[{"path":"C:/private.txt"}]',
    'flexikit-installed-app-usage-v1': '{"private":{"count":1}}',
    'flexikit-tool-usage-v1': '{"private":{"count":1}}',
    'flexikit-recommendation-behavior-v1': '{"version":1,"events":[{"type":"tool_open","toolId":1,"occurredAt":1}]}',
    'flexikit-profiles': '{"user":{"email":"private@example.test"}}',
    'flexikit-trending-tools-v1': '["Private"]',
    'flexikit-pet-search': 'Private',
    'flexikit-ai-prompt-history-v1': '[{"prompt":"private","response":"private"}]',
    'gtb-theme': 'dark',
    'flexikit-layout': '{"cardSize":"medium"}',
    'flexikit-theme-settings': '{"accent":"blue"}',
    'flexikit-sidebar-collapsed': 'true',
    'flexikit-privacy-preferences-v1': '{"version":1}',
    'flexikit-auth-client-instance-id-v1': 'keep-device-id',
    'flexikit-local-data-schema-version': '1',
    'flexikit-cookie-consent': '{"necessary":true}',
    'token': 'auth-is-cleared-by-auth-lifecycle-not-this-helper',
  });

  const result = lifecycle.clearLocalUserData(storage);
  assert.equal(result.removedKeys.length, lifecycle.LOCAL_USER_DATA_KEYS.length);
  for (const key of lifecycle.LOCAL_USER_DATA_KEYS) {
    assert.equal(storage.getItem(key), null, 'local user data survived: ' + key);
  }

  for (const key of [
    'gtb-theme',
    'flexikit-layout',
    'flexikit-theme-settings',
    'flexikit-sidebar-collapsed',
    'flexikit-privacy-preferences-v1',
    'flexikit-auth-client-instance-id-v1',
    'flexikit-local-data-schema-version',
    'flexikit-cookie-consent',
    'token',
  ]) {
    assert.notEqual(storage.getItem(key), null, 'device preference unexpectedly removed: ' + key);
  }

  const projectRoot = process.cwd();
  const canvasStore = readFileSync(path.join(projectRoot, 'src', 'stores', 'desktopCanvas.ts'), 'utf8');
  const dataManagement = readFileSync(path.join(projectRoot, 'src', 'views', 'DataManagement.vue'), 'utf8');
  const profile = readFileSync(path.join(projectRoot, 'src', 'views', 'Profile.vue'), 'utf8');

  assert.match(canvasStore, /window\.addEventListener\('storage', handleExternalStorageChange\)/);
  assert.match(canvasStore, /persistenceSuspended = true/);
  assert.match(dataManagement, /usersApi\.deleteAccount\('DELETE'\)/);
  assert.match(dataManagement, /clearLocalUserData\(localStorage\)/);
  assert.match(profile, /router\.push\('\/data'\)/);
  assert.equal(profile.includes('账号已注销（模拟）'), false);

  console.log('complete local user-content allowlist is deleted: PASS');
  console.log('device preferences, identity and auth boundary remain separate: PASS');
  console.log('open Canvas windows cannot rewrite cleared Canvas persistence: PASS');
  console.log('account deletion and Profile route use the real lifecycle flow: PASS');
  console.log('S4.3 local data lifecycle regression: PASS');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
