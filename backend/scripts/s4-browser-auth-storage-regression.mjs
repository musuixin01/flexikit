import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  BROWSER_AUTH_MODE_HEADER,
  BROWSER_AUTH_MODE_VALUE,
  BROWSER_REFRESH_COOKIE_NAME,
  browserRefreshCookieOptions,
  clearBrowserRefreshCookie,
  isBrowserCookieAuthRequest,
  omitRefreshToken,
  readBrowserRefreshCookie,
  setBrowserRefreshCookie,
} = require('../dist/auth/browser-refresh-cookie.js');

assert.equal(
  isBrowserCookieAuthRequest({
    headers: { [BROWSER_AUTH_MODE_HEADER]: BROWSER_AUTH_MODE_VALUE },
  }),
  true,
);
assert.equal(
  isBrowserCookieAuthRequest({
    headers: { [BROWSER_AUTH_MODE_HEADER]: 'legacy-body' },
  }),
  false,
);

const token = '11111111-1111-4111-8111-111111111111.secret-value';
assert.equal(
  readBrowserRefreshCookie({
    headers: {
      cookie: `other=value; ${BROWSER_REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; last=1`,
    },
  }),
  token,
);
assert.equal(readBrowserRefreshCookie({ headers: {} }), null);

const future = new Date(Date.now() + 60_000).toISOString();
const devOptions = browserRefreshCookieOptions(false, future);
assert.equal(devOptions.httpOnly, true);
assert.equal(devOptions.secure, false);
assert.equal(devOptions.sameSite, 'strict');
assert.equal(devOptions.path, '/');
assert.ok(devOptions.expires instanceof Date);
assert.ok(Number(devOptions.maxAge) > 0);

const prodOptions = browserRefreshCookieOptions(true);
assert.equal(prodOptions.httpOnly, true);
assert.equal(prodOptions.secure, true);

assert.throws(
  () => browserRefreshCookieOptions(false, 'not-a-date'),
  /expiry metadata is invalid/,
);

const safe = omitRefreshToken({
  access_token: 'access',
  refresh_token: 'secret',
  refresh_expires_at: future,
});
assert.equal('refresh_token' in safe, false);
assert.equal(safe.access_token, 'access');

let setCall = null;
setBrowserRefreshCookie(
  {
    cookie(name, value, options) {
      setCall = { name, value, options };
      return this;
    },
  },
  token,
  future,
  false,
);
assert.equal(setCall.name, BROWSER_REFRESH_COOKIE_NAME);
assert.equal(setCall.value, token);
assert.equal(setCall.options.httpOnly, true);

let clearCall = null;
clearBrowserRefreshCookie(
  {
    clearCookie(name, options) {
      clearCall = { name, options };
      return this;
    },
  },
  false,
);
assert.equal(clearCall.name, BROWSER_REFRESH_COOKIE_NAME);
assert.equal(clearCall.options.httpOnly, true);
assert.equal(clearCall.options.sameSite, 'strict');

console.log('browser auth-mode header gate: PASS');
console.log('HttpOnly refresh cookie parsing/options: PASS');
console.log('browser auth response omits refresh secret: PASS');
console.log('cookie set/clear helpers preserve security attributes: PASS');
console.log('S4.3 browser secret-storage regression: PASS');
