# Data Export & Delete

> Status: completed on 2026-09-26.
>
> This document defines the S4.3 server-account and current-device data lifecycle boundary.

## 1. Server data export

Authenticated users can request `GET /v1/users/export-data`.

The response uses an explicit versioned allowlist with `schemaVersion: 1` and includes:

- account profile fields,
- user-owned Tools,
- Favorites,
- Tool order,
- Categories,
- authentication Session metadata needed for account portability or inspection.

The normal export deliberately excludes:

- `password_hash`,
- Access / Refresh Token secrets,
- Refresh Token hashes,
- Tool embeddings and internal recommendation vectors,
- Desktop diagnostics,
- device-local Canvas / search / usage / recommendation behavior history.

The local encrypted backup remains a separate channel for device-local L0-L2 data and is documented in `LOCAL_DATA_BACKUP.md`.
Fine-grained recommendation behavior events are intentionally excluded from that encrypted backup and remain current-device only.

## 2. Server account deletion

`DELETE /v1/users/account` requires an authenticated request body:

```json
{ "confirmation": "DELETE" }
```

The DTO accepts only the exact `DELETE` confirmation text.

Deletion is executed in one TypeORM transaction:

1. lock the target User row with `pessimistic_write`,
2. identify user-owned private Tools,
3. decrement persisted `favorite_count` values for surviving Tools favorited by this account,
4. remove this user's Favorites,
5. remove cross-user Favorites that point to this user's private Tools,
6. remove Tool order and Categories,
7. remove user-owned Tools,
8. remove Refresh Sessions,
9. remove the User.

The Browser Refresh Cookie is cleared by the controller after a successful delete. Existing Session-bound Access Tokens fail with 401 after deletion.

## 3. Current-device local data deletion

`apps/web/src/utils/localDataLifecycle.ts` owns the explicit current-device user-data deletion allowlist.

The current baseline removes:

- custom Tool cache/order/favorites/category order,
- Desktop Canvas v1/v2 state, including Notes/Todo/Folder configuration,
- Global Search recents,
- Installed App usage,
- Tool usage,
- recommendation behavior events,
- Profile cache,
- trending/pet search cache.

It intentionally preserves device preferences and device identity:

- theme and layout,
- sidebar state,
- privacy preferences,
- local schema-version marker,
- client-instance UUID,
- Cookie-consent preference.

Authentication material is not owned by this helper. Account deletion first clears authentication through the User Store / secure-token lifecycle, then clears the local user-data allowlist.

## 4. Multi-window Canvas safety

Desktop Canvas may be open in a separate WebView while Data Management removes local Canvas state.

The Canvas Store listens for removal of its storage key from another window. When detected it:

- cancels pending persistence,
- suspends future persistence for that window,
- discards the old in-memory user content,
- falls back to the default in-memory widget layout.

This prevents an already-open Canvas window from writing deleted Notes or paths back into localStorage.

## 5. Device scope

Deleting an account clears server data and the user data on the device that performs the deletion.

FlexiKit cannot remotely erase localStorage or Canvas content that remains on another offline or separately running device. Those copies must be cleared on that device. This is an explicit device boundary, not a server-deletion failure.

Desktop diagnostics are also outside the account-data deletion scope. They remain bounded local diagnostic files and follow the separate diagnostics retention/redaction policy.

## 6. Validation

The completed baseline was verified with:

- Backend `npm run build`,
- Backend `test:data-lifecycle-regression`,
- real PostgreSQL / HTTP `test:data-lifecycle-live` on port 3021,
- Browser HttpOnly secret-storage live smoke,
- Web `test:data-lifecycle-regression`,
- Web privacy regression,
- Web local-backup regression,
- Web local-data-migration regression,
- Web strict `vue-tsc && vite build` with 250 transformed modules,
- syntax checks for all updated authentication live-smoke scripts.

The live lifecycle smoke verified:

- safe export fields,
- invalid delete confirmation returns 400,
- exact `DELETE` returns 200,
- User and Refresh Sessions are removed,
- an already-issued Access Token returns 401 after deletion.
