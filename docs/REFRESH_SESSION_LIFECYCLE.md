# FlexiKit Refresh Token Lifecycle

> Status: S4.2 baseline
> Scope: Refresh Token issuance, rotation and replay detection

## 1. Design

FlexiKit uses an opaque rotating Refresh Token instead of a long-lived JWT.

Token format:

```text
<session-id>.<random-secret>
```

- `session-id`: UUID identifying one server-side refresh session.
- `random-secret`: 32 random bytes encoded as base64url.
- The database stores only SHA-256 of the secret.
- Direct API/Desktop mode returns the plaintext Refresh Token at issuance/rotation; Browser cookie mode sends it only as an HttpOnly Cookie and omits it from JSON.

This keeps revocation state server-side and avoids storing a reusable long-lived bearer secret in PostgreSQL.

## 2. Lifetime

New deployments use:

```env
REFRESH_TOKEN_TTL=30d
```

Default: **30 days**.

Accepted formats:

- integer seconds,
- `s`, `m`, `h`, `d` duration suffixes.

Allowed range: **1 day to 180 days**. Invalid values fail fast during Auth service initialization.

Refresh rotation does **not** extend the original absolute session expiry. Every rotated token keeps the same `refresh_expires_at`.

## 3. Database session

Migration `1790298000000-AddRefreshSessions.ts` adds `refresh_sessions`. Migration `1790299800000-AddRefreshSessionClientContext.ts` adds the multi-client metadata used by `docs/MULTI_CLIENT_AUTH.md`.

Stored fields include:

- session UUID,
- user id,
- SHA-256 token hash,
- client type (`web / desktop / mobile / unknown`),
- optional random client instance UUID,
- optional client display name,
- absolute expiry,
- optional revoked timestamp,
- optional last-used timestamp,
- created / updated timestamps.

The user foreign key uses `ON DELETE CASCADE ON UPDATE CASCADE`. Deleting an account therefore removes its refresh sessions without a second cleanup path.

The database never stores the plaintext Refresh Token.

## 4. Issuance

Login and registration now return the Access Token lifecycle plus:

```json
{
  "refresh_token": "<opaque-token>",
  "refresh_expires_in": 2592000,
  "refresh_expires_at": "2026-10-25T00:00:00.000Z",
  "session_id": "<uuid>",
  "client_type": "web",
  "client_instance_id": "<uuid-or-null>",
  "client_name": "FlexiKit Web"
}
```

Registration creates the user and first refresh session in one TypeORM transaction.

Login/registration may attach validated client metadata. Old clients can omit it and are stored as `unknown/null`. Each login creates an independent Refresh Session; logging in elsewhere does not implicitly revoke existing sessions.

## 5. Rotation

`POST /v1/auth/refresh` accepts:

```json
{
  "refresh_token": "<opaque-token>"
}
```

The server:

1. parses the session id and secret,
2. opens a database transaction,
3. locks only the target `refresh_sessions` row with `pessimistic_write`,
4. rejects missing, revoked or expired sessions,
5. compares the provided secret hash using a constant-time boundary,
6. loads the user inside the same transaction,
7. generates a new secret for the same session id,
8. overwrites the stored hash,
9. returns a new Access Token and rotated Refresh Token with the same session/client metadata.

Browser cookie mode may instead submit an empty JSON body plus the HttpOnly Cookie and `X-FlexiKit-Auth-Mode: browser-cookie`. Legacy body-token clients remain compatible.

The row lock makes a Refresh Token single-use under concurrent requests.

## 6. Replay / reuse detection

After a successful rotation, the old token still contains the same public session id but its secret no longer matches the stored hash.

If that old token is presented again:

- the server detects the hash mismatch,
- marks the whole refresh session revoked,
- returns `401 / UNAUTHORIZED`.

After reuse detection, even the most recently rotated Refresh Token for that session is rejected.

Session-bound Access Tokens are tied to the same server-side Session through JWT `sid`. Replay/reuse detection revokes that Session, so both the latest Refresh Token and already-issued sid-bound Access Tokens are rejected immediately. See `docs/LOGOUT_REVOCATION.md`.

## 7. Client behavior

Browser Web now uses:

- Access Token: runtime memory only,
- Refresh Token: HttpOnly `flexikit_refresh_session` Cookie,
- localStorage: only a non-secret Refresh Session expiry marker.

Windows Desktop stores both Token types in its DPAPI Current User native vault instead of Web Storage; see `docs/DESKTOP_AUTH_STORAGE.md`.

The Refresh Token is never added to normal `Authorization` headers.

Axios refresh coordination uses an in-tab single-flight Promise plus feature-detected Web Locks across Browser tabs. A successful Browser refresh updates the HttpOnly Cookie server-side, persists the new Access Token only in memory, updates only the non-secret expiry marker, and retries the original request once.

Legacy Browser sessionStorage Refresh material may be submitted once in cookie mode, after which it is deleted.

Access Token expiry alone no longer means logout. The user store listens for `AUTH_REFRESHED_EVENT` so its Access expiry timer follows the newly issued token.

## 8. Storage boundary

Browser Refresh Secret storage is now an HttpOnly Cookie boundary rather than JavaScript-readable Web Storage. The Cookie is SameSite=Strict, Path=/ and Secure in production; explicit cookie mode omits `refresh_token` from JSON.

Windows Desktop secure storage remains DPAPI Current User with fixed native token slots. The renderer obtains Desktop Tokens through Tauri IPC only when authentication logic needs them.

See `docs/BROWSER_AUTH_STORAGE.md` for the Browser protocol, CSRF/CORS boundary, legacy migration and threat model. Device Management remains documented in `docs/DEVICE_MANAGEMENT.md`.

## 9. Migration and rollback

The new migration is additive and does not alter existing user/tool data.

Backend startup runs it through the existing TypeORM migration mechanism. Re-running `migration:run` after application reports:

```text
No migrations are pending
```

The client-context migration rolls back only its composite index and three metadata columns. The original Refresh Session migration still owns the base table rollback; neither migration changes the users table.

## 10. Validation baseline

```bash
npm --prefix backend run build
npm --prefix backend run test:refresh-token-regression
npm --prefix backend run test:refresh-token-live
npm --prefix backend run test:access-token-regression
npm --prefix backend run test:access-token-live
npm --prefix backend run test:error-regression
npm --prefix backend run test:response-regression
npm --prefix backend run test:logging-regression
npm --prefix backend run test:type-audit
npm --prefix backend run test:versioning-regression
npm --prefix backend run migration:run
npm --prefix apps/web run build
```

The live Refresh Token smoke uses a random temporary account and verifies:

- refresh-session migration is usable,
- plaintext Refresh Token is not stored in PostgreSQL,
- rotation keeps the session id but changes secret/hash,
- old-token replay returns 401 and revokes the session,
- the rotated token is rejected after reuse detection,
- the rotated Access Token remains valid,
- account deletion cascades the refresh session,
- the temporary account/session is removed.
