import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3021';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3021',
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
let username = null;
let userId = null;
let accessToken = null;
let accountDeleted = false;
let dbConnected = false;

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
  return { response, body: text ? JSON.parse(text) : null };
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

try {
  await waitUntilReady();
  await db.connect();
  dbConnected = true;

  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  username = `s43data_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';
  const clientInstanceId = randomUUID();

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      client_type: 'desktop',
      client_instance_id: clientInstanceId,
      client_name: 'FlexiKit Desktop',
    }),
  });
  assert.equal(register.response.status, 201);
  accessToken = register.body.data.access_token;

  const profile = await fetchJson('/v1/users/profile', {
    headers: bearer(accessToken),
  });
  assert.equal(profile.response.status, 200);
  userId = profile.body.data.id;

  const exported = await fetchJson('/v1/users/export-data', {
    headers: bearer(accessToken),
  });
  assert.equal(exported.response.status, 200);
  assert.equal(exported.body.data.schemaVersion, 1);
  assert.equal(exported.body.data.account.username, username);
  assert.equal(exported.body.data.authSessions.length, 1);
  assert.equal(exported.body.data.authSessions[0].clientInstanceId, clientInstanceId);

  const serializedExport = JSON.stringify(exported.body.data);
  for (const forbidden of [
    'password_hash',
    'tokenHash',
    'token_hash',
    'refresh_token',
    'embedding',
  ]) {
    assert.equal(serializedExport.includes(forbidden), false);
  }

  const rejectedDelete = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      ...bearer(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'delete' }),
  });
  assert.equal(rejectedDelete.response.status, 400);

  const acceptedDelete = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      ...bearer(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  assert.equal(acceptedDelete.response.status, 200);
  accountDeleted = true;

  const usersAfter = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
  const sessionsAfter = await db.query(
    'SELECT id FROM refresh_sessions WHERE user_id = $1',
    [userId],
  );
  assert.equal(usersAfter.rowCount, 0);
  assert.equal(sessionsAfter.rowCount, 0);

  const staleAccess = await fetchJson('/v1/users/profile', {
    headers: bearer(accessToken),
  });
  assert.equal(staleAccess.response.status, 401);

  console.log('S4.3 data export/delete live smoke: PASS');
  console.log('server_export_safe_contract=true');
  console.log('delete_confirmation_invalid=400');
  console.log('delete_confirmation_DELETE=200');
  console.log('user_and_refresh_sessions_removed=true');
  console.log('deleted_account_existing_access=401');
} finally {
  if (dbConnected && username && !accountDeleted) {
    await db.query('DELETE FROM users WHERE username = $1', [username]).catch(() => {});
  }
  if (dbConnected && !db.ended) {
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
