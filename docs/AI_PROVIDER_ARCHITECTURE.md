# AI Provider / Model Router Architecture

Status: S5.1 Provider/usage/resilience completed on 2026-09-27; S5.2 native desktop assistant baseline is now connected to this boundary.

This document defines the provider-neutral AI boundary now used by OpenAI, Gemini, Anthropic, BYOK, usage/cost accounting, retry/fallback and the S5.2 assistant shell.

## 1. Goals

The Provider layer must let FlexiKit add or replace model vendors without changing the AI assistant or other product features.

The baseline separates five concerns:

- normalized AI request/response contracts,
- Provider registration and metadata validation,
- deterministic provider/model resolution,
- Provider-neutral generation orchestration,
- authenticated Provider catalog exposure.

## 2. Core files

- backend/src/ai/contracts/ai-provider.ts: normalized messages, generation parameters, provider/model definitions, routed results and catalog types.
- backend/src/ai/ai-provider.registry.ts: validates Provider ids/model metadata, rejects duplicates and exposes defensive catalog copies.
- backend/src/ai/ai-model-router.ts: resolves a Provider/model and fails closed for invalid routes.
- backend/src/ai/ai.service.ts: Provider-neutral orchestration and generateText delegation.
- backend/src/ai/ai.controller.ts: authenticated GET /v1/ai/providers catalog endpoint.
- backend/src/ai/ai.module.ts: owns and exports the registry, router and service.

## 3. Provider contract

Every concrete Provider must expose:

- a stable lowercase Provider id,
- a display name,
- one or more model definitions,
- a declared default model that exists in its own model list,
- generateText using the normalized FlexiKit request contract.

Provider ids use the current pattern:

^[a-z][a-z0-9-]{1,31}$

Registration fails fast when:

- Provider id is invalid,
- display name or model list is missing,
- model ids are empty or duplicated,
- the declared default model is not registered,
- another Provider already owns the same Provider id.

## 4. Routing baseline

AiModelRouter / AiService currently support:

- explicit providerId + modelId,
- explicit Provider with its default model,
- no target, which starts with the first registered Provider/default model and exposes the ordered registered candidates to the resilience layer.

Routing errors are typed domain errors:

- NO_PROVIDER_AVAILABLE,
- PROVIDER_NOT_FOUND,
- MODEL_NOT_FOUND.

AiService owns retry/fallback rather than the router. Only transient rate-limit/timeout/unavailable failures are retried. Cross-Provider fallback is allowed only for implicit platform routing; explicit Provider/model and BYOK never silently cross Provider boundaries. The current candidate order is still registry order; health/cost/SLA-aware dynamic ranking is not implemented.

## 5. Current API behavior

GET /v1/ai/providers, GET /v1/ai/byok/providers and POST /v1/ai/assistant/generate are authenticated and return the standard FlexiKit success envelope.

The platform Provider list only contains adapters whose server credentials are configured. The BYOK catalog exposes safe supported Provider/model metadata without exposing or requiring stored credentials in the response.

## 6. Security and credential boundary

Server Provider credentials remain environment-only. Windows BYOK credentials remain in the dedicated DPAPI Current User vault, while Browser development mode keeps them in runtime memory only. BYOK credentials are request-scoped on the Backend, never registered globally or returned through catalogs/results. Prompt/response text is not stored in the AI usage ledger.

## 7. Extension path

The next Provider implementation should:

1. implement AiProvider,
2. define its Provider/model metadata,
3. register itself with AiProviderRegistry,
4. translate vendor-specific request/response formats at the adapter boundary,
5. keep vendor-specific fields out of upstream assistant code.

New Providers must follow this same contract and preserve the existing assistant-facing boundary.

## 8. Validation

The Provider abstraction baseline is verified by:

- Backend npm run build,
- npm run test:ai-provider-regression,
- existing npm run test:type-audit,
- credential-free HTTP mount smoke on port 3022.

The regression covers Provider metadata validation, duplicate rejection, deterministic routing, typed fail-closed errors, defensive catalog metadata, Controller/Service catalog consistency and normalized generateText delegation.

The HTTP smoke verifies /v1/ai/providers is mounted and returns 401 without authentication.

## 9. OpenAI Provider baseline

OpenAI is the first concrete Provider implementation.

Current server configuration:

- OPENAI_API_KEY: optional server-only credential. When absent, OpenAI is not registered and the catalog does not claim it is available.
- OPENAI_MODEL: optional default model override.
- Default model when no override is configured: gpt-6-sol.
- Built-in current model metadata: gpt-6-astra, gpt-6-sol, gpt-6-luna.
- A configured custom or snapshot model id is added to that Provider model list so routing remains explicit.

Transport behavior:

- POST https://api.openai.com/v1/responses.
- store=false on every request.
- normalized system, user and assistant messages are sent in order.
- maxOutputTokens maps to max_output_tokens.
- temperature is currently rejected explicitly for this GPT-6 baseline instead of being silently ignored; model capability metadata will own this distinction later.
- raw REST output is traversed across all message items and output_text content blocks; no fixed output array position is assumed.

Error behavior is Provider-neutral and does not return raw upstream bodies:

- 401 or 403 maps to AUTHENTICATION_FAILED.
- 429 maps to RATE_LIMITED.
- 408 or 504 maps to UPSTREAM_TIMEOUT.
- 5xx or network failure maps to UPSTREAM_UNAVAILABLE.
- other rejected requests and response status=failed map to UPSTREAM_REJECTED.
- malformed or textless completed response maps to INVALID_RESPONSE.

Validation:

- Backend build passes.
- test:openai-provider-regression passes.
- test:ai-provider-regression passes after OpenAI registration support.
- test:type-audit remains zero for explicit any and untyped request/query findings.
- Regression transport is mocked and verifies request shape, store=false, text aggregation, failure mapping and credential-gated registration.
- No external live request was run because no user OpenAI credential was provided in this task.

Timeout/retry/fallback, usage/cost accounting and capability labels are implemented centrally in S5.1. Streaming, tools, vision, structured outputs and richer reasoning controls remain later adapter/product work.
## 10. Gemini Provider baseline

Gemini is the second concrete Provider implementation.

Current server configuration:

- GEMINI_API_KEY: optional server-only Google AI Studio credential. When absent, Gemini is not registered.
- GEMINI_MODEL: optional default model override.
- Default model: gemini-3.8-flash.
- Built-in model metadata: gemini-3.8-flash, gemini-3.5-flash, gemini-3.5-flash-lite.
- A configured custom model id is added to the Gemini Provider model list.

Transport behavior:

- POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent.
- x-goog-api-key carries the server-only Gemini credential.
- store=false is sent explicitly.
- FlexiKit system messages map to systemInstruction text parts.
- FlexiKit user messages map to Gemini user contents.
- FlexiKit assistant history maps to Gemini model contents.
- temperature maps to generationConfig.temperature.
- maxOutputTokens maps to generationConfig.maxOutputTokens.
- The first candidate text is assembled from all text parts.

Finish and safety mapping:

- STOP -> stop.
- MAX_TOKENS -> length.
- SAFETY, PROHIBITED_CONTENT, BLOCKLIST and IMAGE_SAFETY -> content_filter.
- promptFeedback.blockReason with no candidates -> content_filter.
- Other finish reasons -> other.
- Missing candidates or text in a non-filtered response -> INVALID_RESPONSE.

Upstream error behavior uses the same Provider-neutral execution error contract as OpenAI and never exposes raw Google error bodies.

Validation:

- Backend build passes.
- test:gemini-provider-regression passes.
- test:openai-provider-regression continues to pass.
- test:ai-provider-regression continues to pass.
- test:type-audit remains clean.
- Regression transport is mocked and covers system/history mapping, generation config, store=false, x-goog-api-key, safety filtering, finish reasons, upstream errors and credential-gated registration.
- No external live request was run because no user Gemini credential was provided.

Usage/cost accounting and timeout/retry/fallback are implemented centrally in S5.1. Streaming, multiple candidates, multimodal content, thinking configuration and tools remain later adapter work. Native capability metadata is recorded separately from adapter implementation status.
## 11. Claude / Anthropic Provider baseline

Claude is the third concrete Provider implementation.

Current server configuration:

- ANTHROPIC_API_KEY: optional server-only Anthropic credential. When absent, Anthropic is not registered.
- ANTHROPIC_MODEL: optional default model override.
- Default model: claude-sonnet-5.
- Built-in model metadata: claude-sonnet-5, claude-opus-5, claude-fable-5, claude-haiku-4-5-20251001.
- A configured custom model id is added to the Anthropic Provider model list.
- Provider id: anthropic; display name: Anthropic Claude.

Transport behavior:

- POST https://api.anthropic.com/v1/messages.
- x-api-key carries the server-only Anthropic credential.
- anthropic-version is pinned to 2023-06-01.
- FlexiKit system messages are joined in order and sent through the top-level system field.
- FlexiKit user / assistant history maps directly to Messages API user / assistant roles.
- The current request must end with a user message. This prevents unsupported final assistant prefill on current Claude 4.6+ models.
- maxOutputTokens maps to required max_tokens.
- When maxOutputTokens is omitted, the Provider uses 4096 as its baseline output limit.
- temperature remains intentionally rejected by the current adapter; model capability metadata now separately records per-model native sampling support.
- Response text is assembled from all content blocks whose type is text; thinking and other block types are ignored by the text-only Provider contract.

Finish mapping:

- end_turn and stop_sequence -> stop.
- max_tokens and model_context_window_exceeded -> length.
- refusal -> content_filter.
- Other stop reasons -> other.
- Empty text is accepted only for length/content_filter outcomes; other textless successful responses fail closed as INVALID_RESPONSE.

Upstream error behavior:

- 401/403 -> AUTHENTICATION_FAILED.
- 429 -> RATE_LIMITED.
- 408/504 -> UPSTREAM_TIMEOUT.
- 5xx, including Anthropic overload responses such as 529 -> UPSTREAM_UNAVAILABLE.
- Other rejected requests -> UPSTREAM_REJECTED.
- Malformed successful responses -> INVALID_RESPONSE.
- Raw Anthropic error bodies/messages are never forwarded through the Provider error.

Validation:

- Backend build passes.
- test:anthropic-provider-regression passes.
- test:openai-provider-regression continues to pass.
- test:gemini-provider-regression continues to pass.
- test:ai-provider-regression continues to pass.
- test:type-audit remains clean.
- Regression transport is mocked and covers model catalog/default override, headers, system/history mapping, required/default max_tokens, text block aggregation, stop reasons, temperature/prefill validation, upstream errors and credential-gated registration.
- No external live request was run because no user Anthropic credential was provided.

Usage/cost accounting and timeout/retry/fallback are implemented centrally in S5.1. Streaming, adaptive thinking/effort, tools, vision/PDF and structured output remain later adapter work. Native capability metadata is recorded separately from adapter implementation status.
## 12. BYOK baseline

BYOK reuses the existing OpenAI, Gemini and Anthropic adapters without adding a second vendor protocol layer.

Credential boundary:

- Windows Desktop persists Provider credentials only in a dedicated Current User DPAPI vault under app local data.
- Fixed slots are openai, gemini and anthropic; arbitrary slot or path names are rejected.
- The encrypted vault files are separate from authentication-token storage.
- Browser Web keeps BYOK credentials in runtime memory only. It does not write them to localStorage, sessionStorage or IndexedDB.
- BYOK credentials are not stored in PostgreSQL and are not included in normal export or backup flows.
- The Profile account UI can save, replace and delete credentials and can query only whether a credential exists. It never reloads or displays the saved raw credential.

Backend execution:

- AiByokProviderFactory exposes safe Provider/model metadata for OpenAI, Gemini and Anthropic without credentials.
- GET /v1/ai/byok/providers is authenticated and returns metadata only.
- AiService can accept a request-scoped BYOK credential plus an explicit Provider target.
- A temporary Provider instance is created for that call and discarded afterward.
- The temporary Provider is never registered in AiProviderRegistry, cached, persisted or returned to the client.
- Existing server environment Provider registrations continue to operate independently.
- Raw BYOK credentials must never be logged or included in response/catalog objects.

Validation:

- Backend build passes.
- Web strict build passes with the BYOK account panel.
- test:byok-regression passes.
- test:byok-storage-regression passes.
- OpenAI, Gemini, Anthropic and base Provider regressions continue to pass.
- type-audit remains clean.
- cargo fmt --check and cargo check --all-targets pass with the correct Visual Studio Build Tools environment.
- Windows DPAPI BYOK vault regression passes 4/4 and verifies that the encrypted file does not contain the plaintext credential bytes.

The S5.2 native desktop assistant now consumes this BYOK path through POST /v1/ai/assistant/generate. Commercial BYOK entitlement gating remains a later monetization task.

## 13. Model capability labels

Model capability metadata is a declaration layer shared by registered Providers and BYOK catalogs. It intentionally separates two questions:

- native: what the upstream model/provider documents as available.
- adapter: what the current FlexiKit adapter has actually implemented and can safely expose today.

Normalized capability keys:

- textGeneration
- vision
- streaming
- toolCalling
- structuredOutput
- reasoningControl
- temperature
- maxOutputTokens

Native support states are supported, conditional, unsupported and unknown. conditional is used when upstream support depends on another model setting; unknown is the fail-safe value for custom or snapshot model ids that have not been explicitly verified. Adapter support remains boolean because it describes current FlexiKit code, not upstream ambiguity.

Reasoning controls are described separately with normalized kinds:

- effort
- thinking-level
- manual-budget

Current verified metadata baseline (2026-09-26):

- OpenAI GPT-6 Astra/Sol/Luna: native vision, streaming, tool calling, structured output and reasoning controls are available. Astra does not expose custom temperature/top_p and has no none reasoning effort; Sol/Luna expose none reasoning effort and temperature is conditional on compatible reasoning settings. The current FlexiKit OpenAI adapter only implements text generation and maxOutputTokens.
- Gemini 3.8 Flash / 3.5 Flash / 3.5 Flash-Lite: native multimodal input, streaming, function calling, structured output and thinking are represented as supported. Gemini 3.8 Flash thinking levels are low/medium/high; 3.5 Flash and Flash-Lite include minimal/low/medium/high. The current FlexiKit Gemini adapter implements text generation, temperature and maxOutputTokens.
- Claude Sonnet 5 / Opus 5 / Fable 5: native vision, streaming, tools, structured output and reasoning are represented as supported; current-generation Claude sampling restrictions are represented with temperature=unsupported and effort-style reasoning metadata.
- Claude Haiku 4.5: native temperature remains supported and reasoning uses manual-budget metadata. The current FlexiKit Anthropic adapter still implements only text generation and maxOutputTokens and therefore does not expose temperature or thinking controls yet.

Registry rules:

- every model must provide all normalized capability keys,
- an adapter capability cannot be true when native is explicitly unsupported,
- missing/invalid capability profiles fail registration with INVALID_PROVIDER_DEFINITION,
- reasoning-control kinds and value lists are validated,
- registry catalog and BYOK catalog deep-copy nested capability metadata,
- custom model overrides use native=unknown for every capability instead of inferring from the model id.

Validation:

- Backend build passes.
- test:model-capabilities-regression passes.
- test:ai-provider-regression passes with capability schema validation and defensive-copy checks.
- OpenAI, Gemini, Anthropic and BYOK regressions continue to pass.
- test:type-audit remains clean.

Capability labels do not turn on new transport features. Streaming, tools, vision, structured output and reasoning controls remain disabled in adapter until their implementation tasks are completed.

## 14. S5.1 usage and resilience

AiService is the single production generation orchestrator:

- Provider-reported usage is normalized and recorded only after the final successful routed result.
- Failed retry/fallback attempts do not create duplicate usage ledger rows.
- AbortSignal reaches OpenAI, Gemini and Anthropic fetch calls.
- Default attempt timeout is 60 seconds and total budget is 90 seconds.
- transient failures use bounded retry with Retry-After support and exponential backoff+jitter.
- OpenAI quota/spend/credit-limit style 429 responses fail closed and are not retried/fallbacked.
- explicit Provider/model and BYOK requests never cross Provider boundaries.

## 15. S5.2 native desktop assistant baseline

The assistant adds no alternate Provider stack. AiAssistantService converts one authenticated user message into the existing normalized AiService request and maps domain failures to safe HTTP errors.

Client behavior:

- /assistant exists only in the Desktop route set.
- platform mode can use implicit routing or explicit Provider/model.
- BYOK mode requires an explicit Provider and loads the Key only at send time.
- the view does not directly read credentials.
- displayed messages are Vue component memory only and are not persisted.
- the current baseline deliberately sends no prior message history.
- current-tool state is runtime memory only and updates only after a user-triggered FlexiKit Tool open succeeds.
- the assistant visibly shows current-tool metadata and lets the user disable it per request.
- current-tool payload is limited to id/name/category/web-or-local kind/hostname; local paths are excluded.
- Backend treats current-tool metadata as untrusted descriptive data rather than instructions.
- current-file context is available only after an explicit native file-picker action; cancellation reads nothing.
- the Desktop picker accepts one allowlisted UTF-8 text file up to 32 KiB and returns basename/extension/content only, never an absolute path.
- file content remains a user-role message; the system message only establishes that the attached content is untrusted user data and cannot override higher-priority instructions.
- file content and metadata are not persisted by the assistant or usage ledger.
- Clipboard context is read only after an explicit assistant button action; there is no automatic mount/focus/send read, polling or subscription.
- Clipboard text is runtime-memory only, max 16 KiB by UTF-8 bytes, removable/refreshable/optional per request, and is validated again by Backend.
- Clipboard text remains user-role untrusted data; the system guard cannot promote Clipboard content into higher-priority instructions.
- Clipboard content is not persisted or written to the usage ledger.
- Prompt/response history is session-only: client/server persistence disabled, refresh/close clears it, and attachments are excluded from history retention.
- Any future local Prompt-history persistence requires an explicit opt-in and must remain excluded from backup until separately designed and validated.

See docs/AI_ASSISTANT.md for the product/runtime privacy boundary and validation evidence.