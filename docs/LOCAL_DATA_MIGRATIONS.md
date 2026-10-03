# FlexiKit Local Data Migration

> Status: S4.3 baseline complete
> Scope: Browser Web + Windows Desktop localStorage-backed application data, local backup payloads, and legacy tool import files

## 1. Version domains

FlexiKit keeps separate version domains instead of using one number for unrelated formats.

### Device local-data schema

Marker:

```text
flexikit-local-data-schema-version
```

Current version: **1**.

The marker describes application-owned local data that requires coordinated migration before stores read it.

Schema `0` means historical data created before the central migration registry existed.

### Encrypted backup format

`LOCAL_BACKUP_VERSION` remains the outer encrypted-file format version.

The decrypted payload also contains:

- `schemaVersion` — backup payload structure version,
- `localDataSchemaVersion` — device-local data schema carried inside the backup.

These versions are intentionally independent.

### Tool export format

The Home workspace tool-only import/export format currently uses:

```text
version: "1.0"
```

Unversioned historical tool files are treated as legacy input and normalized to 1.0. Unknown future versions are rejected.

## 2. Startup migration order

`apps/web/src/main.ts` runs local-data migration before Vue, Pinia, Router, or stores are mounted.

Order:

1. read `flexikit-local-data-schema-version`,
2. reject malformed/future schema markers,
3. run every registered one-step migration in order,
4. write the new canonical values,
5. persist the current schema marker,
6. only then create and mount the application.

If migration fails, FlexiKit stops startup instead of allowing an older application to rewrite newer or malformed state.

## 3. Current migration: schema 0 -> 1

The first registered migration centralizes the historical Desktop Canvas conversion.

Historical input:

```text
flexikit-desktop-canvas-v1
```

The legacy value is a JSON widget array.

Canonical output:

```json
{
  "version": 2,
  "widgets": [],
  "monitors": []
}
```

stored under:

```text
flexikit-desktop-canvas-v2
```

Rules:

- a valid existing Canvas v2 value wins over stale v1 data,
- after successful migration the v1 key is removed,
- malformed v1 data is not silently discarded,
- malformed v2 data is not overwritten by v1 fallback,
- the Canvas store itself now consumes only the current v2 format.

This removes migration ownership from the feature store and puts it in one pre-mount migration boundary.

## 4. Idempotency and rollback

Every migration must be safe to evaluate exactly once per source version and must not rely on UI state.

The current writer snapshots every migration-owned key before mutation.

If a write/remove operation fails:

- migration reports failure,
- a best-effort rollback restores the previous values,
- the schema marker is not advanced as a success claim.

Running the migrator again on current schema v1 performs no migration steps.

## 5. Downgrade protection

If local data declares a schema newer than the running application supports, startup is blocked.

Example:

```text
stored schema: 2
application supports: 1
=> stop; do not modify user data
```

The user must run an application version that understands the newer schema.

This is deliberate. FlexiKit does not perform destructive "best effort" downgrades.

## 6. Backup restore migration

Backup restore reuses the pure `migrateLocalDataSnapshot()` pipeline.

Current backups write:

```json
{
  "schemaVersion": 1,
  "localDataSchemaVersion": 1
}
```

Compatibility behavior:

- old V1 backups created before `localDataSchemaVersion` existed are interpreted as local schema 0,
- schema 0 backup content is migrated to the current local schema before any restore write,
- future unsupported local schemas are rejected,
- migrated values are revalidated against the backup allowlist before restore.

This means application upgrade and backup restore share one migration rule instead of maintaining parallel conversion code.

## 7. Tool import migration

`migrateToolExportData()` owns the Home tool-file compatibility boundary.

Accepted inputs:

- historical unversioned tool export -> normalized to 1.0,
- explicit version 1.0 -> validated and normalized.

Rejected inputs:

- future/unknown version such as 2.0,
- invalid custom tool entries,
- invalid root structures.

Canonical theme values are limited to `auto`, `light`, and `dark`.

## 8. Rules for future migrations

When adding local schema version N+1:

1. never rewrite or repurpose an old migration step,
2. add exactly one explicit `N -> N+1` migration,
3. keep the transform deterministic and independent of live UI state,
4. validate source assumptions before deleting legacy keys,
5. ensure partial writes can be rolled back or safely retried,
6. add regression fixtures for the old format,
7. test idempotency at the new current version,
8. test future-version rejection,
9. update backup migration coverage when affected data is in the backup allowlist,
10. update this document and MASTER_PLAN evidence.

Unknown versions must be rejected rather than guessed.

## 9. Validation

```bash
npm --prefix apps/web run test:local-data-migration-regression
npm --prefix apps/web run test:local-backup-regression
npm --prefix apps/web run build
```

Current regression coverage verifies:

- local schema 0 -> 1 conversion,
- idempotent current-schema startup,
- valid Canvas v2 precedence,
- future schema downgrade protection,
- malformed legacy data preservation,
- write-failure rollback,
- pure snapshot migration for backup restore,
- legacy unversioned tool export -> 1.0,
- future tool export version rejection,
- old V1 backup local schema migration.

Current Web strict production build: **247 transformed modules**.
