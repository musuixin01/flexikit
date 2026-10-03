import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3016';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3016',
    ACCESS_TOKEN_TTL: '2m',
    REFRESH_TOKEN_TTL: '2d',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'flexikit',
  password: process.env.DB_PASSWORD || 'flexikit123',
  database: process.env.DB_NAME || 'flexikit_db',
});

let stdout = '';
let stderr = '';
let latestAccessToken = null;
let username = null;
let accountDeleted = false;
let sessionId = null;

backend.stdout.on('data', chunk => {
  stdout = (stdout + chunk.toString()).slice(-16000);
});
backend.stderr.on('data', chunk => {
  stderr = (stderr + chunk.toString()).slice(-16000);
});

async function fetchJson(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    signal: AbortSignal.timeout(5000),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (backend.exitCode !== null) {
      throw new Error(
        `Backend exited before ready (code=${backend.exitCode})\nstdout:\n${stdout}\nstderr:\n${stderr}`,
      );
    }

    try {
      const { response } = await fetchJson('/v1');
      if (response.ok) return;
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Backend did not become ready\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

async function cleanupAccount() {
  if (!latestAccessToken || accountDeleted || backend.exitCode !== null) return;
  try {
    const response = await fetch(baseUrl + '/v1/users/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${latestAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'DELETE' }),
      signal: AbortSignal.timeout(3000),
    });
    accountDeleted = response.ok;
  } catch {}
}

try {
  await waitUntilReady();
  await db.connect();

  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  username = `s42r_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  assert.equal(register.response.status, 201);
  assert.equal(register.body.code, 0);

  const first = register.body.data;
  latestAccessToken = first.access_token;
  assert.equal(first.token_type, 'Bearer');
  assert.equal(first.expires_in, 120);
  assert.equal(first.refresh_expires_in, 2 * 24 * 60 * 60);
  assert.equal(typeof first.refresh_expires_at, 'string');

  const firstParts = first.refresh_token.split('.');
  assert.equal(firstParts.length, 2);
  sessionId = firstParts[0];
  const firstSecret = firstParts[1];

  const rowBefore = await db.query(
    'SELECT token_hash, revoked_at, expires_at FROM refresh_sessions WHERE id = $1',
    [sessionId],
  );
  assert.equal(rowBefore.rowCount, 1);
  assert.equal(rowBefore.rows[0].token_hash.length, 64);
  assert.notEqual(rowBefore.rows[0].token_hash, firstSecret);
  assert.notEqual(rowBefore.rows[0].token_hash, first.refresh_token);
  assert.equal(rowBefore.rows[0].revoked_at, null);

  const refresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: first.refresh_token }),
  });

  assert.equal(refresh.response.status, 200);
  assert.equal(refresh.body.code, 0);
  const second = refresh.body.data;
  latestAccessToken = second.access_token;

  const secondParts = second.refresh_token.split('.');
  assert.equal(secondParts[0], sessionId);
  assert.notEqual(second.refresh_token, first.refresh_token);
  assert.notEqual(secondParts[1], firstSecret);
  assert.equal(second.refresh_expires_at, first.refresh_expires_at);

  const rowAfterRotation = await db.query(
    'SELECT token_hash, revoked_at FROM refresh_sessions WHERE id = $1',
    [sessionId],
  );
  assert.equal(rowAfterRotation.rowCount, 1);
  assert.notEqual(rowAfterRotation.rows[0].token_hash, rowBefore.rows[0].token_hash);
  assert.equal(rowAfterRotation.rows[0].revoked_at, null);

  const replay = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: first.refresh_token }),
  });
  assert.equal(replay.response.status, 401);
  assert.equal(replay.body.code, 'UNAUTHORIZED');

  const rowAfterReplay = await db.query(
    'SELECT revoked_at FROM refresh_sessions WHERE id = $1',
    [sessionId],
  );
  assert.ok(rowAfterReplay.rows[0].revoked_at);

  const revokedCurrent = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: second.refresh_token }),
  });
  assert.equal(revokedCurrent.response.status, 401);
  assert.equal(revokedCurrent.body.code, 'UNAUTHORIZED');

  const profile = await fetchJson('/v1/users/profile', {
    headers: { Authorization: `Bearer ${latestAccessToken}` },
  });
  assert.equal(profile.response.status, 401);
  assert.equal(profile.body.code, 'UNAUTHORIZED');

  const relogin = await fetchJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(relogin.response.status, 200);
  latestAccessToken = relogin.body.data.access_token;

  const deletion = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${latestAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  assert.equal(deletion.response.status, 200);
  accountDeleted = true;

  const rowsAfterDelete = await db.query(
    'SELECT id FROM refresh_sessions WHERE id = $1',
    [sessionId],
  );
  assert.equal(rowsAfterDelete.rowCount, 0);

  console.log('S4.2 live refresh token rotation smoke: PASS');
  console.log('register=201 refresh_session_created=true');
  console.log('plaintext_refresh_token_in_db=false');
  console.log('rotation=same_session_new_secret');
  console.log('old_refresh_replay=401/UNAUTHORIZED session_revoked=true');
  console.log('rotated_refresh_after_reuse=401/UNAUTHORIZED');
  console.log('rotated_access_after_reuse=401/UNAUTHORIZED');
  console.log('relogin_for_cleanup=200');
  console.log('account_delete_cascade_refresh_session=true');
} finally {
  await cleanupAccount();
  if (!db.ended) {
    await db.end().catch(() => {});
  }
  if (backend.exitCode === null) {
    backend.kill();
    await new Promise(resolve => {
      backend.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
}
