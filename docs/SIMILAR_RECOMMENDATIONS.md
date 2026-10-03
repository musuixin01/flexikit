# FlexiKit Similar Tool Recommendations

Status: S5.3 similar Tool recommendations completed on 2026-09-30.

## Goal

Use the existing public Tool embedding and pgvector foundations to produce useful semantic recommendations without exposing embeddings, private Tool data, or device-local behavior to the Backend.

## Server recommendation flow

The authenticated /recommendations endpoint keeps its Tool[] response contract.

For an authenticated user:

1. Read the user's current favorite Tool ids.
2. Select at most three most-recent favorite seeds whose Tool is public.
3. For each seed, call ToolVectorSearchService.searchPublicToolsSimilarToTool.
4. Merge candidates by their best PostgreSQL cosine similarity.
5. De-duplicate candidates and exclude every currently favorited Tool.
6. Order deterministically by similarity, seed rank, candidate rank, then Tool id.
7. If semantic results are unavailable or fewer than requested, fill the remainder with public popular Tools while still excluding favorites and already selected Tools.

Anonymous users and authenticated users without favorites keep the public popular fallback.

## Vector safety boundary

- Similarity is calculated in PostgreSQL with pgvector cosine distance.
- Source seeds and candidates must both be public Tools.
- Source and candidate embeddings must match the current provider, model, dimensions and source version.
- Source hash and embedding update timestamp must be present.
- Stale embeddings are excluded when embedding_updated_at is older than Tool updated_at.
- The source Tool excludes itself.
- Candidate vectors and embedding provenance remain select:false and are never returned through the recommendation API.
- No application-memory cosine calculation or ANN index was added.

## Limits and deterministic behavior

- Recommendation limit: 1..20.
- Semantic seed count: at most 3.
- pgvector candidate pool: bounded by the existing vector search maximum.
- SQL exclusion ids: at most 100; the application layer still filters the full favorite-id set so large favorite collections cannot leak back into results.
- Per-seed vector failures fail soft to the remaining semantic seeds and public popular fallback.
- Ordering has deterministic tie-breaks; no random recommendation fallback is introduced.

## Discover integration

The existing Discover intelligent-recommendation section now consumes the semantic recommendation endpoint when:

- the user is logged in, and
- source filter is All.

Anonymous users and source-filtered views continue using the existing Discovery recommendation endpoint so source-filter semantics are preserved.

After server semantic candidates arrive, the existing device-local tag matcher may deterministically rerank those candidates before six cards are shown. Device-local behavior events never leave the client and are not sent to the recommendation endpoint.

## Heat-ranking compatibility

During integration validation, the existing Discover file was found to have drifted back to fabricated numeric fallback heat. The completed S5.3 heat baseline was restored:

- real server heat is displayed through one formatter,
- API failure switches to an explicitly labeled local placeholder order,
- local fallback is deterministic by Tool name,
- no numeric heat is fabricated.

## Validation

- Backend build: PASS.
- Web build: PASS.
- S5.3 similar Tool recommendations regression: PASS.
- S5.3 pgvector compatibility regression: PASS.
- Backend type audit: PASS with explicit_any=0, untyped_request=0, untyped_whole_query=0.
- Web similar-recommendations integration regression: PASS.
- Web tag-matching compatibility regression: PASS.
- Web discovery-heat compatibility regression: PASS.

The current Runner cannot connect to the local PostgreSQL endpoint. This task therefore makes no new live-database claim and does not repeat the already documented blocked database check.

## Next task

S5.3 — recommendation explanation. Explanations must be derived from safe recommendation metadata/signals and must not expose raw embeddings, cosine internals, private Tool data, or device-local event history.
