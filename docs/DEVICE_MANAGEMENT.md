# FlexiKit Device Management

> Status: S4.2 baseline
> Scope: active authentication-session visibility and revocation of other sessions
> Current-session logout / immediate Access Token revocation: completed in `docs/LOGOUT_REVOCATION.md`

## 1. Product behavior

Device Management is available in:

```text
个人中心 -> 账户 -> 登录设备
```

The panel shows the user's currently active Refresh Sessions.

For each session it displays only:

- client display name,
- client type,
- login time,
- last Refresh time when available,
- absolute Refresh expiry,
- whether it is the current Session.

It does not expose Refresh Tokens, Access Tokens, token hashes, IP addresses, User-Agent strings, hardware identifiers, or browser fingerprints.

## 2. Current Session identity

New Access Tokens include:

```json
{
  "token_use": "access",
  "sid": "<refresh-session-uuid>"
}
```

The `sid` is the stable server-side Refresh Session ID created by login/registration. Passport JWT validation maps it to `req.user.sessionId`, so the Backend determines the current Session itself instead of trusting a renderer-supplied current-session value.

Old signed Access Tokens without `sid` remain valid for ordinary protected APIs. They receive `sessionId = null`; such legacy tokens may list sessions but cannot revoke another device until a new Session-bound Access Token is issued.

## 3. APIs

```http
GET /v1/auth/sessions
Authorization: Bearer <access-token>
```

Returns only sessions for the authenticated user where `revoked_at IS NULL` and `expires_at > now()`. Response fields are limited to session/client metadata, timestamps and `is_current`; token material is never projected.

```http
DELETE /v1/auth/sessions/:sessionId
Authorization: Bearer <access-token>
```

Rules:

1. `:sessionId` must be UUID v4.
2. The target must belong to the authenticated user.
3. The current Access Token must contain a Session `sid`.
4. The target must be active and unexpired.
5. The target cannot be the current Session.
6. Success writes `revoked_at = now()`.

Current-session removal returns `400 / BAD_REQUEST`. A missing, foreign or already-invalid Session returns `404`.

## 4. Revocation semantics

Removing another Session immediately prevents its Refresh Token from rotating again:

```text
POST /v1/auth/refresh -> 401 / UNAUTHORIZED
```

The Session disappears from subsequent active-session listings.

Session-bound Access Tokens are checked against the server-side Refresh Session on every protected request. Once Device Management writes `revoked_at`, both the removed Session's Refresh Token and already-issued sid-bound Access Tokens are rejected with `401 / UNAUTHORIZED`. Legacy sid-less Access Tokens remain under the temporary migration compatibility policy.

## 5. Frontend

`DeviceSessionsPanel.vue` is mounted only in the Profile account view.

It provides:

- loading, retry and manual refresh states,
- current-device highlighting,
- client label/type and activity/expiry timestamps,
- confirmation before removing another Session,
- disabled removal when a legacy Access Token cannot identify the current Session,
- clear disclosure that Session-bound Access and Refresh Tokens are both invalidated by server revocation.

The component uses the shared `authApi` and never reads or parses Refresh Tokens.

## 6. Privacy boundary

Device Management reuses only the client metadata defined by `docs/MULTI_CLIENT_AUTH.md`.

No IP address, User-Agent, approximate location, hardware serial, MAC address or browser fingerprint was added. `client_type`, `client_name` and `client_instance_id` remain untrusted descriptive metadata; authorization uses the authenticated user and server-owned Session UUID.

## 7. Validation

```bash
npm --prefix backend run test:device-management-regression
npm --prefix backend run test:device-management-live
npm --prefix apps/web run build
```

Verified:

- current Session is marked and sorted first,
- response excludes Token/hash material,
- current Session revoke is blocked,
- legacy Access Token without `sid` cannot revoke devices,
- foreign/missing Session returns 404,
- other Session receives `revoked_at`,
- revoked Session Refresh returns `401 / UNAUTHORIZED`,
- current Session Refresh remains 200,
- active list shrinks after revoke,
- account deletion cascades all Session rows.

The updated live smoke verifies that the revoked Session's already-issued sid-bound Access Token is rejected immediately with `401 / UNAUTHORIZED`.

Existing Access, Refresh, multi-client and S4.1 regressions/live smokes continue to pass.

Current Web strict build: **244 modules**.
