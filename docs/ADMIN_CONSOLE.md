# FlexiKit Admin Console

## 1. Scope

The current Admin Console is a lightweight management surface for the present FlexiKit product stage. It is not a general-purpose cloud administration platform.

Admin Console V1 contains three areas:

- Overview: measured platform account, role/status, tool, favorite, active-session counts and recent admin audit events.
- Users: account/session metadata lookup plus permission-controlled status and role actions.
- AI Usage & Cost: Provider-reported Token usage, versioned request-cost estimates, platform/BYOK split and Provider/model breakdown.

The Admin Console does not currently provide customer-support workflows, complex risk control, finance operations, organization management or a data warehouse.

## 2. Access control

Admin access is always enforced by the Backend and is never granted by frontend state.

Persistent authorization is stored on users.role and account availability is stored on users.status:

- role=user: normal account, no Admin access.
- role=admin: persistent administrator.
- status=active: account can authenticate and use authorized APIs.
- status=suspended: Login, Refresh, JWT-protected APIs and Admin access fail closed.

ADMIN_USER_IDS remains a server-side bootstrap/recovery allowlist. It does not replace the persistent admin role. An active user listed there receives bootstrap-admin access and may grant or revoke persistent admin roles.

Current permission boundaries:

- persistent-admin can read Overview, Users, Audit and AI Usage and can suspend/restore or delete normal users.
- bootstrap-admin receives the same permissions plus administrator role assignment.
- a persistent admin cannot change another administrator's account status.
- an administrator cannot suspend their own account.
- an administrator cannot demote their own persistent admin role.
- an administrator cannot delete their own account from Admin.
- an account with role=admin cannot be deleted until its admin role is revoked first.
- permanent Admin deletion requires the exact current username as request confirmation.
- the service prevents removing or suspending the last active persistent administrator.
- suspending an account revokes all unrevoked Refresh Sessions in the same transaction.
- every Admin request resolves current user role/status from PostgreSQL; stale frontend state cannot retain access.

## 3. Backend surface

All current Admin endpoints require JwtAuthGuard and AdminAccessGuard.

- GET /v1/admin/access
- GET /v1/admin/overview
- GET /v1/admin/users
- GET /v1/admin/users/:id
- GET /v1/admin/audit-events
- PATCH /v1/admin/users/:id/status
- PATCH /v1/admin/users/:id/role
- DELETE /v1/admin/users/:id
- GET /v1/admin/ai-usage

There are no general Admin POST or PUT operations. Privileged writes are limited to user status/role PATCH operations and guarded user DELETE.

Admin user deletion reuses the same transaction-level cleanup routine as self-service account deletion. It revokes and removes Refresh Sessions, removes the user's favorites/orders/categories/tools, removes favorites pointing to the user's tools, updates affected external tool favorite counts, deletes the user row, and appends user.account.deleted audit metadata in the same transaction.

## 4. Visible user data

The Users area may expose only the metadata required for account operations:

- user ID
- username
- display name
- email
- role
- account status
- account creation time
- tool count
- favorite count
- session count
- active-session count
- recent client type / client name
- session created / last-used / expiry time
- session status

The Admin API intentionally does not expose:

- password hashes
- Access Tokens or Refresh Tokens
- Refresh Token hashes
- BYOK API Keys
- AI Prompt or response bodies
- clipboard contents
- local file contents
- local application data

## 5. Admin audit

Privileged writes append an admin_audit_events row in the same database transaction as the business change.

Each event stores only operational metadata:

- actor user ID / username
- access mode (persistent-admin or bootstrap-admin)
- action
- target user ID / username
- safe before/after metadata
- creation time

The Admin API exposes audit events as read-only. It does not expose update/delete endpoints for audit rows. This is an application-level append-only boundary, not regulatory WORM storage.

## 6. AI Usage & Cost

AI usage accounting is active. Token counts come only from Provider response metadata:

- OpenAI Responses usage.
- Gemini generateContent usageMetadata.
- Anthropic Messages usage.

The normalized usage contract records input/output/total, cached input, cache-write input and reasoning tokens where the Provider exposes them. It never estimates Token counts from Prompt text.

Each successful measured call is persisted to ai_usage_events with Provider/model, billing mode, Token counters, pricing catalog version/source/effective window, cost scope and estimated pico-USD cost. Prompt/response bodies and API Keys are not stored in usage events.

Cost behavior:

- Known built-in models use the versioned official-price catalog 2026-09-27.
- Cost arithmetic uses integer pico-USD rather than JavaScript floating point.
- OpenAI long-context pricing is selected from measured input Token count.
- Gemini 3.8 Flash promotional pricing has an explicit validity end; after expiry the model becomes unpriced until the catalog is refreshed.
- Anthropic cache-write cost is priced only when 5-minute / 1-hour cache-write classification is available; otherwise the request stays unpriced.
- Unknown/custom models keep their measured usage but use costStatus=unpriced.
- Platform Key and BYOK are stored separately. BYOK cost is a user-owned estimate and is not counted as platform estimated cost.
- costScope=token-request-only: Provider tool/search/cache-storage or other non-Token fees are outside this estimate.
- The estimate is operational FinOps data, not a substitute for the Provider's final invoice.

## 7. Current limitations

- The persistent permission model intentionally has only user and admin; it is not an organization-scale RBAC system.
- Role-write permission remains limited to ADMIN_USER_IDS bootstrap/recovery administrators.
- There is no JIT privilege elevation, dual approval, department/organization hierarchy or resource-level policy engine.
- Admin audit is PostgreSQL application data, not independently archived/WORM compliance storage.
- There is no subscription, Credits, revenue or margin dataset yet.
- Pricing is a versioned code catalog and must be refreshed when Provider pricing changes; stale/unknown pricing fails closed to unpriced rather than guessing.
- Usage events cover successful AiService calls that return Provider usage. Retry/fallback failures do not create ledger rows; only the final successful routed response is recorded once, so transient retries do not inflate Token/cost totals.
- No sensitive-content inspection workflow exists.

## 8. Migration and validation baseline

Migration AddAdminConsoleV11790434800000 adds:

- users.role with user default and database CHECK constraint.
- users.status with active default and database CHECK constraint.
- role/status indexes.
- admin_audit_events plus actor/target/time indexes.

The migration was executed successfully against the local development PostgreSQL database. Existing accounts retained their data and defaulted safely to user / active.

AI usage accounting adds three additive migrations:

- AddAiUsageAccounting1790521200000: ai_usage_events core measured usage/cost ledger and indexes.
- ExtendAiUsageAccountingAuditFields1790523000000: cache-write 5m/1h classification, pricing effective/valid dates and cost-scope audit fields.
- AddAiUsageUserForeignKey1790524800000: user_id references users with ON DELETE SET NULL, preserving aggregate FinOps history without retaining a deleted account association.

All three migrations are applied locally. A real PostgreSQL transaction test inserted platform + BYOK usage, verified priced/unpriced aggregation, then rolled back without leaving fixture rows. PostgreSQL constraint metadata also verifies the usage user link uses ON DELETE SET NULL.

Admin Console V1 is guarded by:

- Backend build.
- test:admin-foundation-regression.
- Backend type audit.
- Web strict build.
- test:admin-console-regression.
- test:ai-usage-regression.
- OpenAI/Gemini/Anthropic Provider usage regressions.
- Access/Refresh/Multi-client/Logout lifecycle regressions.
- live S2 authorization regression.
- migration:show and read-only schema verification.

The regressions verify persistent/bootstrap authorization, suspended-account fail-closed behavior, session revocation, role/status write boundaries, delete self/admin/username-confirmation guards, transactional account cleanup, audit insertion, safe user/session metadata, server-confirmed Sidebar visibility and the explicit no-fake-data AI Usage state.
