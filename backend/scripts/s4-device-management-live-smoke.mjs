import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3018';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3018',
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

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
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
  const username = `s42dm_${suffix}`;
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
  cleanupAccessToken = desktop.access_token;

  const desktopJwt = decodeJwtPayload(desktop.access_token);
  assert.equal(desktopJwt.sid, desktop.session_id);

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
  const web = webLogin.body.data;
  const webJwt = decodeJwtPayload(web.access_token);
  assert.equal(webJwt.sid, web.session_id);

  const listBefore = await fetchJson('/v1/auth/sessions', {
    headers: bearer(desktop.access_token),
  });
  assert.equal(listBefore.response.status, 200);
  assert.equal(listBefore.body.code, 0);
  assert.equal(listBefore.body.data.length, 2);

  const current = listBefore.body.data.find(session => session.session_id === desktop.session_id);
  const other = listBefore.body.data.find(session => session.session_id === web.session_id);
  assert.ok(current);
  assert.ok(other);
  assert.equal(current.is_current, true);
  assert.equal(other.is_current, false);
  assert.equal(current.client_type, 'desktop');
  assert.equal(other.client_type, 'web');
  assert.equal('token_hash' in current, false);
  assert.equal('tokenHash' in current, false);
  assert.equal('refresh_token' in current, false);

  const revokeCurrent = await fetchJson(
    `/v1/auth/sessions/${desktop.session_id}`,
    {
      method: 'DELETE',
      headers: bearer(desktop.access_token),
    },
  );
  assert.equal(revokeCurrent.response.status, 400);
  assert.equal(revokeCurrent.body.code, 'BAD_REQUEST');

  const revokeOther = await fetchJson(
    `/v1/auth/sessions/${web.session_id}`,
    {
      method: 'DELETE',
      headers: bearer(desktop.access_token),
    },
  );
  assert.equal(revokeOther.response.status, 200);
  assert.equal(revokeOther.body.data.session_id, web.session_id);

  const revokedRow = await db.query(
    'SELECT revoked_at FROM refresh_sessions WHERE id = $1',
    [web.session_id],
  );
  assert.ok(revokedRow.rows[0].revoked_at);

  const revokedRefresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: web.refresh_token }),
  });
  assert.equal(revokedRefresh.response.status, 401);
  assert.equal(revokedRefresh.body.code, 'UNAUTHORIZED');

  const existingWebAccess = await fetchJson('/v1/users/profile', {
    headers: bearer(web.access_token),
  });
  assert.equal(existingWebAccess.response.status, 401);
  assert.equal(existingWebAccess.body.code, 'UNAUTHORIZED');

  const currentRefresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: desktop.refresh_token }),
  });
  assert.equal(currentRefresh.response.status, 200);
  assert.equal(currentRefresh.body.data.session_id, desktop.session_id);
  cleanupAccessToken = currentRefresh.body.data.access_token;

  const listAfter = await fetchJson('/v1/auth/sessions', {
    headers: bearer(cleanupAccessToken),
  });
  assert.equal(listAfter.response.status, 200);
  assert.equal(listAfter.body.data.length, 1);
  assert.equal(listAfter.body.data[0].session_id, desktop.session_id);
  assert.equal(listAfter.body.data[0].is_current, true);

  const userRow = await db.query(
    'SELECT id FROM users WHERE username = $1',
    [username],
  );
  assert.equal(userRow.rowCount, 1);
  const userId = userRow.rows[0].id;

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

  console.log('S4.2 live device management smoke: PASS');
  console.log('access_jwt_sid_matches_session_id=true');
  console.log('session_list_current_and_other=2');
  console.log('session_list_exposes_token_material=false');
  console.log('revoke_current_session=400/BAD_REQUEST');
  console.log('revoke_other_session=200');
  console.log('revoked_other_refresh=401/UNAUTHORIZED');
  console.log('revoked_other_existing_access=401/UNAUTHORIZED');
  console.log('current_session_refresh_still=200');
  console.log('active_session_list_after_revoke=1');
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
