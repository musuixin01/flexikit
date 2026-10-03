# FlexiKit Recommendation Tag Matching

Status: S5.3 tag matching completed on 2026-09-27.

## Goal

Use the completed device-local behavior event ledger to reorder recommendation candidates by deterministic Tool tag/category affinity without introducing server behavior tracking or heat/popularity ranking.

## Inputs

The matcher uses:

- the current loaded FlexiKit Tool catalog,
- device-local recommendation behavior events,
- candidate Tool tags and category.

No behavior event is uploaded. When usagePersonalization is disabled, the behavior reader returns no events and candidate order stays unchanged.

## Event weights

- tool_open: +1
- favorite_add: +4
- favorite_remove: -4

Favorite add/remove therefore cancel when both exist for the same Tool features.

## Feature scoring

- normalized tags use event weight × 2,
- normalized category uses event weight × 1,
- each individual feature affinity is clamped to -24…24,
- duplicate tags on one Tool count once,
- empty, malformed and overlong features are ignored,
- category “未分类” is ignored.

Normalization uses Unicode NFKC, trimming, case folding and whitespace collapse.

## Ordering

Candidates sort by tag-match score descending.

Equal scores preserve the original candidate order. The matcher does not inspect:

- hot score,
- views/clicks,
- favorite_count,
- timestamps/recency decay,
- random values.

Those signals belong to later S5.3 tasks.

## Discover integration

Discover requests a bounded candidate pool of 18 from the existing recommendation endpoint, applies local tag matching, then displays the first 6.

If the endpoint is unavailable, the same deterministic matcher runs over the already loaded local Tool catalog. The old random fallback is removed.

The “热门排行” list is intentionally untouched; heat ranking is the next task.

## Validation

- Web npm run test:tag-matching-regression: PASS.
- Web npm run test:recommendation-behavior-regression: PASS.
- Web npm run build: PASS.

## Next execution item

S5.3 — heat ranking.
