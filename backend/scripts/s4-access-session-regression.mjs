import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  MAX_ACCESS_TOKEN_TTL_SECONDS,
  parseAccessTokenTtlSeconds,
} = require('../dist/auth/access-session-lifecycle.js');

assert.equal(parseAccessTokenTtlSeconds(undefined), 30 * 60);
assert.equal(parseAccessTokenTtlSeconds('30m'), 30 * 60);
assert.equal(parseAccessTokenTtlSeconds('1h'), 60 * 60);
assert.equal(parseAccessTokenTtlSeconds('7d'), 7 * 24 * 60 * 60);
assert.equal(parseAccessTokenTtlSeconds('900'), 900);
assert.equal(parseAccessTokenTtlSeconds(120), 120);
assert.equal(DEFAULT_ACCESS_TOKEN_TTL_SECONDS, 1800);
assert.equal(parseAccessTokenTtlSeconds('30d'), MAX_ACCESS_TOKEN_TTL_SECONDS);

assert.throws(() => parseAccessTokenTtlSeconds('30x'), /ACCESS_TOKEN_TTL/);
assert.throws(() => parseAccessTokenTtlSeconds('30s'), /ACCESS_TOKEN_TTL/);
assert.throws(() => parseAccessTokenTtlSeconds('31d'), /ACCESS_TOKEN_TTL/);
assert.throws(() => parseAccessTokenTtlSeconds(1.5), /ACCESS_TOKEN_TTL/);

const { JwtStrategy } = require('../dist/auth/jwt.strategy.js');

const configService = {
  get(key) {
    return key === 'JWT_SECRET' ? 'test-only-secret' : undefined;
  },
};

const rejectingStrategy = new JwtStrategy(
  configService,
  {
    async findOne() {
      throw new Error('refresh token should be rejected before user lookup');
    },
  },
  {
    async findOne() {
      throw new Error('refresh token should be rejected before session lookup');
    },
  },
);

await assert.rejects(
  () => rejectingStrategy.validate({
    username: 'tester',
    sub: 1,
    token_use: 'refresh',
  }),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);

const currentSessionId = '11111111-1111-4111-8111-111111111111';
const revokedSessionId = '22222222-2222-4222-8222-222222222222';
const expiredSessionId = '33333333-3333-4333-8333-333333333333';
const sessionRows = new Map([
  [currentSessionId, {
    id: currentSessionId,
    user_id: 1,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  }],
  [revokedSessionId, {
    id: revokedSessionId,
    user_id: 1,
    revokedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  }],
  [expiredSessionId, {
    id: expiredSessionId,
    user_id: 1,
    revokedAt: null,
    expiresAt: new Date(Date.now() - 1_000),
  }],
]);

const legacyStrategy = new JwtStrategy(
  configService,
  {
    async findOne(id) {
      return id === 1
        ? { id: 1, username: 'legacy-user', status: 'active' }
        : id === 2
          ? { id: 2, username: 'suspended-user', status: 'suspended' }
          : null;
    },
  },
  {
    async findOne({ where }) {
      const session = sessionRows.get(where.id);
      return session && session.user_id === where.user_id ? session : null;
    },
  },
);

assert.deepEqual(
  await legacyStrategy.validate({ username: 'legacy-user', sub: 1 }),
  { userId: 1, username: 'legacy-user', sessionId: null },
);

await assert.rejects(
  () => legacyStrategy.validate({ username: 'suspended-user', sub: 2 }),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);

assert.deepEqual(
  await legacyStrategy.validate({
    username: 'legacy-user',
    sub: 1,
    token_use: 'access',
    sid: currentSessionId,
  }),
  {
    userId: 1,
    username: 'legacy-user',
    sessionId: currentSessionId,
  },
);

await assert.rejects(
  () => legacyStrategy.validate({
    username: 'legacy-user',
    sub: 1,
    token_use: 'access',
    sid: revokedSessionId,
  }),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);

await assert.rejects(
  () => legacyStrategy.validate({
    username: 'legacy-user',
    sub: 1,
    token_use: 'access',
    sid: expiredSessionId,
  }),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);

console.log('refresh token_use is rejected by access strategy: PASS');
console.log('legacy access token without token_use remains compatible: PASS');
console.log('new access token sid propagates to authenticated context: PASS');
console.log('revoked/expired sid-bound access tokens are rejected immediately: PASS');
console.log('default access token TTL is 30 minutes: PASS');
console.log('duration parsing and legacy 7d compatibility: PASS');
console.log('unsafe TTL values fail fast: PASS');
console.log('S4.2 access token lifecycle regression: PASS');
