# FlexiKit Access Token Lifecycle

> Status: S4.2 baseline
> Scope: Access Token lifecycle
> Refresh Token is implemented separately in `docs/REFRESH_SESSION_LIFECYCLE.md`.

## 1. Lifetime

New deployments use:

```env
ACCESS_TOKEN_TTL=30m
```

Default: **30 minutes**.

Accepted formats:

- integer seconds, e.g. `1800`
- `s`, `m`, `h`, `d`, e.g. `30m`, `1h`, `7d`

Allowed range: **60 seconds to 30 days**.

Invalid values fail fast when the Auth service starts.

For migration compatibility, legacy `JWT_EXPIRES_IN` is still read only when `ACCESS_TOKEN_TTL` is not configured. New configuration and documentation must use `ACCESS_TOKEN_TTL`.

## 2. Issuance

Login and registration return:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 1800,
  "expires_at": "2026-09-25T00:00:00.000Z"
}
```

The outer API success envelope is unchanged.

Every new JWT contains:

- `sub`: user id
- `username`
- `token_use = "access"`
- `sid = <refresh-session-uuid>` for new Session-bound Access Tokens
- standard `iat`
- standard `exp`

`expires_at` is derived from the JWT `exp` claim, so client metadata and server validation use the same expiry point.

## 3. Validation

Passport JWT keeps `ignoreExpiration = false`, so expired tokens are rejected by the server.

The Access strategy additionally rejects any JWT whose explicit `token_use` is not `access`.

For migration compatibility, old signed Access Tokens without a `token_use` claim are temporarily accepted. Tokens that predate device management may also lack `sid`; they remain valid for ordinary protected APIs but receive `sessionId = null` and cannot revoke another Session until a new Session-bound Access Token is issued.

## 4. Web client lifecycle

Browser Web keeps the current Access Token in runtime memory only. Windows Desktop keeps it in the DPAPI Current User vault.

The client checks expiry:

- during application/user-store initialization,
- before attaching Authorization to every API request,
- with an expiry timer after login/registration,
- when the window regains focus,
- after any server 401.

When the Access Token expires, the client removes only that Access Token. If a valid Refresh Session exists, the next protected API request obtains a new Access Token automatically. Authentication state is cleared only when refresh is unavailable or fails.

For Browser upgrade compatibility, a still-valid legacy localStorage Access Token may be moved into memory once; its Web Storage token/expiry entries are then deleted. Old JWT `exp` may be decoded only to recover expiry metadata and is never trusted for authorization.

Server-side signature/expiry validation remains authoritative.

## 5. Current storage boundary

Browser Web no longer normally persists Access Tokens in Web Storage. Access is memory-only and is reissued through the HttpOnly Refresh Session after reload when the Session is still active.

Windows Desktop uses the Tauri native DPAPI Current User vault documented in `docs/DESKTOP_AUTH_STORAGE.md`.

Browser Refresh Cookie and migration details are documented in `docs/BROWSER_AUTH_STORAGE.md` and `docs/REFRESH_SESSION_LIFECYCLE.md`.

S4.2 logout / immediate server-side Access revocation remains authoritative: Session-bound Access Tokens are rejected immediately when their server Session is revoked.

## 6. Configuration precedence

Backend resolves lifetime in this order:

1. `ACCESS_TOKEN_TTL`
2. legacy `JWT_EXPIRES_IN`
3. default `30m`

The JwtModule no longer owns a global default expiry. Access Token issuance passes the resolved TTL explicitly, which prevents future Refresh Tokens from accidentally inheriting the Access Token lifetime.

## 7. Validation baseline

```bash
npm --prefix backend run build
npm --prefix backend run test:access-token-regression
npm --prefix backend run test:access-token-live
npm --prefix backend run test:refresh-token-regression
npm --prefix backend run test:refresh-token-live
npm --prefix backend run test:device-management-regression
npm --prefix backend run test:device-management-live
npm --prefix backend run test:logout-revocation-regression
npm --prefix backend run test:logout-revocation-live
npm --prefix backend run test:error-regression
npm --prefix backend run test:response-regression
npm --prefix backend run test:logging-regression
npm --prefix backend run test:type-audit
npm --prefix backend run test:versioning-regression
npm --prefix backend run test:browser-secret-storage-regression
npm --prefix backend run test:browser-secret-storage-live
npm --prefix apps/web run build
```

The live smoke uses an isolated local Backend with `ACCESS_TOKEN_TTL=2m`, creates a random test account, verifies JWT/response expiry metadata, accesses a protected route, deletes the test account, and confirms the deleted account's token returns 401.
