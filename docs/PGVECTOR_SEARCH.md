# FlexiKit pgvector Search Baseline

Status: S5.3 pgvector retrieval baseline completed on 2026-09-28.

## Scope

This task adds the database-side vector retrieval primitive only.

It deliberately does not implement recommendation blending, user-facing recommendation reasons, semantic free-text search, or behavior-vector fusion. Those belong to the following S5.3 tasks.

## Storage contract

The existing PostgreSQL schema already provides:

- pgvector extension through CREATE EXTENSION IF NOT EXISTS "vector".
- tools.embedding vector(1536).
- embedding Provider/model/dimensions/source-version/source-hash/updated-at provenance from the completed Embedding Pipeline.

Tool embeddings and provenance remain select:false in normal Tool entity queries.

## Retrieval primitive

ToolVectorSearchService.searchPublicTools accepts:

- one validated 1536-dimensional query vector.
- optional result limit, default 12 and hard-capped at 50.
- optional excluded Tool ids, hard-capped at 100 ids.

The query uses PostgreSQL pgvector cosine distance:

    tool.embedding <=> CAST(:queryVector AS vector)

Distance is ordered ascending in PostgreSQL. Cosine similarity is also calculated in PostgreSQL as:

    1 - (tool.embedding <=> CAST(:queryVector AS vector))

There is no JavaScript/TypeScript dot product, norm, cosine loop, or candidate-vector materialization.

## Eligibility filters

A candidate is eligible only when all of the following are true:

- user_id IS NULL.
- embedding IS NOT NULL.
- embedding_provider equals the current Embedding Pipeline provider.
- embedding_model equals the current model.
- embedding_dimensions equals 1536.
- embedding_source_version equals the current source version.
- embedding_source_hash IS NOT NULL.
- embedding_updated_at IS NOT NULL.
- embedding_updated_at >= updated_at.

The timestamp check prevents a Tool changed after its last vector refresh from participating until the explicit embedding sync refreshes it.

User-created/private Tools are never candidates in this retrieval primitive.

## Parameter and output safety

- Query vectors must contain exactly 1536 finite components.
- Extreme components outside the accepted safety bound are rejected before SQL construction.
- The vector is serialized only after numeric validation and passed as a named query parameter.
- Excluded ids are positive safe integers and use a parameterized list.
- Limit is bounded before it reaches QueryBuilder.
- A deterministic Tool id tie-break follows cosine distance ordering.
- Raw distance/similarity values are checked for finite numeric conversion before returning.

## Index strategy

The current baseline intentionally uses exact pgvector search and adds no HNSW or IVFFlat index.

Reason:

- the current Runner cannot connect to the local PostgreSQL endpoint, so no trustworthy EXPLAIN / EXPLAIN ANALYZE evidence is available;
- the current public Tool corpus is not yet established as large enough to justify approximate-nearest-neighbor maintenance cost;
- HNSW would introduce approximate recall behavior and additional write/storage cost before the product has a measured latency problem.

When a database-connected environment shows exact-search latency is no longer acceptable, the first index candidate should be an HNSW cosine index using vector_cosine_ops. The decision must be backed by representative corpus size and EXPLAIN ANALYZE / latency evidence rather than added preemptively.

The exact query contract is compatible with a later HNSW index; upper layers do not need to change their vector-search API when the index is introduced.

## Validation

- Backend build: PASS.
- S5.3 pgvector regression: PASS.
- Embedding Pipeline compatibility regression: PASS.
- Backend type audit: PASS with explicit_any=0, untyped_request=0, untyped_whole_query=0.
- Regression verifies the <=> operator, SQL-side similarity, current-provenance filters, stale-vector filter, parameterized vector/exclusions, bounded limits and absence of in-memory vector math.
- Initial migration source confirms the pgvector extension and vector(1536) column.

No live PostgreSQL claim is made in this task because the current Runner cannot connect to localhost:5433. The earlier environment failure is already documented; this task does not repeatedly retry the blocked connection.

## Next task

S5.3 — recommendation explanation. Similar Tool recommendations now consume ToolVectorSearchService through bounded public favorite seeds, deterministic merge/de-duplication and public fallback. The next task should explain recommendations with safe derived signals without exposing raw vectors, provenance internals or device-local event history. See docs/SIMILAR_RECOMMENDATIONS.md.
