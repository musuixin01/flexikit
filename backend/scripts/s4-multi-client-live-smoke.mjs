import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3017';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3017',
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
  username = `s42mc_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';
  const desktopInstanceId = randomUUID();
  const webInstanceId = randomUUID();

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      client_type: 'desktop',
      client_instance_id: desktopInstanceId,
      client_name: 'FlexiKit Desktop',
    }),
  });
  assert.equal(register.response.status, 201);
  assert.equal(register.body.code, 0);

  const desktop = register.body.data;
  latestAccessToken = desktop.access_token;
  assert.equal(desktop.client_type, 'desktop');
  assert.equal(desktop.client_instance_id, desktopInstanceId);
  assert.equal(desktop.client_name, 'FlexiKit Desktop');
  assert.equal(desktop.session_id, desktop.refresh_token.split('.')[0]);

  const webLogin = await fetchJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      client_type: 'web',
      client_instance_id: webInstanceId,
      client_name: 'FlexiKit Web',
    }),
  });
  assert.equal(webLogin.response.status, 200);
  assert.equal(webLogin.body.code, 0);

  const web = webLogin.body.data;
  latestAccessToken = web.access_token;
  assert.equal(web.client_type, 'web');
  assert.equal(web.client_instance_id, webInstanceId);
  assert.equal(web.client_name, 'FlexiKit Web');
  assert.notEqual(web.session_id, desktop.session_id);

  const legacyLogin = await fetchJson('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(legacyLogin.response.status, 200);
  assert.equal(legacyLogin.body.code, 0);

  const legacy = legacyLogin.body.data;
  latestAccessToken = legacy.access_token;
  assert.equal(legacy.client_type, 'unknown');
  assert.equal(legacy.client_instance_id, null);
  assert.equal(legacy.client_name, null);
  assert.notEqual(legacy.session_id, desktop.session_id);
  assert.notEqual(legacy.session_id, web.session_id);

  const userRow = await db.query(
    'SELECT id FROM users WHERE username = $1',
    [username],
  );
  assert.equal(userRow.rowCount, 1);
  const userId = userRow.rows[0].id;

  const sessionsBefore = await db.query(
    `SELECT id, client_type, client_instance_id, client_name, token_hash, revoked_at, last_used_at
     FROM refresh_sessions
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId],
  );
  assert.equal(sessionsBefore.rowCount, 3);
  assert.ok(sessionsBefore.rows.every(row => row.revoked_at === null));

  const byIdBefore = new Map(sessionsBefore.rows.map(row => [row.id, row]));
  assert.equal(byIdBefore.get(desktop.session_id).client_type, 'desktop');
  assert.equal(byIdBefore.get(desktop.session_id).client_instance_id, desktopInstanceId);
  assert.equal(byIdBefore.get(web.session_id).client_type, 'web');
  assert.equal(byIdBefore.get(web.session_id).client_instance_id, webInstanceId);
  assert.equal(byIdBefore.get(legacy.session_id).client_type, 'unknown');
  assert.equal(byIdBefore.get(legacy.session_id).client_instance_id, null);

  const desktopHashBefore = byIdBefore.get(desktop.session_id).token_hash;
  const webHashBefore = byIdBefore.get(web.session_id).token_hash;
  const legacyHashBefore = byIdBefore.get(legacy.session_id).token_hash;

  const desktopRefresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: desktop.refresh_token }),
  });
  assert.equal(desktopRefresh.response.status, 200);
  assert.equal(desktopRefresh.body.code, 0);

  const desktopRotated = desktopRefresh.body.data;
  latestAccessToken = desktopRotated.access_token;
  assert.equal(desktopRotated.session_id, desktop.session_id);
  assert.equal(desktopRotated.client_type, 'desktop');
  assert.equal(desktopRotated.client_instance_id, desktopInstanceId);
  assert.equal(desktopRotated.client_name, 'FlexiKit Desktop');

  const sessionsAfterDesktopRefresh = await db.query(
    `SELECT id, token_hash, revoked_at, last_used_at
     FROM refresh_sessions
     WHERE user_id = $1`,
    [userId],
  );
  const byIdAfter = new Map(
    sessionsAfterDesktopRefresh.rows.map(row => [row.id, row]),
  );
  assert.notEqual(byIdAfter.get(desktop.session_id).token_hash, desktopHashBefore);
  assert.ok(byIdAfter.get(desktop.session_id).last_used_at);
  assert.equal(byIdAfter.get(web.session_id).token_hash, webHashBefore);
  assert.equal(byIdAfter.get(web.session_id).revoked_at, null);
  assert.equal(byIdAfter.get(legacy.session_id).token_hash, legacyHashBefore);
  assert.equal(byIdAfter.get(legacy.session_id).revoked_at, null);

  const webRefresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: web.refresh_token }),
  });
  assert.equal(webRefresh.response.status, 200);
  assert.equal(webRefresh.body.data.session_id, web.session_id);
  assert.equal(webRefresh.body.data.client_type, 'web');
  latestAccessToken = webRefresh.body.data.access_token;

  const profile = await fetchJson('/v1/users/profile', {
    headers: { Authorization: `Bearer ${latestAccessToken}` },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.data.username, username);

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
    'SELECT id FROM refresh_sessions WHERE user_id = $1',
    [userId],
  );
  assert.equal(rowsAfterDelete.rowCount, 0);

  console.log('S4.2 live multi-client session smoke: PASS');
  console.log('desktop_web_legacy_sessions_coexist=3');
  console.log('cross_client_login_implicit_revoke=false');
  console.log('desktop_refresh_preserves_session_and_metadata=true');
  console.log('desktop_refresh_does_not_rotate_other_clients=true');
  console.log('web_refresh_remains_independent=true');
  console.log('legacy_client_metadata=unknown/null');
  console.log('account_delete_cascade_all_sessions=true');
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
