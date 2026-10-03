import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AuthService } = require('../dist/auth/auth.service.js');
const {
  createRefreshTokenMaterial,
} = require('../dist/auth/refresh-session-lifecycle.js');

const userId = 7;
const currentSessionId = '11111111-1111-4111-8111-111111111111';
const legacySessionId = '22222222-2222-4222-8222-222222222222';
const mismatchSessionId = '33333333-3333-4333-8333-333333333333';

const legacyMaterial = createRefreshTokenMaterial(legacySessionId);
const mismatchMaterial = createRefreshTokenMaterial(mismatchSessionId);
const wrongMismatchMaterial = createRefreshTokenMaterial(mismatchSessionId);

const sessions = new Map([
  [currentSessionId, {
    id: currentSessionId,
    user_id: userId,
    tokenHash: 'current-hash',
    revokedAt: null,
  }],
  [legacySessionId, {
    id: legacySessionId,
    user_id: userId,
    tokenHash: legacyMaterial.tokenHash,
    revokedAt: null,
  }],
  [mismatchSessionId, {
    id: mismatchSessionId,
    user_id: userId,
    tokenHash: mismatchMaterial.tokenHash,
    revokedAt: null,
  }],
]);

const repository = {
  async findOne({ where }) {
    const session = sessions.get(where.id);
    return session && session.user_id === where.user_id ? session : null;
  },
  async save(session) {
    sessions.set(session.id, session);
    return session;
  },
};

const dataSource = {
  async transaction(callback) {
    return callback({
      getRepository() {
        return repository;
      },
    });
  },
};

const configService = {
  get() {
    return undefined;
  },
};

const service = new AuthService(
  {},
  {},
  configService,
  repository,
  dataSource,
);

await assert.rejects(
  () => service.logout(userId, null),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 400,
);

const currentLogout = await service.logout(userId, currentSessionId);
assert.equal(currentLogout.session_id, currentSessionId);
assert.ok(sessions.get(currentSessionId).revokedAt instanceof Date);

const legacyLogout = await service.logout(userId, null, legacyMaterial.token);
assert.equal(legacyLogout.session_id, legacySessionId);
assert.ok(sessions.get(legacySessionId).revokedAt instanceof Date);

await assert.rejects(
  () => service.logout(userId, null, wrongMismatchMaterial.token),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);
assert.equal(sessions.get(mismatchSessionId).revokedAt, null);

await assert.rejects(
  () => service.logout(userId + 1, mismatchSessionId),
  error => typeof error?.getStatus === 'function' && error.getStatus() === 401,
);

console.log('current sid logout revokes its Refresh Session: PASS');
console.log('legacy sid-less logout can prove session with Refresh Token: PASS');
console.log('legacy logout rejects mismatched Refresh secret: PASS');
console.log('logout cannot revoke another user session: PASS');
console.log('missing sid and Refresh Token fails safely: PASS');
console.log('S4.2 logout/revocation regression: PASS');
