# FlexiKit Recommendation Behavior Events

Status: S5.3 user-behavior event foundation completed on 2026-09-27.

## Goal

Provide one privacy-minimized, device-local event source for later recommendation work without creating a server analytics pipeline or silently expanding the existing privacy consent.

## Consent and scope

Behavior events reuse the existing usagePersonalization preference.

- The preference remains device scoped.
- Events are never uploaded to the Backend.
- Events are not associated with the server account.
- Events are excluded from encrypted local backup.
- Disabling usagePersonalization immediately removes existing events and blocks future recording.

No second consent switch is introduced because this event stream has the same local-personalization purpose and the Data Management copy now explicitly describes it.

## Event taxonomy

Only three event types exist in this baseline:

- tool_open
- favorite_add
- favorite_remove

Each event stores only:

- positive numeric toolId,
- event type,
- occurredAt timestamp.

The event payload does not contain search queries, Tool names, URLs, local paths, Prompt/response text, AI context, file/Clipboard content, API Keys, account profile fields or arbitrary metadata.

## Retention

Storage key:

flexikit-recommendation-behavior-v1

The ledger is bounded to 400 events. Reads and writes discard entries older than 90 days. This is lazy retention enforcement rather than a background timer.

## Producers

- successful FlexiKit Tool opens feed tool_open through the existing Tool usage path,
- explicit favorite additions feed favorite_add,
- explicit favorite removals feed favorite_remove.

Installed application opens are intentionally not included in this Tool recommendation event taxonomy because S5.3 currently targets Tool recommendations.

## Lifecycle

The event key is removed by:

- disabling usagePersonalization,
- Data Management “clear recorded activity”,
- full current-device local user-data deletion.

The key is deliberately excluded from encrypted local backup so fine-grained interaction chronology does not migrate between devices.

Server data export/delete does not include this local event stream because it is never uploaded. Account deletion on the current device still clears it through the local-data lifecycle.

## What this task does not implement

This event foundation does not yet implement:

- tag matching (implemented in the next S5.3 step; see RECOMMENDATION_TAG_MATCHING.md),
- recommendation scoring/ranking,
- popularity ranking,
- embeddings,
- pgvector,
- similar-Tool search,
- recommendation explanations,
- server event analytics or cross-device personalization.

## Validation

- Web npm run test:recommendation-behavior-regression: PASS.
- Web npm run test:privacy-settings-regression: PASS.
- Web npm run test:data-lifecycle-regression: PASS.
- Web npm run test:local-backup-regression: PASS.
- Web npm run build: PASS.

## Next execution item

S5.3 — heat ranking.
