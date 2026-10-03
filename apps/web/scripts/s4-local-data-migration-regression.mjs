import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

class FakeStorage {
  constructor(entries = {}, failOnKey = null) {
    this.map = new Map(Object.entries(entries));
    this.failOnKey = failOnKey;
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failOnKey === key) throw new Error('simulated write failure');
    this.map.set(key, String(value));
  }
  removeItem(key) {
    if (this.failOnKey === key) throw new Error('simulated remove failure');
    this.map.delete(key);
  }
}

const workDir = mkdtempSync(path.join(tmpdir(), 'flexikit-local-migration-test-'));
const tsc = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
const source = path.join(process.cwd(), 'src', 'migrations', 'localDataMigrations.ts');
const toolExportSource = path.join(process.cwd(), 'src', 'migrations', 'toolExportMigrations.ts');

try {
  execFileSync(process.execPath, [
    tsc,
    source,
    toolExportSource,
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--moduleResolution', 'Bundler',
    '--lib', 'ES2022,DOM',
    '--skipLibCheck',
    '--outDir', workDir,
  ], { stdio: 'pipe' });

  const modulePath = path.join(workDir, 'migrations', 'localDataMigrations.js');
  const migration = await import(pathToFileURL(modulePath).href + '?v=' + Date.now());
  const toolExportModulePath = path.join(workDir, 'migrations', 'toolExportMigrations.js');
  const toolExport = await import(pathToFileURL(toolExportModulePath).href + '?v=' + Date.now());

  const legacyWidgets = [{ id: 'legacy-note', type: 'notes', config: { noteContent: 'keep me' } }];
  const legacyStorage = new FakeStorage({
    'flexikit-desktop-canvas-v1': JSON.stringify(legacyWidgets),
  });

  const first = migration.runLocalDataMigrations(legacyStorage);
  assert.equal(first.fromVersion, 0);
  assert.equal(first.toVersion, 1);
  assert.deepEqual(first.appliedVersions, [1]);
  assert.equal(legacyStorage.getItem('flexikit-local-data-schema-version'), '1');
  assert.equal(legacyStorage.getItem('flexikit-desktop-canvas-v1'), null);
  assert.deepEqual(
    JSON.parse(legacyStorage.getItem('flexikit-desktop-canvas-v2')),
    { version: 2, widgets: legacyWidgets, monitors: [] },
  );

  const stableV2 = legacyStorage.getItem('flexikit-desktop-canvas-v2');
  const second = migration.runLocalDataMigrations(legacyStorage);
  assert.equal(second.fromVersion, 1);
  assert.deepEqual(second.appliedVersions, []);
  assert.equal(legacyStorage.getItem('flexikit-desktop-canvas-v2'), stableV2);

  const currentWins = new FakeStorage({
    'flexikit-desktop-canvas-v1': JSON.stringify([{ id: 'stale' }]),
    'flexikit-desktop-canvas-v2': JSON.stringify({ version: 2, widgets: [{ id: 'current' }], monitors: [] }),
  });
  migration.runLocalDataMigrations(currentWins);
  assert.equal(currentWins.getItem('flexikit-desktop-canvas-v1'), null);
  assert.equal(JSON.parse(currentWins.getItem('flexikit-desktop-canvas-v2')).widgets[0].id, 'current');

  const future = new FakeStorage({
    'flexikit-local-data-schema-version': '99',
    'flexikit-desktop-canvas-v2': JSON.stringify({ version: 2, widgets: [], monitors: [] }),
  });
  assert.throws(
    () => migration.runLocalDataMigrations(future),
    /来自更新版本/,
  );
  assert.equal(future.getItem('flexikit-local-data-schema-version'), '99');

  const malformed = new FakeStorage({
    'flexikit-desktop-canvas-v1': '{broken-json',
  });
  assert.throws(
    () => migration.runLocalDataMigrations(malformed),
    /已损坏/,
  );
  assert.equal(malformed.getItem('flexikit-desktop-canvas-v1'), '{broken-json');
  assert.equal(malformed.getItem('flexikit-local-data-schema-version'), null);

  const rollback = new FakeStorage({
    'flexikit-desktop-canvas-v1': JSON.stringify(legacyWidgets),
  }, 'flexikit-local-data-schema-version');
  assert.throws(
    () => migration.runLocalDataMigrations(rollback),
    /已尝试回滚/,
  );
  assert.equal(rollback.getItem('flexikit-desktop-canvas-v1'), JSON.stringify(legacyWidgets));
  assert.equal(rollback.getItem('flexikit-desktop-canvas-v2'), null);

  const snapshot = migration.migrateLocalDataSnapshot({
    'flexikit-desktop-canvas-v1': JSON.stringify(legacyWidgets),
    'gtb-theme': 'dark',
  }, 0);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.storage['flexikit-desktop-canvas-v1'], undefined);
  assert.equal(JSON.parse(snapshot.storage['flexikit-desktop-canvas-v2']).widgets[0].id, 'legacy-note');
  assert.equal(snapshot.storage['gtb-theme'], 'dark');

  const legacyToolExport = toolExport.migrateToolExportData({
    customTools: [{ name: 'Legacy Tool', url: 'https://example.com' }],
    favorites: ['custom:Legacy Tool'],
  });
  assert.equal(legacyToolExport.version, '1.0');
  assert.equal(legacyToolExport.theme, 'auto');

  const currentToolExport = toolExport.migrateToolExportData({
    version: '1.0',
    exportDate: '2026-09-25T00:00:00.000Z',
    customTools: [],
    catOrder: [],
    toolOrder: [],
    theme: 'dark',
    favorites: [],
  });
  assert.equal(currentToolExport.version, '1.0');
  assert.equal(currentToolExport.theme, 'dark');

  assert.throws(
    () => toolExport.migrateToolExportData({ version: '2.0', customTools: [] }),
    /不支持的工具导入版本/,
  );
  assert.throws(
    () => toolExport.migrateToolExportData({ version: '1.0', customTools: [{ url: 'https://missing-name.test' }] }),
    /无效工具数据/,
  );

  console.log('legacy local schema 0 -> 1 migration: PASS');
  console.log('idempotent current schema migration: PASS');
  console.log('current Canvas v2 wins over stale v1: PASS');
  console.log('future schema downgrade protection: PASS');
  console.log('malformed legacy data preservation: PASS');
  console.log('migration write rollback: PASS');
  console.log('pure snapshot migration for backup restore: PASS');
  console.log('legacy tool export -> 1.0 compatibility: PASS');
  console.log('future tool export version rejection: PASS');
  console.log('S4.3 local data migration regression: PASS');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
