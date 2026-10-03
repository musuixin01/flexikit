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
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-privacy-test-'));
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
const source = path.join(process.cwd(), 'src', 'privacy', 'privacyPreferences.ts');

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

  const modulePath = path.join(workDir, 'privacyPreferences.js');
  const privacy = await import(pathToFileURL(modulePath).href + '?v=' + Date.now());

  const fresh = new FakeStorage();
  assert.deepEqual(privacy.readPrivacyPreferences(fresh), {
    version: 1,
    rememberSearchRecents: true,
    usagePersonalization: true,
    cacheProfileLocally: true,
  });

  const populated = new FakeStorage({
    'flexikit-global-search-recents-v1': '[{"path":"C:/private.txt"}]',
    'flexikit-tool-usage-v1': '{"tool":{"count":2}}',
    'flexikit-installed-app-usage-v1': '{"app":{"count":3}}',
    'flexikit-recommendation-behavior-v1': '{"version":1,"events":[]}',
    'flexikit-profiles': '{"alice":{"email":"alice@example.test"}}',
    'flexikit-ai-prompt-history-v1': '[{"prompt":"private"}]',
    'token': 'must-survive-privacy-setting',
  });

  let prefs = privacy.updatePrivacyPreference('rememberSearchRecents', false, populated);
  assert.equal(prefs.rememberSearchRecents, false);
  assert.equal(populated.getItem('flexikit-global-search-recents-v1'), null);

  prefs = privacy.updatePrivacyPreference('usagePersonalization', false, populated);
  assert.equal(prefs.usagePersonalization, false);
  assert.equal(populated.getItem('flexikit-tool-usage-v1'), null);
  assert.equal(populated.getItem('flexikit-installed-app-usage-v1'), null);
  assert.equal(populated.getItem('flexikit-recommendation-behavior-v1'), null);

  prefs = privacy.updatePrivacyPreference('cacheProfileLocally', false, populated);
  assert.equal(prefs.cacheProfileLocally, false);
  assert.equal(populated.getItem('flexikit-profiles'), null);
  assert.equal(populated.getItem('token'), 'must-survive-privacy-setting');

  const malformed = new FakeStorage({
    'flexikit-privacy-preferences-v1': '{broken',
  });
  assert.equal(privacy.readPrivacyPreferences(malformed).rememberSearchRecents, true);

  const activity = new FakeStorage({
    'flexikit-global-search-recents-v1': '[]',
    'flexikit-tool-usage-v1': '{}',
    'flexikit-installed-app-usage-v1': '{}',
    'flexikit-recommendation-behavior-v1': '{"version":1,"events":[]}',
    'flexikit-profiles': '{"keep":"profile"}',
    'flexikit-ai-prompt-history-v1': '[{"prompt":"private"}]',
  });
  privacy.clearRecordedActivityData(activity);
  assert.equal(activity.getItem('flexikit-global-search-recents-v1'), null);
  assert.equal(activity.getItem('flexikit-tool-usage-v1'), null);
  assert.equal(activity.getItem('flexikit-installed-app-usage-v1'), null);
  assert.equal(activity.getItem('flexikit-recommendation-behavior-v1'), null);
  assert.equal(activity.getItem('flexikit-ai-prompt-history-v1'), null);
  assert.notEqual(activity.getItem('flexikit-profiles'), null);

  const projectRoot = process.cwd();
  const toolUsage = readFileSync(path.join(projectRoot, 'src', 'utils', 'toolUsage.ts'), 'utf8');
  const installedUsage = readFileSync(path.join(projectRoot, 'src', 'utils', 'installedAppUsage.ts'), 'utf8');
  const globalSearch = readFileSync(path.join(projectRoot, 'src', 'components', 'desktop', 'GlobalSearchOverlay.vue'), 'utf8');
  const userStore = readFileSync(path.join(projectRoot, 'src', 'stores', 'user.ts'), 'utf8');
  const cookieNotice = readFileSync(path.join(projectRoot, 'src', 'components', 'common', 'CookieConsent.vue'), 'utf8');
  const backup = readFileSync(path.join(projectRoot, 'src', 'utils', 'localDataBackup.ts'), 'utf8');

  assert.match(toolUsage, /isUsagePersonalizationEnabled/);
  assert.match(installedUsage, /isUsagePersonalizationEnabled/);
  assert.match(globalSearch, /isSearchRecentsEnabled/);
  assert.match(userStore, /isLocalProfileCacheEnabled/);
  assert.match(cookieNotice, /当前未启用分析 Cookie/);

  const allowlistBlock = backup.slice(
    backup.indexOf('export const BACKUP_STORAGE_KEYS'),
    backup.indexOf('] as const', backup.indexOf('export const BACKUP_STORAGE_KEYS')) + 10,
  );
  assert.equal(allowlistBlock.includes('flexikit-privacy-preferences-v1'), false);
  assert.equal(allowlistBlock.includes('flexikit-ai-prompt-history-v1'), false);
  assert.equal(allowlistBlock.includes('flexikit-recommendation-behavior-v1'), false);

  console.log('privacy defaults preserve existing behavior: PASS');
  console.log('disabled preferences purge corresponding L1/L2 data: PASS');
  console.log('activity-only clear keeps profile cache: PASS');
  console.log('privacy settings do not touch auth token material: PASS');
  console.log('record/read call sites are privacy-gated: PASS');
  console.log('privacy preferences remain device-local and excluded from backup: PASS');
  console.log('cookie notice states current necessary-only behavior: PASS');
  console.log('S4.3 privacy settings regression: PASS');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
