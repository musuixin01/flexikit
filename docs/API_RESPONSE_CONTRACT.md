# FlexiKit API Success Response Contract

> Status: S4.1 baseline
> Backend source of truth: `ApiResponseInterceptor` + `ApiSuccessResponse<T>`

## 1. Scope

This contract applies to normal JSON API success responses.

Success envelope:

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

Fields:

- `code`: numeric `0` means request success.
- `message`: currently fixed to `"success"`.
- `data`: original Controller return value.
- Controller `undefined` is normalized to explicit `null`.

Error responses are not wrapped by this contract. They continue to use `docs/API_ERROR_CONTRACT.md`.

## 2. Backend implementation

`ApiResponseInterceptor` is registered globally through Nest `APP_INTERCEPTOR`.

Normal Controller return values are wrapped once after Controller/Service execution.

Examples:

```ts
return { id: 1 }
```

becomes:

```json
{
  "code": 0,
  "message": "success",
  "data": { "id": 1 }
}
```

Arrays, strings, booleans and null-like successful results follow the same rule.

HTTP status semantics remain unchanged. The envelope does not turn an error status into success.

## 3. Raw response escape hatch

Endpoints that intentionally own the raw HTTP response must use:

`@RawResponse()`

Current audited use:

- `GET /tools/favicon`

That endpoint returns image bytes on success and an empty 404 when no favicon exists, so wrapping its body would break browser/image-loader behavior.

The decorator skips the success interceptor only. Exceptions thrown by the endpoint still pass through the global error filter.

New raw/binary/streaming endpoints must explicitly opt out and document why.

## 4. Web compatibility layer

The single Axios instance in `apps/web/src/api/client.ts` detects the exact success envelope:

- `code === 0`
- `message === "success"`
- own `data` field

It then replaces Axios `response.data` with the envelope's `data`.

Therefore existing business API modules and pages continue to consume their previous data shapes:

```ts
const response = await toolsApi.getRankings(...)
response.data
```

No page-level mass migration is required.

Error responses are never unwrapped by the success branch.

## 5. Boundary rules

- Do not manually construct `{ code: 0, message: "success", data }` in Controllers.
- Controllers return business data only; the global interceptor owns the envelope.
- Do not use `@RawResponse()` for ordinary JSON endpoints.
- Do not infer errors from a successful envelope's data.
- Machine-readable error logic belongs to the separate error `code` contract.
- Future pagination metadata should live inside `data` or be introduced through a separately versioned response contract; do not add ad-hoc top-level fields per endpoint.

## 6. Validation

Run:

```bash
npm --prefix backend run build
npm --prefix backend run test:response-regression
npm --prefix backend run test:error-regression
npm --prefix apps/web run build
```

The live bounded HTTP smoke additionally verifies:

- `GET /` → `{ code: 0, message: "success", data: "Hello FlexiKit!" }`
- invalid `POST /auth/login` → `400 / VALIDATION_ERROR`
- missing-url `GET /tools/favicon` → `400 / BAD_REQUEST` even though the route is raw-response on successful binary delivery.
