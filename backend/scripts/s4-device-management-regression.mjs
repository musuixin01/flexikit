import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AuthService } = require('../dist/auth/auth.service.js');

const now = Date.now();
const currentSessionId = '11111111-1111-4111-8111-111111111111';
const otherSessionId = '22222222-2222-4222-8222-222222222222';

const sessions = [
  {
    id: otherSessionId,
    user_id: 7,
    tokenHash: 'hash-other',
    clientType: 'web',
    clientInstanceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    clientName: 'FlexiKit Web',
    expiresAt: new Date(now + 3_600_000),
    revokedAt: null,
    lastUsedAt: new Date(now - 30_000),
    createdAt: new Date(now - 120_000),
    updatedAt: new Date(now - 30_000),
  },
  {
    id: currentSessionId,
    user_id: 7,
    tokenHash: 'hash-current',
    clientType: 'desktop',
    clientInstanceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    clientName: 'FlexiKit Desktop',
    expiresAt: new Date(now + 3_600_000),
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date(now - 60_000),
    updatedAt: new Date(now - 60_000),
  },
];

const repository = {
  find: async () => sessions,
  findOne: async ({ where }) => sessions.find(
    session => session.id === where.id && session.user_id === where.user_id,
  ) ?? null,
  save: async session => session,
};

const configService = {
  get: () => undefined,
};

const service = new AuthService(
  {},
  {},
  configService,
  repository,
  {},
);

const listed = await service.listManagedSessions(7, currentSessionId);
assert.equal(listed.length, 2);
assert.equal(listed[0].session_id, currentSessionId);
assert.equal(listed[0].is_current, true);
assert.equal(listed[1].session_id, otherSessionId);
assert.equal(listed[1].is_current, false);
assert.equal('tokenHash' in listed[0], false);
assert.equal('token_hash' in listed[0], false);

await assert.rejects(
  () => service.revokeManagedSession(7, currentSessionId, currentSessionId),
  error => error?.getStatus?.() === 400,
);

await assert.rejects(
  () => service.revokeManagedSession(7, otherSessionId, null),
  error => error?.getStatus?.() === 400,
);

await assert.rejects(
  () => service.revokeManagedSession(
    7,
    '33333333-3333-4333-8333-333333333333',
    currentSessionId,
  ),
  error => error?.getStatus?.() === 404,
);

const revoked = await service.revokeManagedSession(7, otherSessionId, currentSessionId);
assert.equal(revoked.session_id, otherSessionId);
assert.equal(typeof revoked.revoked_at, 'string');
assert.ok(sessions[0].revokedAt instanceof Date);

console.log('managed session list marks current session first: PASS');
console.log('managed session response excludes token hash material: PASS');
console.log('current session revoke is blocked: PASS');
console.log('legacy access token without sid cannot revoke devices: PASS');
console.log('foreign/missing session returns 404: PASS');
console.log('other session revocation writes revoked_at: PASS');
console.log('S4.2 device management regression: PASS');
