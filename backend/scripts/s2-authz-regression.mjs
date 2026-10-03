import { randomUUID } from 'node:crypto';

const baseUrl = process.env.FLEXIKIT_TEST_BASE_URL || 'http://127.0.0.1:3001';
const suffix = Date.now().toString(36);
const password = `Aa1!${randomUUID().replaceAll('-', '')}`;
const users = [
  { username: `s2a_${suffix}`, email: `s2a_${suffix}@example.test`, token: null },
  { username: `s2b_${suffix}`, email: `s2b_${suffix}@example.test`, token: null },
];

async function request(method, path, { body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  const normalizedData = (
    data
    && typeof data === 'object'
    && Object.prototype.hasOwnProperty.call(data, 'code')
    && Object.prototype.hasOwnProperty.call(data, 'data')
  )
    ? data.data
    : data;
  return { status: response.status, data: normalizedData };
}

function expectStatus(label, actual, expected) {
  const ok = actual.status === expected;
  console.log(`${label}: ${actual.status} ${ok ? 'PASS' : `FAIL expected ${expected}`}`);
  return ok;
}

let failed = false;
let toolId = null;
let categoryId = null;

try {
  for (const user of users) {
    const result = await request('POST', '/auth/register', {
      body: { username: user.username, email: user.email, password },
    });
    if (!expectStatus(`register ${user.username}`, result, 201) || !result.data?.access_token) {
      throw new Error(`Unable to register ${user.username}`);
    }
    user.token = result.data.access_token;
  }

  const tool = await request('POST', '/tools', {
    token: users[0].token,
    body: {
      name: `s2-own-${suffix}`,
      url: 'https://example.com',
      description: 'S2 authorization regression fixture',
    },
  });
  if (!expectStatus('A creates tool', tool, 201) || !Number.isInteger(tool.data?.id)) {
    throw new Error('Unable to create tool fixture');
  }
  toolId = tool.data.id;

  const category = await request('POST', '/categories', {
    token: users[0].token,
    body: { name: `s2-cat-${suffix}` },
  });
  if (!expectStatus('A creates category', category, 201) || !Number.isInteger(category.data?.id)) {
    throw new Error('Unable to create category fixture');
  }
  categoryId = category.data.id;

  failed ||= !expectStatus(
    'B cannot update A tool',
    await request('PUT', `/tools/${toolId}`, {
      token: users[1].token,
      body: { name: 'blocked' },
    }),
    403,
  );

  failed ||= !expectStatus(
    'B cannot delete A tool',
    await request('DELETE', `/tools/${toolId}`, { token: users[1].token }),
    403,
  );

  failed ||= !expectStatus(
    'B cannot update A category',
    await request('PUT', `/categories/${categoryId}`, {
      token: users[1].token,
      body: { name: 'blocked' },
    }),
    403,
  );

  failed ||= !expectStatus(
    'B cannot favorite A private tool',
    await request('POST', `/favorites/${toolId}`, { token: users[1].token }),
    403,
  );

  failed ||= !expectStatus(
    'Missing tool cannot be favorited',
    await request('POST', '/favorites/999999999', { token: users[1].token }),
    404,
  );

  failed ||= !expectStatus(
    'A can favorite own tool',
    await request('POST', `/favorites/${toolId}`, { token: users[0].token }),
    201,
  );

  failed ||= !expectStatus(
    'Duplicate favorite stays idempotent',
    await request('POST', `/favorites/${toolId}`, { token: users[0].token }),
    201,
  );
} finally {
  for (const user of users) {
    if (!user.token) continue;
    const cleanup = await request('DELETE', '/users/account', {
      token: user.token,
      body: { confirmation: 'DELETE' },
    });
    console.log(`cleanup ${user.username}: ${cleanup.status}`);
    if (cleanup.status !== 200) failed = true;
  }
}

if (failed) process.exitCode = 1;
