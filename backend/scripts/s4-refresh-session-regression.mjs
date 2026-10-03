import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  MAX_REFRESH_TOKEN_TTL_SECONDS,
  MIN_REFRESH_TOKEN_TTL_SECONDS,
  createRefreshTokenMaterial,
  hashRefreshTokenSecret,
  matchesRefreshTokenSecret,
  parseRefreshToken,
  parseRefreshTokenTtlSeconds,
} = require('../dist/auth/refresh-session-lifecycle.js');

assert.equal(parseRefreshTokenTtlSeconds(undefined), 30 * 24 * 60 * 60);
assert.equal(parseRefreshTokenTtlSeconds('30d'), DEFAULT_REFRESH_TOKEN_TTL_SECONDS);
assert.equal(parseRefreshTokenTtlSeconds('1d'), MIN_REFRESH_TOKEN_TTL_SECONDS);
assert.equal(parseRefreshTokenTtlSeconds('180d'), MAX_REFRESH_TOKEN_TTL_SECONDS);
assert.equal(parseRefreshTokenTtlSeconds('86400'), 86400);
assert.throws(() => parseRefreshTokenTtlSeconds('23h'), /REFRESH_TOKEN_TTL/);
assert.throws(() => parseRefreshTokenTtlSeconds('181d'), /REFRESH_TOKEN_TTL/);
assert.throws(() => parseRefreshTokenTtlSeconds('forever'), /REFRESH_TOKEN_TTL/);

const first = createRefreshTokenMaterial();
const parsed = parseRefreshToken(first.token);
assert.ok(parsed);
assert.equal(parsed.sessionId, first.sessionId);
assert.equal(parsed.secret, first.secret);
assert.equal(first.tokenHash, hashRefreshTokenSecret(first.secret));
assert.equal(first.tokenHash.length, 64);
assert.equal(matchesRefreshTokenSecret(first.secret, first.tokenHash), true);
assert.equal(matchesRefreshTokenSecret('wrong-secret', first.tokenHash), false);

const rotated = createRefreshTokenMaterial(first.sessionId);
assert.equal(rotated.sessionId, first.sessionId);
assert.notEqual(rotated.secret, first.secret);
assert.notEqual(rotated.token, first.token);
assert.notEqual(rotated.tokenHash, first.tokenHash);
assert.equal(parseRefreshToken('not-a-refresh-token'), null);
assert.equal(parseRefreshToken(`${first.sessionId}.bad.secret`), null);

console.log('default refresh token TTL is 30 days: PASS');
console.log('refresh TTL range validation: PASS');
console.log('opaque token parsing and SHA-256 hashing: PASS');
console.log('same-session secret rotation changes token/hash: PASS');
console.log('constant-time secret comparison boundary: PASS');
console.log('S4.2 refresh token regression: PASS');
