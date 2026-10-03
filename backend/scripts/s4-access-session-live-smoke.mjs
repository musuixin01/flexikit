import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const baseUrl = 'http://127.0.0.1:3015';
const backend = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3015',
    ACCESS_TOKEN_TTL: '2m',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
let token = null;
let accountDeleted = false;

backend.stdout.on('data', chunk => {
  stdout = (stdout + chunk.toString()).slice(-12000);
});
backend.stderr.on('data', chunk => {
  stderr = (stderr + chunk.toString()).slice(-12000);
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
  if (!token || accountDeleted || backend.exitCode !== null) return;
  try {
    const response = await fetch(baseUrl + '/v1/users/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
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

  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const username = `s42_${suffix}`;
  const email = `${username}@example.com`;
  const password = 'FlexiKit123!';

  const register = await fetchJson('/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  assert.equal(register.response.status, 201);
  assert.equal(register.body.code, 0);

  const auth = register.body.data;
  token = auth.access_token;

  assert.equal(typeof token, 'string');
  assert.equal(auth.token_type, 'Bearer');
  assert.equal(auth.expires_in, 120);
  assert.equal(typeof auth.expires_at, 'string');

  const segments = token.split('.');
  assert.equal(segments.length, 3);
  const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));

  assert.equal(claims.token_use, 'access');
  assert.equal(claims.exp - claims.iat, 120);
  assert.equal(
    Math.floor(new Date(auth.expires_at).getTime() / 1000),
    claims.exp,
  );

  const profile = await fetchJson('/v1/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.data.username, username);

  const deletion = await fetchJson('/v1/users/account', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  assert.equal(deletion.response.status, 200);
  accountDeleted = true;

  const stale = await fetchJson('/v1/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(stale.response.status, 401);
  assert.equal(stale.body.code, 'UNAUTHORIZED');

  console.log('S4.2 live access token lifecycle smoke: PASS');
  console.log('register=201 token_type=Bearer expires_in=120');
  console.log('jwt_token_use=access jwt_ttl=120');
  console.log('expires_at_matches_jwt_exp=true');
  console.log('protected_profile=200');
  console.log('test_account_deleted=true');
  console.log('deleted_account_token=401/UNAUTHORIZED');
} finally {
  await cleanupAccount();
  if (backend.exitCode === null) {
    backend.kill();
    await new Promise(resolve => {
      backend.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
}
