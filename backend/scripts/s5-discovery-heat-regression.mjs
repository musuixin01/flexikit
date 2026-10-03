import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateDiscoveryHeatScore,
  discoveryHeatSql,
} = require('../dist/discovery/discovery-heat.js');

const now = new Date('2026-09-27T00:00:00.000Z');

assert.equal(calculateDiscoveryHeatScore({
  upvotes: 0,
  comments: 0,
  discoveredAt: now,
}, now), 45);

const freshPopular = calculateDiscoveryHeatScore({
  upvotes: 5_000,
  comments: 500,
  discoveredAt: now,
}, now);
const oldPopular = calculateDiscoveryHeatScore({
  upvotes: 5_000,
  comments: 500,
  discoveredAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
}, now);
assert.ok(freshPopular > oldPopular);

const moreEngagement = calculateDiscoveryHeatScore({
  upvotes: 10_000,
  comments: 1_000,
  discoveredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
}, now);
const lessEngagement = calculateDiscoveryHeatScore({
  upvotes: 100,
  comments: 10,
  discoveredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
}, now);
assert.ok(moreEngagement > lessEngagement);

assert.equal(calculateDiscoveryHeatScore({
  upvotes: -100,
  comments: -5,
  discoveredAt: now,
}, now), 45);
assert.equal(calculateDiscoveryHeatScore({
  upvotes: 0,
  comments: 0,
  discoveredAt: null,
  createdAt: null,
}, now), 0);
assert.ok(freshPopular <= 100);

const sql = discoveryHeatSql('tool');
assert.match(sql, /GREATEST\(COALESCE\(tool\.upvotes, 0\), 0\)/);
assert.match(sql, /GREATEST\(COALESCE\(tool\.comments, 0\), 0\)/);
assert.match(sql, /EXP\(/);
assert.match(sql, /LN\(2\.0\)/);
assert.match(sql, /COALESCE\(tool\.discovered_at, tool\.created_at\)/);

const root = process.cwd();
const service = readFileSync(path.join(root, 'src', 'discovery', 'discovery.service.ts'), 'utf8');
assert.match(service, /orderBy\(discoveryHeatSql\('tool'\), 'DESC'\)/);
assert.match(service, /withCalculatedHeat/);
assert.equal(service.includes("orderBy('tool.hot_score', 'DESC')"), false);
assert.equal(service.includes('existing.hot_score = toolData.hot_score'), false);
assert.match(service, /sanitizeCount\(toolData\.upvotes/);
assert.match(service, /sanitizeCount\(toolData\.comments/);

console.log('heat score uses public engagement plus 14-day half-life freshness: PASS');
console.log('negative aggregates are clamped and score remains bounded 0-100: PASS');
console.log('PostgreSQL heat expression mirrors engagement/freshness inputs: PASS');
console.log('Discovery hot/recommendation/ranking paths use dynamic heat ordering: PASS');
console.log('upstream static hot_score is no longer trusted on ingest: PASS');
console.log('S5.3 discovery heat regression: PASS');
