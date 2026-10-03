# FlexiKit Desktop Token Secure Storage

> Status: S4.2 baseline
> Platform baseline: Windows Desktop
> Protection goal: authentication-token protection at rest

## 1. Architecture

FlexiKit Desktop does not persist Access or Refresh Tokens in WebView localStorage/sessionStorage.

On Windows, the Desktop shell owns two fixed secure-token slots:

- `access`
- `refresh`

The Web layer accesses them only through Tauri IPC:

- `store_secure_auth_token`
- `load_secure_auth_token`
- `clear_secure_auth_token`

The native implementation lives in `auth_vault_windows.rs`.

Arbitrary slot/file names are rejected. The renderer cannot choose an arbitrary filesystem path through this API.

## 2. Windows protection

Each token record is protected with Windows DPAPI `CryptProtectData` under the current Windows user.

The encrypted files live below Tauri's application-local data directory:

```text
<app_local_data_dir>/auth-vault/access.dpapi
<app_local_data_dir>/auth-vault/refresh.dpapi
```

The plaintext record contains only:

```text
v1
<expires_at>
<token>
```

That record is encrypted as one DPAPI payload before it reaches disk.

The implementation uses `CRYPTPROTECT_UI_FORBIDDEN`, so background token persistence never displays an unexpected Windows credentials prompt.

DPAPI-owned output buffers are copied and released with `LocalFree`.

## 3. File-write safety

Vault writes use:

1. a fixed temporary file beside the final slot,
2. `write_all`,
3. `sync_all`,
4. `MoveFileExW(MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)`.

A failed replacement removes the temporary file and leaves an error instead of reporting success.

Input limits are defensive:

- token: non-empty, no CR/LF, maximum 32 KiB,
- expiry metadata: non-empty, no CR/LF, maximum 128 bytes,
- encrypted file accepted on read: maximum 64 KiB.

## 4. Renderer storage behavior

The same TypeScript auth storage API is used by Web and Desktop, but the backing store differs by runtime.

Browser:

- Access Token: runtime memory only,
- Refresh Token: HttpOnly Cookie owned by the Browser,
- localStorage contains only non-secret Refresh Session expiry metadata.

Desktop:

- Access Token: DPAPI vault,
- Refresh Token: DPAPI vault,
- runtime memory cache only after native load,
- no normal Token persistence in Web Storage.

All auth storage functions are asynchronous so Desktop IPC writes complete before login/register/refresh state is considered persisted.

Axios, Pinia initialization, Access expiry timers and logout all await this storage layer.

## 5. Legacy Desktop migration

Older Desktop builds may already have authentication material in the WebView storage created by the shared Web implementation.

On the first Desktop hydrate:

1. try the native DPAPI slot,
2. if no native Access record exists, inspect the old Access Token + expiry metadata; old JWT `exp` may be used only to recover the expiry timestamp,
3. if no native Refresh record exists, inspect the old Refresh Token only when its explicit expiry metadata is also present,
4. store valid legacy material into the native DPAPI vault,
5. remove the legacy Web Storage Token and expiry entries.

On every later Desktop persist/clear operation, the legacy Web Storage entries are also deleted defensively.

The JWT payload decoded during migration is not trusted for authorization. Server validation remains authoritative.

## 6. Session semantics

Access Token rotation is not treated as a user-session identity change.

The tools store previously compared raw localStorage Access Tokens to discard stale asynchronous results. That logic now captures:

- whether the request started logged in,
- the authenticated user id.

A logout or account switch still invalidates stale results, while a normal Access Token refresh no longer does.

## 7. Threat model and limitations

DPAPI Current User protects authentication material **at rest**. In particular, the vault files do not contain plaintext Tokens and cannot normally be decrypted under another Windows user context.

This baseline does not claim to protect Tokens from:

- arbitrary code already running as the same compromised Windows user,
- malicious code already executing inside the trusted FlexiKit WebView,
- memory inspection of the running application,
- server/API compromise.

The Tauri load command necessarily returns the Token to the trusted renderer when an authenticated request or refresh needs it. Therefore XSS/CSP hardening and server-side revocation remain separate defense layers.

macOS Keychain / Linux Secret Service equivalents are not implemented because the current Desktop product baseline is Windows. They are required before claiming equivalent secure storage on those platforms.

## 8. Failure behavior

If a stored DPAPI record cannot be decrypted or parsed, the Web auth adapter treats it as unusable and attempts to clear that slot instead of falling back to an unauthenticated plaintext copy.

If secure persistence fails during login/register, the client clears both token slots and reports the operation as failed rather than keeping only half of an auth pair.

Refresh rotation persists the new Access + Refresh pair together at the client coordination layer with `Promise.all`; a persistence failure does not silently report a durable session.

## 9. Validation baseline

Native validation:

```text
cargo fmt -- --check
cargo check --all-targets
cargo test --all-targets
cargo build
```

Current result: **17 passed, 0 failed**.

The native tests include a real Windows DPAPI file round trip that:

- writes a temporary Access Token vault,
- verifies the ciphertext file does not contain the plaintext Token bytes,
- decrypts and checks Token/expiry equality,
- clears the slot,
- verifies a subsequent load returns no record.

Frontend validation:

```text
npm --prefix apps/web run build
npm --prefix backend run test:access-token-regression
npm --prefix backend run test:refresh-token-regression
```

Current Web strict build: **245 modules**.

A bounded Desktop executable smoke also reached `setup_complete`; the test PID was verified stopped after the smoke.

Static audit confirms Browser auth code has no Access/Refresh Secret Web Storage write path; Desktop remains on the same DPAPI storage boundary. Browser details are in `docs/BROWSER_AUTH_STORAGE.md`.
