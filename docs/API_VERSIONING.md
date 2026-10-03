# FlexiKit API Versioning Contract

> Status: S4.1 baseline
> Current canonical version: V1
> Backend URI prefix: `/v1`

## 1. Canonical routes

New FlexiKit clients must use URI versioning.

- Web through reverse proxy: `/api/v1/*`
- Desktop / direct Backend: `http://<backend>:3001/v1/*`
- Backend route itself: `/v1/*`

URI versioning is used so the API major version is explicit in logs, proxies, caches and support diagnostics.

## 2. Legacy compatibility alias

Existing unversioned Backend paths remain active during migration.

Nest defaults unspecified Controllers to both `VERSION_NEUTRAL` and V1. The same handler therefore serves the legacy path and the V1 path without duplicating business logic.

The unversioned route is a compatibility alias, not the canonical API for new code.

## 3. Client behavior

The shared Web/Desktop runtime now defaults to V1.

- Browser development: `/api/v1`
- Browser production default: `/api/v1`
- Desktop default: `http://127.0.0.1:3001/v1`
- Custom `VITE_API_URL`: append V1 unless the base already ends in `/v1`

`resolveApiUrl()` also upgrades direct API resource URLs such as favicon requests.

The existing proxy rule already maps `/api/v1/tools` to Backend `/v1/tools` by stripping only the outer `/api`.

## 4. Change policy

V1 only accepts backward-compatible contract evolution where practical, such as new endpoints, optional fields and optional parameters.

Breaking changes require a new major API version. Examples include removing/renaming consumed fields, incompatible type changes, making optional inputs required, removing endpoints, or changing authentication semantics old shipped clients cannot satisfy.

## 5. Introducing V2

V2 is not active today. `/v2/*` must return 404 until explicit V2 handlers exist.

When V2 is needed:

1. Keep the existing neutral/V1 handler unchanged.
2. Add a distinct handler explicitly versioned as V2.
3. Reuse Service logic below the Controller where behavior is common.
4. Add V1/V2 contract regression before release.
5. Migrate clients deliberately.

## 6. Removing the legacy alias

The unversioned compatibility alias cannot be removed merely because V1 exists.

Removal requires all supported clients/integrations to use versioned paths, deployment documentation to use V1, a deliberate deprecation release, and a documented rollback path. Deprecation headers or traffic telemetry may be added before removal.

No removal date is set in S4.1.

## 7. Cross-cutting contracts

V1 retains the existing:

- success envelope `{ code: 0, message: "success", data }`
- error envelope `statusCode / code / message / error / details?`
- `X-Request-Id` correlation
- structured request/error logging
- `@RawResponse()` binary/streaming escape hatch

Raw endpoints are versioned too; the canonical favicon Backend path is `/v1/tools/favicon`.

## 8. Validation

Required checks:

```bash
npm --prefix backend run build
npm --prefix backend run test:versioning-regression
npm --prefix backend run test:error-regression
npm --prefix backend run test:response-regression
npm --prefix backend run test:logging-regression
npm --prefix backend run test:type-audit
npm --prefix apps/web run build
```

Live compatibility smoke verifies legacy/V1 routes both work, V1 errors preserve their contract, `/v2` returns `404 / NOT_FOUND`, and V1 request-id/logging behavior remains intact.
