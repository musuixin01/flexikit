import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;
const baseUrl = 'http://127.0.0.1:3020';
const authModeHeaders = { 'X-FlexiKit-Auth-Mode': 'browser-cookie' };
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3020',
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
let dbConnected = false;
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
  return {
    response,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
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

function requireCookiePair(setCookie) {
  assert.equal(typeof setCookie, 'string');
  const pair = setCookie.split(';', 1)[0];
  assert.ok(pair.startsWith('flexikit_refresh_session='));
  return pair;
}

function cookieToken(cookiePair) {
  const encoded = cookiePair.slice(cookiePair.indexOf('=') + 1);
  return decodeURIComponent(encoded);
}

function assertSecureCookieAttributes(setCookie) {
  assert.match(setCookie, /;\s*Path=\//i);
  assert.match(setCookie, /;\s*HttpOnly/i);
  assert.match(setCookie, /;\s*SameSite=Strict/i);
}

try {
  await waitUntilReady();
  await db.connect();
  dbConnected = true;

  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  username = `s43cookie_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authModeHeaders,
    },
    body: JSON.stringify({
      username,
      email,
      password,
      client_type: 'web',
      client_instance_id: randomUUID(),
      client_name: 'FlexiKit Web',
    }),
  });

  assert.equal(register.response.status, 201);
  assert.equal(register.body.code, 0);
  assert.equal('refresh_token' in register.body.data, false);
  const first = register.body.data;
  const firstCookiePair = requireCookiePair(register.setCookie);
  assertSecureCookieAttributes(register.setCookie);
  assert.doesNotMatch(register.setCookie, /;\s*Secure/i);

  const firstRefreshToken = cookieToken(firstCookiePair);
  assert.ok(firstRefreshToken.startsWith(first.session_id + '.'));

  const rowBefore = await db.query(
    'SELECT token_hash, revoked_at FROM refresh_sessions WHERE id = $1',
    [first.session_id],
  );
  assert.equal(rowBefore.rowCount, 1);
  assert.equal(rowBefore.rows[0].revoked_at, null);
  assert.notEqual(rowBefore.rows[0].token_hash, firstRefreshToken);
  assert.notEqual(rowBefore.rows[0].token_hash, firstRefreshToken.split('.')[1]);

  const cookieWithoutMode = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: firstCookiePair,
    },
    body: JSON.stringify({}),
  });
  assert.equal(cookieWithoutMode.response.status, 401);

  const refresh = await fetchJson('/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: firstCookiePair,
      ...authModeHeaders,
    },
    body: JSON.stringify({}),
  });
  assert.equal(refresh.response.status, 200);
  assert.equal(refresh.body.code, 0);
  assert.equal('refresh_token' in refresh.body.data, false);
  assert.equal(refresh.body.data.session_id, first.session_id);

  const secondCookiePair = requireCookiePair(refresh.setCookie);
  assertSecureCookieAttributes(refresh.setCookie);
  const secondRefreshToken = cookieToken(secondCookiePair);
  assert.notEqual(secondRefreshToken, firstRefreshToken);
  assert.ok(secondRefreshToken.startsWith(first.session_id + '.'));

  const rowAfterRotation = await db.query(
    'SELECT token_hash, revoked_at FROM refresh_sessions WHERE id = $1',
    [first.session_id],
  );
  assert.equal(rowAfterRotation.rowCount, 1);
  assert.notEqual(rowAfterRotation.rows[0].token_hash, rowBefore.rows[0].token_hash);
  assert.equal(rowAfterRotation.rows[0].revoked_at, null);

  const profile = await fetchJson('/v1/users/profile', {
    headers: bearer(refresh.body.data.access_token),
  });
  assert.equal(profile.response.status, 200);
  const userId = profile.body.data.id;

  const logout = await fetchJson('/v1/auth/logout', {
    method: 'POST',
    headers: {
      ...bearer(refresh.body.data.access_token),
      'Content-Type': 'application/json',
      Cookie: secondCookiePair,
      ...authModeHeaders,
    },
    body: JSON.stringify({}),
  });
  assert.equal(logout.response.status, 200);
  assert.match(logout.setCookie, /flexikit_refresh_session=/);
  assert.match(logout.setCookie, /Expires=Thu, 01 Jan 1970/i);

  const revokedProfile = await fetchJson('/v1/users/profile', {
    headers: bearer(refresh.body.data.access_token),
  });
  assert.equal(revokedProfile.response.status, 401);

  const relogin = await fetchJson('/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authModeHeaders,
    },
    body: JSON.stringify({
      username,
      password,
      client_type: 'web',
      client_instance_id: randomUUID(),
      client_name: 'FlexiKit Web',
    }),
  });
  assert.equal(relogin.response.status, 200);
  assert.equal('refresh_token' in relogin.body.data, false);
  const reloginCookiePair = requireCookiePair(relogin.setCookie);

  const deletion = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      ...bearer(relogin.body.data.access_token),
      Cookie: reloginCookiePair,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  assert.equal(deletion.response.status, 200);
  assert.match(deletion.setCookie, /flexikit_refresh_session=/);
  assert.match(deletion.setCookie, /Expires=Thu, 01 Jan 1970/i);
  accountDeleted = true;

  const sessionsAfterDelete = await db.query(
    'SELECT id FROM refresh_sessions WHERE user_id = $1',
    [userId],
  );
  assert.equal(sessionsAfterDelete.rowCount, 0);

  console.log('S4.3 browser HttpOnly secret-storage live smoke: PASS');
  console.log('browser_register_refresh_secret_in_json=false');
  console.log('browser_refresh_cookie=HttpOnly/SameSiteStrict/PathRoot');
  console.log('cookie_without_auth_mode=401');
  console.log('cookie_refresh_rotation=same_session_new_secret');
  console.log('plaintext_refresh_secret_in_db=false');
  console.log('browser_logout_cookie_cleared=true access_revoked=401');
  console.log('account_delete_cookie_cleared=true');
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
