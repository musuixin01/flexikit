import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { VERSION_NEUTRAL, VersioningType } = require('@nestjs/common');
const {
  API_V1,
  API_V1_PATH,
  API_VERSIONING_OPTIONS,
} = require('../dist/common/versioning/api-versioning.js');

assert.equal(API_V1, '1');
assert.equal(API_V1_PATH, '/v1');
assert.equal(API_VERSIONING_OPTIONS.type, VersioningType.URI);
assert.ok(Array.isArray(API_VERSIONING_OPTIONS.defaultVersion));
assert.ok(API_VERSIONING_OPTIONS.defaultVersion.includes(VERSION_NEUTRAL));
assert.ok(API_VERSIONING_OPTIONS.defaultVersion.includes(API_V1));
assert.equal(new Set(API_VERSIONING_OPTIONS.defaultVersion).size, 2);

console.log('URI versioning is enabled: PASS');
console.log('V1 is canonical: PASS');
console.log('unversioned compatibility alias is retained: PASS');
console.log('S4.1 API versioning regression: PASS');
