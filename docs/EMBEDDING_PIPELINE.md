# FlexiKit Tool Embedding Pipeline

Status: S5.3 Embedding Pipeline completed in code on 2026-09-28.

## Scope

This task creates and maintains embeddings for the public FlexiKit Tool catalog only.

It deliberately does not implement vector similarity search, pgvector indexes, recommendation blending, or user-behavior embeddings. Those belong to the following S5.3 tasks.

## Provider contract

- Provider: OpenAI.
- Model: text-embedding-3-small.
- Endpoint: /v1/embeddings.
- Stored dimensions: 1536, matching the existing tools.embedding vector(1536) schema.
- Batch size: at most 32 inputs.
- Canonical source: at most 8,000 UTF-8 bytes per Tool.
- Request timeout: 30 seconds by default, bounded to 1–120 seconds through EMBEDDING_TIMEOUT_MS.

The 8,000-byte source limit and 32-item batch cap keep the pipeline conservatively below the provider's documented per-input 8,192-token and aggregate 300,000-token embedding request limits.

## Privacy boundary

The pipeline only scans tools where user_id IS NULL.

User-created/private Tools are not automatically sent to the external embedding provider.

Canonical source may contain:

- Tool name.
- description.
- normalized tags.
- category.
- web/local kind.
- hostname for HTTP/HTTPS web tools.

Canonical source never contains:

- user id.
- local_path or any absolute local path.
- URL path, query string, fragment, or credentials.
- local recommendation behavior.
- Prompt or assistant history.
- Clipboard or attached file context.
- Provider/API keys.
- view/click/favorite counters.

## Canonical source and stale detection

Source schema version is currently 1.

Normalization:

- Unicode NFKC.
- control characters converted to spaces.
- whitespace collapsed.
- tags de-duplicated case-insensitively and sorted deterministically.
- web URLs reduced to hostname only.
- final UTF-8 payload truncated to 8,000 bytes without splitting a Unicode character.

A SHA-256 source hash is stored alongside the vector. A Tool is stale when provider, model, dimensions, source version, or source hash differs from the current pipeline contract.

## Storage provenance

The existing tools.embedding vector(1536) column remains the vector storage.

Migration AddToolEmbeddingProvenance1790611200000 adds:

- embedding_provider.
- embedding_model.
- embedding_dimensions.
- embedding_source_version.
- embedding_source_hash.
- embedding_updated_at as TIMESTAMPTZ.

The migration clears legacy/unverifiable embedding values and adds a check constraint requiring embedding + provenance to be either fully absent or fully present.

The entity marks the vector and provenance columns select:false so normal Tool API responses do not expose large vectors/internal embedding metadata.

No HNSW/IVFFlat index or vector-search SQL is added in this task.

## Pipeline execution

ToolEmbeddingPipelineService:

1. scans only public Tool rows, bounded to 5,000 rows per invocation.
2. recomputes canonical source and SHA-256 hash.
3. selects at most 100 stale rows by default, hard-capped at 500.
4. sends stale sources in batches of at most 32.
5. strictly validates returned model id, item count, index mapping, 1536 dimensions, finite numbers and provider usage metadata.
6. records Provider-reported embedding input tokens into the existing platform AI Usage ledger.
7. obtains a pessimistic row lock before storing each vector.
8. rebuilds the source under the lock and skips the write if content changed while the network request was in flight.

The pipeline is idempotent: current provenance/source hash is skipped on later runs.

The operation is explicitly triggered with:

    npm run embedding:sync

EMBEDDING_SYNC_LIMIT can bound the number of stale Tools processed in one run.

No startup hook, browser action, user Tool CRUD action, or hidden scheduler automatically sends data to the embedding provider.

## Cost accounting

text-embedding-3-small is included in the versioned AI pricing catalog at the current official input-token price baseline.

Each successful embedding batch writes one platform usage event with Provider-reported prompt tokens, zero output tokens, and no source text.

## Failure semantics

- Missing OPENAI_API_KEY fails closed; no zero/fake vector is generated.
- invalid batch/input fails before the network request.
- authentication/rate-limit/timeout/unavailable/rejected failures are normalized without exposing upstream response bodies.
- malformed JSON, unexpected model id, wrong item counts, duplicate indexes, wrong dimensions, non-finite values or missing usage metadata fail closed.
- successful earlier batches may remain stored if a later batch fails; rerunning is safe because provenance makes the operation idempotent.
- no database transaction is held open across the external network call.

## Validation

- Backend build: PASS.
- S5.3 Embedding Pipeline regression: PASS.
- S5.1 AI usage/cost regression: PASS after embedding pricing addition.
- Backend type audit: PASS with explicit_any=0, untyped_request=0, untyped_whole_query=0.
- migration up sequence is executed against a mock QueryRunner and validates add/reset/check phases.
- source scan confirms no similarity operator, HNSW, or IVFFlat work was introduced early.

Current WebCodex Runner access to the local PostgreSQL endpoint is blocked with EACCES, so this task does not claim that AddToolEmbeddingProvenance1790611200000 has already run on the local database. Apply migrations in a database-connected runtime before running embedding:sync.

## Next task

S5.3 — pgvector: consume only vectors whose provenance matches the current embedding contract, implement database-side similarity queries/index strategy, and keep similarity math out of application-memory loops.
