import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-backup-test-'));
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
const source = path.join(process.cwd(), 'src', 'utils', 'localDataBackup.ts');

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

  const modulePath = path.join(workDir, 'utils', 'localDataBackup.js');
  const backup = await import(pathToFileURL(modulePath).href + '?v=' + Date.now());

  const storage = new FakeStorage({
    'gtb-theme': 'dark',
    'flexikit-layout': JSON.stringify({ cardSize: 'medium' }),
    'flexikit-desktop-canvas-v2': JSON.stringify({ version: 2, widgets: [{ id: 'note-1' }], monitors: [] }),
    'flexikit-global-search-recents-v1': JSON.stringify([{ kind: 'file', path: 'C:/private/project.txt' }]),
    'token': 'must-never-be-backed-up',
    'flexikit-refresh-token': 'must-never-be-backed-up',
    'flexikit-auth-client-instance-id-v1': 'must-not-be-cloned',
    'flexikit-cookie-consent': JSON.stringify({ necessary: true }),
  });

  const password = 'backup-pass-123';
  const context = {
    runtime: 'desktop',
    account: { id: 42, username: 'backup-user' },
  };

  const encryptedJson = await backup.createEncryptedLocalBackup(storage, password, context);
  assert.equal(encryptedJson.includes('must-never-be-backed-up'), false);
  assert.equal(encryptedJson.includes('C:/private/project.txt'), false);

  const envelope = JSON.parse(encryptedJson);
  assert.equal(envelope.format, 'flexikit-local-backup');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.encryption.algorithm, 'AES-GCM-256');

  const payload = await backup.decryptLocalBackup(encryptedJson, password);
  assert.equal(payload.account.id, 42);
  assert.equal(payload.localDataSchemaVersion, 1);
  assert.equal(payload.storage['gtb-theme'], 'dark');
  assert.equal('token' in payload.storage, false);
  assert.equal('flexikit-refresh-token' in payload.storage, false);
  assert.equal('flexikit-auth-client-instance-id-v1' in payload.storage, false);
  assert.equal('flexikit-cookie-consent' in payload.storage, false);

  await assert.rejects(
    () => backup.decryptLocalBackup(encryptedJson, 'wrong-password'),
    /密码错误或文件已损坏/,
  );

  backup.assertBackupAccountCompatible(payload, { id: 42, username: 'renamed-user' });
  assert.throws(
    () => backup.assertBackupAccountCompatible(payload, { id: 7, username: 'other' }),
    /其他 FlexiKit 账户/,
  );

  const target = new FakeStorage({
    'gtb-theme': 'light',
    'gtb-custom': JSON.stringify([{ name: 'should-be-removed' }]),
    'token': 'preserve-auth-outside-backup-scope',
  });
  const result = backup.restoreLocalBackup(target, payload);
  assert.ok(result.restoredKeys >= 3);
  assert.equal(target.getItem('gtb-theme'), 'dark');
  assert.equal(target.getItem('gtb-custom'), null);
  assert.equal(target.getItem('token'), 'preserve-auth-outside-backup-scope');

  const legacyCanvasWidgets = [{ id: 'legacy-widget', type: 'notes', config: { noteContent: 'legacy note' } }];
  const legacyPayload = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runtime: 'desktop',
    account: null,
    storage: {
      'flexikit-desktop-canvas-v1': JSON.stringify(legacyCanvasWidgets),
    },
  };
  const legacyTarget = new FakeStorage({
    'flexikit-desktop-canvas-v1': JSON.stringify([{ id: 'stale-target' }]),
  });
  const legacyRestore = backup.restoreLocalBackup(legacyTarget, legacyPayload);
  assert.ok(legacyRestore.restoredKeys >= 1);
  assert.equal(legacyTarget.getItem('flexikit-desktop-canvas-v1'), null);
  assert.deepEqual(
    JSON.parse(legacyTarget.getItem('flexikit-desktop-canvas-v2')),
    { version: 2, widgets: legacyCanvasWidgets, monitors: [] },
  );

  const sourceText = readFileSync(source, 'utf8');
  const forbidden = [
    "'token'",
    "'flexikit-refresh-token'",
    "'flexikit-auth-client-instance-id-v1'",
    "'flexikit-browser-refresh-session-expires-at-v1'",
    "'flexikit-cookie-consent'",
  ];
  const allowlistBlock = sourceText.slice(
    sourceText.indexOf('export const BACKUP_STORAGE_KEYS'),
    sourceText.indexOf('] as const', sourceText.indexOf('export const BACKUP_STORAGE_KEYS')) + 10,
  );
  for (const key of forbidden) {
    assert.equal(allowlistBlock.includes(key), false, 'forbidden key leaked into backup allowlist: ' + key);
  }

  console.log('encrypted local backup round-trip: PASS');
  console.log('wrong-password authentication failure: PASS');
  console.log('account binding guard: PASS');
  console.log('full-snapshot restore preserves auth outside backup scope: PASS');
  console.log('legacy backup payload local schema migration: PASS');
  console.log('L3/client identity/consent allowlist exclusion: PASS');
  console.log('S4.3 local backup regression: PASS');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
