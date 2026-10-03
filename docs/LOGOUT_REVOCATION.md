# FlexiKit Logout and Session Revocation

> Status: S4.2 baseline complete
> Scope: current-session logout and immediate Session-bound Access/Refresh revocation

## 1. Security model

FlexiKit uses the server-side `refresh_sessions` row as the revocation authority for every new Session-bound Access Token.

New Access JWTs contain `sid = <refresh-session-uuid>`. Passport still verifies JWT signature and `exp`; `JwtStrategy` additionally verifies that the Session belongs to the authenticated user, exists, is not revoked, and has not reached its absolute Refresh expiry.

If any Session check fails, the protected request returns `401 / UNAUTHORIZED` immediately. This closes the previous gap where revoking a Refresh Session stopped future refreshes but an already-issued Access Token could continue until JWT expiry.

## 2. Logout API

```http
POST /v1/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json
```

For a current Session-bound Access Token, the body may be empty. The Backend uses the authenticated JWT `sid` as the authoritative Session identifier and writes `refresh_sessions.revoked_at = now()` inside a database transaction with a `pessimistic_write` row lock.

After success, both the current Refresh Token and all already-issued Access Tokens carrying that Session's `sid` are rejected.

## 3. Legacy sid-less migration fallback

Older signed Access Tokens may not contain `sid`. They remain temporarily compatible with ordinary protected APIs.

For server logout only, such a client may additionally send its current opaque Refresh Token:

```json
{
  "refresh_token": "<session-id>.<secret>"
}
```

The Backend parses the token, verifies Session ownership and the current Refresh secret hash, then revokes that Session. A mismatched secret, foreign Session or missing Session is rejected. A sid-less Access Token with no Refresh Token cannot perform server logout.

This is migration compatibility, not a second long-term logout protocol.

## 4. Other revocation sources

Immediate Access invalidation applies whenever a Session is revoked:

- explicit current-session logout,
- Device Management revocation of another Session,
- Refresh Token reuse/replay detection.

Because all new Access Tokens carry the same Session UUID, the next protected request observes the revoked Session and returns 401.

## 5. Frontend logout ordering

The shared User Store performs normal logout in this order:

1. Desktop reads the current DPAPI Refresh Token when needed; Browser sends its HttpOnly Refresh Cookie automatically (legacy Browser may submit its old sessionStorage token once),
2. call `POST /auth/logout`; Browser cookie mode also clears the HttpOnly Refresh Cookie server-side,
3. regardless of server outcome, clear local Access Token, Refresh Token and user-scoped state in `finally`.

Login/Profile/Navbar logout entry points await this operation before showing the final logout UI/navigation.

Account deletion is different: deleting the user already cascades all Refresh Sessions and the server clears the Browser HttpOnly Refresh Cookie; the client then uses local cleanup with `server: false` instead of issuing a redundant logout after the account is gone.

## 6. Offline behavior

A user must always be able to clear local credentials. If the logout request cannot reach the server, the client still clears local authentication state.

In that case the local device is logged out, while the server-side Refresh Session may remain active until it is remotely revoked or reaches its absolute expiry. Device Management from another authenticated Session remains the remote-revocation path for lost-device scenarios.

## 7. Performance boundary

Session-bound Access Tokens now require a Refresh Session lookup on protected requests. This is a correctness-first baseline that provides deterministic immediate revocation without a separate blacklist.

A future cache or session-version optimization may reduce that database read, but it must preserve the same immediate revocation semantics.

Legacy sid-less Access Tokens do not have Session state to check and remain subject to the temporary migration compatibility window.

## 8. Out of scope

This task does not introduce automatic logout-all, a new global revoke-all product action, final Browser HttpOnly Cookie authentication, or macOS/Linux Desktop credential storage.

## 9. Validation baseline

```bash
npm --prefix backend run build
npm --prefix backend run test:access-token-regression
npm --prefix backend run test:refresh-token-regression
npm --prefix backend run test:multi-client-regression
npm --prefix backend run test:device-management-regression
npm --prefix backend run test:logout-revocation-regression
npm --prefix backend run test:logout-revocation-live
npm --prefix backend run test:device-management-live
npm --prefix backend run test:refresh-token-live
npm --prefix apps/web run build
```

Verified behavior includes active Session acceptance; revoked/expired Session-bound Access rejection; current logout writing `revoked_at`; legacy Refresh-secret fallback; ownership/secret mismatch rejection; logout/device-revoke/replay causing old Access and Refresh to return 401; relogin after logout; and deterministic cleanup of temporary test accounts/Sessions.

Current Web strict build: **244 modules**.
