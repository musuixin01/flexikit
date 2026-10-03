# FlexiKit Secret / Token Storage

> Status: S4.3 baseline complete
> Scope: Browser Web + Windows Desktop authentication secrets

## 1. Core rule

FlexiKit does not use JavaScript-side "encryption" of browser storage as a security claim.

If JavaScript can obtain both an encrypted Token and its decryption key, an XSS running in the same origin can normally obtain the plaintext as well. The S4.3 baseline therefore separates Browser and Desktop by platform trust boundary.

## 2. Browser Web

### Access Token

Browser Access Tokens are **memory-only**.

They are not normally persisted to localStorage or sessionStorage.

A page reload loses the Access Token. If the Browser still has an active Refresh Session, the shared API client obtains a new Access Token from the server before the protected request proceeds.

Legacy Browser builds may still have:

- `localStorage["token"]`,
- `localStorage["flexikit-access-token-expires-at"]`.

On first hydrate, a still-valid legacy Access Token may be moved into runtime memory so the upgrade does not force an immediate logout. The plaintext Web Storage copy is then removed.

### Refresh Token

Browser Refresh Tokens are held by the browser as:

```text
Cookie: flexikit_refresh_session=<opaque sessionId.secret>
```

Cookie attributes:

- `HttpOnly`,
- `SameSite=Strict`,
- `Path=/`,
- `Secure` in production,
- expiry/max-age aligned with the server Refresh Session absolute expiry.

Browser JavaScript does not read this cookie.

The Browser stores only the non-secret Refresh Session expiry marker:

```text
localStorage["flexikit-browser-refresh-session-expires-at-v1"]
```

That marker tells the client whether attempting a Cookie refresh is worthwhile. It is not an authentication credential and cannot create a Session by itself.

## 3. Browser cookie-mode protocol

The shared Browser client identifies the hardened flow with:

```http
X-FlexiKit-Auth-Mode: browser-cookie
```

For login, registration and refresh in this mode:

1. Backend creates/rotates the normal server-side Refresh Session.
2. Backend writes the opaque Refresh Token to the HttpOnly Cookie.
3. JSON still contains Access/session/expiry metadata.
4. JSON **does not contain `refresh_token`**.

For refresh:

```http
POST /v1/auth/refresh
X-FlexiKit-Auth-Mode: browser-cookie
Cookie: flexikit_refresh_session=...
```

The request body may be empty.

For migration, a Browser with a legacy sessionStorage Refresh Token may send it in the body once while using cookie mode. The successful response rotates the secret into the HttpOnly Cookie; the client then deletes the old sessionStorage copy.

A Cookie presented without the explicit browser auth-mode header is not accepted as a substitute for the legacy body-token protocol.

## 4. CSRF and cross-origin boundary

The Refresh Cookie uses `SameSite=Strict`.

Cookie-mode refresh also requires the custom `X-FlexiKit-Auth-Mode` header. Cross-origin JavaScript therefore requires a CORS preflight, and only configured FlexiKit origins may receive permission to send that header.

This is defense in depth; it does not replace normal origin/CORS deployment discipline.

## 5. Refresh rotation concurrency

Refresh Tokens are single-use and replay detection revokes the whole Session, so concurrent Browser refreshes must not race.

The client uses:

- an in-tab single-flight Promise,
- feature-detected Web Locks with `flexikit-browser-refresh-v1` across tabs.

When Web Locks is available, tabs sharing one Browser Cookie rotate the Session sequentially instead of presenting the same stale secret concurrently.

## 6. Browser logout and account deletion

Normal Browser logout:

1. sends the current Access Token plus HttpOnly Refresh Cookie,
2. server revokes the current Session,
3. server clears the Refresh Cookie,
4. client clears its memory Access Token and non-secret expiry marker in `finally`.

If the logout request cannot reach the server, local state is still cleared so the user can leave the local authenticated UI. The server Session may then remain until remote revocation or absolute expiry.

Account deletion also clears the HttpOnly Cookie server-side because Browser JavaScript cannot delete an HttpOnly cookie directly.

## 7. Windows Desktop

Windows Desktop keeps the existing S4.2 architecture:

- Access Token -> DPAPI Current User vault,
- Refresh Token -> DPAPI Current User vault,
- fixed `access` / `refresh` slots,
- no normal Token persistence in WebView storage.

The Browser Cookie mode is not used by Tauri Desktop. Desktop continues to use the explicit body Refresh Token returned by the API and persists it through native DPAPI IPC.

See `docs/DESKTOP_AUTH_STORAGE.md`.

## 8. Legacy API compatibility

Direct API clients and Desktop clients that do not send the browser auth-mode header keep the existing contract:

```json
{
  "refresh_token": "<opaque-token>"
}
```

This avoids coupling the Browser hardening migration to Desktop or third-party/internal API callers.

The server-side Refresh Session, rotation, hash-only database storage, replay detection and immediate Session revocation semantics are shared by both modes.

## 9. Threat model

This baseline materially reduces persistent Browser secret exposure:

- Refresh Token is not JavaScript-readable in the normal Browser flow.
- Access Token is not persisted in Browser Web Storage.
- Database still stores only the Refresh secret SHA-256 hash.

It does **not** claim that HttpOnly cookies eliminate XSS risk.

Malicious same-origin JavaScript may still:

- issue authenticated same-origin actions while the user session is live,
- observe an Access Token while it exists in application memory,
- manipulate application state.

CSP, dependency hygiene, renderer hardening, authorization and server revocation remain separate layers.

## 10. Validation

```bash
npm --prefix backend run build
npm --prefix apps/web run build
npm --prefix backend run test:browser-secret-storage-regression
npm --prefix backend run test:browser-secret-storage-live
npm --prefix backend run test:refresh-token-live
```

Verified Browser behavior:

- login/register Cookie mode omits `refresh_token` from JSON,
- Cookie has HttpOnly / SameSite=Strict / Path=/,
- Cookie-only refresh without Browser auth-mode header returns 401,
- Cookie-mode refresh rotates to a new secret under the same Session,
- PostgreSQL does not contain the plaintext Refresh secret,
- logout clears the Cookie and revokes the old Access Token,
- account deletion clears the Cookie and cascades Session rows,
- legacy body Refresh flow still passes its existing live smoke,
- static audit finds no Browser auth code writing Access/Refresh secrets back to Web Storage.

Current Web strict build: **245 modules**.
