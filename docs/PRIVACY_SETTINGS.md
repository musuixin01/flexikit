# FlexiKit Privacy Settings

> Status: S4.3 baseline complete
> Scope: Browser Web + Windows Desktop device-local privacy controls

## 1. Goal

FlexiKit exposes privacy controls for device-local data that is created automatically as a side effect of using the product.

The controls are intentionally different from:

- user-authored Canvas content such as Notes/Todos/folder configuration,
- authentication credentials and Session state,
- server-side account data,
- complete export/delete lifecycle actions.

The implementation source of truth is `apps/web/src/privacy/privacyPreferences.ts`.

## 2. Storage and scope

Privacy settings are stored locally under:

```text
flexikit-privacy-preferences-v1
```

Current schema:

```json
{
  "version": 1,
  "rememberSearchRecents": true,
  "usagePersonalization": true,
  "cacheProfileLocally": true
}
```

The preferences are device scoped.

They are not:

- uploaded to the Backend,
- associated with a server account,
- copied through the encrypted local backup,
- authentication or authorization inputs.

Defaults are `true` to preserve the behavior of existing installations. A user can disable each category at any time.

## 3. Search recents

`rememberSearchRecents` controls automatic persistence of system search results opened from Desktop Global Search.

Managed key:

```text
flexikit-global-search-recents-v1
```

When enabled:

- opened applications/files/folders may appear in "最近使用",
- path/name/detail/last-opened metadata is retained locally.

When disabled:

- the existing key is deleted immediately,
- future reads return no search-recents history,
- future opens do not write new search-recents history.

## 4. Usage personalization

`usagePersonalization` controls local Tool/App activity history used for ranking and recommendations.

Managed keys:

```text
flexikit-tool-usage-v1
flexikit-installed-app-usage-v1
flexikit-recommendation-behavior-v1
```

When enabled:

- open count and last-opened time may be stored locally,
- ranking can use this history,
- installed-app recommendation boosts may use search recents when search-recents retention is also enabled.
- local Tool recommendation behavior may store only tool_open / favorite_add / favorite_remove with numeric toolId and timestamp,
- the behavior ledger is capped at 400 events and reads/writes discard events older than 90 days,
- the behavior ledger is current-device only: it is not uploaded and is excluded from encrypted local backup.

When disabled:

- Tool/App usage-history keys and the recommendation behavior-event key are deleted immediately,
- Tool/App usage readers return empty history,
- future Tool/App opens do not write usage history,
- recommendation logic does not consume those histories.

## 5. Local profile cache

`cacheProfileLocally` controls the convenience copy stored under:

```text
flexikit-profiles
```

The cache can include:

- email,
- display name,
- avatar,
- avatar type,
- account creation timestamp.

It never contains the account password.

When disabled:

- the existing profile cache is deleted immediately,
- User Store initialization does not hydrate the cache,
- later profile/login/update flows do not persist a new cache.

The server profile remains authoritative and is unaffected by this switch.

## 6. Clear recorded activity

Data Management provides a separate "清除已记录活动" action.

It removes:

- Global Search recents,
- Tool usage history,
- Installed App usage history.
- recommendation behavior events.

It does not:

- change the three privacy preference values,
- remove profile cache,
- delete Canvas content,
- touch Access/Refresh credentials,
- delete server data.

This lets a user clear activity history without disabling future local personalization.

## 7. Canvas and other user-authored local content

Canvas Notes, Todos, folder paths, weather configuration and layout are not treated as passive tracking.

They are user-authored or user-configured application state.

Therefore the Privacy Settings page does not provide a misleading "tracking" toggle that would silently discard them.

Their complete export/delete/reset semantics belong to the following S4.3 "数据导出 / 删除" lifecycle task.

## 8. Cookie notice

Browser Cookie messaging was aligned with the actual implementation.

Current browser behavior:

- Refresh Session uses a necessary HttpOnly Cookie,
- Browser Access Token stays in runtime memory,
- theme/layout/privacy preferences use localStorage rather than functional Cookies,
- no analytics Cookie is currently enabled.

The Cookie notice no longer exposes "functional" or "analytics" toggles that did not control real behavior.

If a future release introduces non-essential Cookies or third-party analytics, the notice and privacy policy must be updated before those features are enabled.

## 9. Backup boundary

`flexikit-privacy-preferences-v1` is intentionally excluded from encrypted local backup.

Reason:

A restored backup must not silently change privacy choices on the target device.

The data controlled by the preferences may still be present in a backup only when it is part of the existing explicit L0-L2 backup allowlist and existed when the backup was created. On restore, runtime reads continue to obey the target device's privacy preferences.

## 10. Validation

```bash
npm --prefix apps/web run test:privacy-settings-regression
npm --prefix apps/web run test:local-backup-regression
npm --prefix apps/web run build
```

Verified behavior:

- defaults preserve existing behavior,
- disabling each preference purges its corresponding L1/L2 local data,
- disabled call sites stop reading/writing that history,
- activity-only clear does not remove profile cache,
- privacy settings do not touch authentication material,
- privacy preferences are excluded from local backup,
- Cookie notice matches necessary-only Cookie behavior,
- Web strict production build passes with 249 transformed modules.
