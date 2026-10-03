# FlexiKit Local Data Backup

> Status: S4.3 baseline complete
> Scope: Browser Web + Windows Desktop device-local backup and restore

## 1. Goal

FlexiKit provides a manual, portable backup for device-local L0-L2 data that can be restored on another compatible FlexiKit installation without copying authentication credentials.

The backup feature is intentionally separate from:

- server-side personal-data export,
- PostgreSQL operational/disaster-recovery backups,
- Windows DPAPI token vault files,
- diagnostics/log collection.

The user-facing entry point is the Data Management page.

## 2. Security model

Local backups contain potentially sensitive local content such as:

- Canvas Notes / Todos,
- remembered folder paths,
- global-search recents,
- installed-app/tool usage history,
- local custom-tool cache.

Therefore backup files are encrypted before download.

Current envelope:

- payload cipher: AES-GCM 256-bit,
- password KDF: PBKDF2-HMAC-SHA-256,
- iterations: 250,000,
- random salt: 16 bytes,
- random IV: 12 bytes,
- AES-GCM tag: 128 bits.

The user's backup password is used only in memory for encryption/decryption and is never uploaded or persisted by FlexiKit.

AES-GCM additional authenticated data binds the ciphertext to:

- FlexiKit backup format id,
- backup version,
- creation timestamp,
- encryption/KDF identifiers,
- KDF iteration count.

Wrong passwords or modified ciphertext fail authentication.

## 3. Backup format

Outer JSON envelope:

```json
{
  "format": "flexikit-local-backup",
  "version": 1,
  "createdAt": "2026-09-25T00:00:00.000Z",
  "encryption": {
    "algorithm": "AES-GCM-256",
    "kdf": "PBKDF2-SHA-256",
    "iterations": 250000,
    "salt": "<base64>",
    "iv": "<base64>"
  },
  "ciphertext": "<base64>"
}
```

The decrypted V1 payload contains:

```json
{
  "schemaVersion": 1,
  "localDataSchemaVersion": 1,
  "createdAt": "2026-09-25T00:00:00.000Z",
  "runtime": "desktop",
  "account": {
    "id": 123,
    "username": "example"
  },
  "storage": {
    "flexikit-desktop-canvas-v2": "...serialized localStorage value..."
  }
}
```

The outer envelope version, payload `schemaVersion`, and `localDataSchemaVersion` are independent. Backup V1 keeps its file/payload contract while local storage can evolve through `docs/LOCAL_DATA_MIGRATIONS.md`. Historical V1 backups created before `localDataSchemaVersion` existed are treated as local schema 0 and migrated through the same registered pipeline before restore. Unsupported future versions are rejected rather than guessed.

## 4. Explicit allowlist

Only these localStorage keys can enter or be restored from a V1 backup:

```text
gtb-theme
flexikit-layout
flexikit-theme-settings
flexikit-sidebar-collapsed
gtb-custom
gtb-order
gtb-favorites
gtb-cat-order
flexikit-desktop-canvas-v1  # legacy migration input only
flexikit-desktop-canvas-v2
flexikit-global-search-recents-v1
flexikit-installed-app-usage-v1
flexikit-tool-usage-v1
```

The implementation validates:

- known keys only,
- expected JSON container shape for structured keys,
- theme/sidebar scalar values,
- per-item size limits,
- total backup size limits.

This is an allowlist, not "copy all localStorage".

## 5. Explicit exclusions

The normal backup path does not include:

- Browser Access Token,
- Browser Refresh Token / HttpOnly Refresh Cookie,
- Browser Refresh Session expiry marker,
- Desktop DPAPI Access/Refresh vault,
- legacy Web Storage token keys,
- `flexikit-auth-client-instance-id-v1`,
- `flexikit-profiles`,
- `flexikit-cookie-consent`,
- `flexikit-privacy-preferences-v1`,
- `flexikit-pet-search`,
- trending/cache-only values,
- Desktop diagnostics logs.

Reasons:

- L3 credentials must never be in ordinary data backups.
- Client-instance identity must not be cloned to another installation.
- Browser session metadata is not user data needed for restore.
- Cookie consent is device/browser-context specific and is intentionally not transferred.
- Privacy preferences are target-device policy and must not be changed implicitly by restoring a backup.
- Profile data is server-authoritative and can be rehydrated after login.
- diagnostics and transient caches are not part of user-created state recovery.

User-authored content may itself contain sensitive text or paths. Encryption protects the downloaded backup at rest, but users should still keep the backup file and password separately.

## 6. Account binding

Creating a Data Management backup requires an authenticated account.

The encrypted payload stores the current user id and username.

Restore behavior:

- same account id: allowed,
- different logged-in account id: rejected,
- account-bound backup while logged out: rejected,
- username changes do not invalidate a backup when the stable user id still matches.

This prevents accidental restoration of one account's local activity/content into another signed-in account.

## 7. Restore semantics

Restore is a full snapshot for the allowlisted keys.

Before mutation:

1. decrypt and authenticate AES-GCM,
2. validate envelope and payload versions,
3. migrate the payload local-data schema to the current registered schema,
4. validate every storage key/value,
5. validate account compatibility.

During mutation:

- keys present in the snapshot are written,
- allowlisted keys absent from the snapshot are removed,
- authentication/session keys outside the allowlist are untouched.

The implementation snapshots prior values before writing. If a localStorage write fails, it performs a best-effort rollback and reports failure instead of claiming success.

After a successful restore the UI reloads the page so Pinia/Canvas/search state rehydrates from the restored snapshot.

## 8. Server data export is not local backup

The existing `GET /users/export-data` flow remains a separate server-data export.

It includes server-side account/business records such as:

- profile,
- custom tools,
- favorites,
- tool ordering,
- categories.

The Data Management UI now labels that function "导出服务器数据" rather than implying that it includes device-local state.

Conversely, the encrypted local backup does not mutate or restore PostgreSQL data.

Operational PostgreSQL backup/restore belongs to deployment/infrastructure policy and is outside this client-local S4.3 baseline.

## 9. Legacy Home import/export

The Home workspace retains its existing tool-only import/export feature for compatibility.

Its download name is now:

```text
flexikit_tools_export_*.json
```

instead of `flexikit_backup_*`.

This prevents a partial tool export from being mistaken for the complete local backup format.

## 10. Limits and non-goals

Current baseline is:

- manual backup only,
- user-selected local file download/upload,
- no implicit cloud sync,
- no automatic scheduled backup,
- no server-side storage of backup passwords,
- no attempt to export/import DPAPI vault files,
- no cross-account restore,
- no implicit format guessing; future backup/local-data versions require explicit registered migration paths.

Automatic/cloud backup can be designed later only with an explicit privacy, encryption-key and retention model.

## 11. Validation

```bash
npm --prefix apps/web run test:local-backup-regression
npm --prefix apps/web run test:local-data-migration-regression
npm --prefix apps/web run build
```

Verified behavior:

- encrypted round trip succeeds,
- plaintext L2 test data is not visible in the downloaded envelope,
- wrong password fails AES-GCM authentication,
- account mismatch blocks restore,
- restore replaces only allowlisted snapshot state,
- auth material outside the allowlist remains untouched,
- Access/Refresh/client-instance/consent keys are statically excluded,
- legacy V1 backups without `localDataSchemaVersion` migrate through local schema 0 -> 1 before restore,
- Web strict production build passes with 247 transformed modules.
