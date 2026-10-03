import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3019';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3019',
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
let cleanupAccessToken = null;
let accountDeleted = false;

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

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function cleanupAccount() {
  if (!cleanupAccessToken || accountDeleted || backend.exitCode !== null) return;
  try {
    const response = await fetch(baseUrl + '/v1/users/account', {
      method: 'DELETE',
      headers: {
        ...bearer(cleanupAccessToken),
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
  const username = `s42lo_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      client_type: 'desktop',
      client_instance_id: randomUUID(),
      client_name: 'FlexiKit Desktop',
    }),
  });
  assert.equal(register.response.status, 201);
  assert.equal(register.body.code, 0);

  const first = register.body.data;
  cleanupAccessToken = first.access_token;

  const profileBefore = await fetchJson('/v1/users/profile', {
    headers: bearer(first.access_token),
  });
  assert.equal(profileBefore.response.status, 200);

  const logout = await fetchJson('/v1/auth/logout', {
    method: 'POST',
    headers: {
      ...bearer(first.access_token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: first.refresh_token }),
  });
  assert.equal(logout.response.status, 200);
  assert.equal(logout.body.code, 0);
  assert.equal(logout.body.data.session_id, first.session_id);

  const rowAfterLogout = await db.query(
    'SELECT revoked_at FROM refresh_sessions WHERE id = $1',
    [first.session_id],
  );
  assert.equal(rowAfterLogout.rowCount, 1);
  assert.ok(rowAfterLogout.rows[0].revoked_at);

  const profileAfter = await fetchJson('/v1/users/profile', {
    headers: bearer(first.access_token),
  });
  assert.equal(profileAfter.response.status, 401);
  assert.equal(profileAfter.body.code, 'UNAUTHORIZED');

  const refreshAfter = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: first.refresh_token }),
  });
  assert.equal(refreshAfter.response.status, 401);
  assert.equal(refreshAfter.body.code, 'UNAUTHORIZED');

  const sessionsAfter = await fetchJson('/v1/auth/sessions', {
    headers: bearer(first.access_token),
  });
  assert.equal(sessionsAfter.response.status, 401);

  const relogin = await fetchJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      client_type: 'web',
      client_instance_id: randomUUID(),
      client_name: 'FlexiKit Web',
    }),
  });
  assert.equal(relogin.response.status, 200);
  cleanupAccessToken = relogin.body.data.access_token;

  const profileRelogin = await fetchJson('/v1/users/profile', {
    headers: bearer(cleanupAccessToken),
  });
  assert.equal(profileRelogin.response.status, 200);

  const userId = profileRelogin.body.data.id;
  const deletion = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      ...bearer(cleanupAccessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  assert.equal(deletion.response.status, 200);
  accountDeleted = true;

  const sessionsAfterDelete = await db.query(
    'SELECT id FROM refresh_sessions WHERE user_id = $1',
    [userId],
  );
  assert.equal(sessionsAfterDelete.rowCount, 0);

  console.log('S4.2 live logout/revocation smoke: PASS');
  console.log('server_logout=200');
  console.log('refresh_session_revoked_at_written=true');
  console.log('revoked_session_existing_access=401/UNAUTHORIZED');
  console.log('revoked_session_refresh=401/UNAUTHORIZED');
  console.log('revoked_session_protected_session_list=401');
  console.log('relogin_after_logout=200');
  console.log('account_delete_cascade_sessions=true');
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
