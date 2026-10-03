# FlexiKit API Logging Contract

> Status: S4.1 baseline
> Scope: Backend HTTP request / error correlation logging

## 1. Correlation ID

Every HTTP request receives a `requestId`.

- A client may send `X-Request-Id`.
- Client-provided IDs are accepted only when they match the safe 8–64 character `A-Z / a-z / 0-9 / . / _ / -` format.
- Invalid or missing IDs are replaced with a server-generated UUID.
- The final ID is returned in the `X-Request-Id` response header.
- CORS allows and exposes `X-Request-Id`.

For the current single-service Backend, `requestId` is the correlation identifier. Distributed trace/span IDs are deferred until FlexiKit actually introduces multi-service tracing.

## 2. Request log

The global `RequestLoggingMiddleware` emits one structured `http_request` record when a response completes, or when a connection closes early.

Example fields:

```json
{
  "event": "http_request",
  "timestamp": "2026-09-24T00:00:00.000Z",
  "requestId": "client-success-1234",
  "method": "GET",
  "path": "/tools",
  "statusCode": 200,
  "durationMs": 18.42,
  "outcome": "completed",
  "userId": 42,
  "clientIp": "203.0.113.x",
  "userAgent": "FlexiKit/1.0"
}
```

Rules:

- `path` never contains the query string.
- Request body is never logged.
- Query values are never logged.
- Authorization / Cookie headers are never logged.
- IP addresses are masked before logging.
- User-Agent removes CR/LF/tab injection and is truncated to 160 characters.
- `userId` is logged only when authentication has produced a positive integer user ID.
- Duration uses a monotonic high-resolution timer.
- Aborted connections use `outcome = aborted`.

## 3. Error log

`GlobalHttpExceptionFilter` emits a correlated `http_error` record before returning the existing API error contract.

Example:

```json
{
  "event": "http_error",
  "timestamp": "2026-09-24T00:00:00.000Z",
  "requestId": "client-error-1234",
  "method": "POST",
  "path": "/auth/login",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "clientIp": "203.0.113.x"
}
```

Behavior:

- 4xx errors use warning-level logging and do not emit stacks.
- 5xx / unknown exceptions use error-level logging.
- 5xx stack traces stay server-side and are never included in the HTTP response.
- Error logs do not copy request body/query/header values or user-facing error messages.
- The corresponding completion `http_request` log carries the same request ID and final status code.

## 4. Output transport

The baseline uses Nest `Logger`, so structured JSON is written through the process logger/stdout.

This task does not introduce:

- remote log shipping,
- file rotation,
- retention policy,
- OpenTelemetry,
- distributed spans,
- ELK/Loki/Sentry integration.

Those should be introduced only with an explicit operations/observability design.

## 5. Database logging boundary

TypeORM development SQL logging is a separate subsystem from the HTTP request/error logger.

The new HTTP logger deliberately excludes body/query/auth/cookie values. Production already disables TypeORM SQL logging. If development database logging later needs stricter privacy, control it through a dedicated database logging flag rather than weakening the HTTP logging contract.

## 6. Validation

Run:

```bash
npm --prefix backend run build
npm --prefix backend run test:logging-regression
npm --prefix backend run test:error-regression
npm --prefix backend run test:response-regression
npm --prefix backend run test:type-audit
```

The bounded live HTTP smoke additionally verifies:

- caller-safe `X-Request-Id` is preserved and returned,
- CORS exposes `X-Request-Id`,
- success and error logs share their request IDs,
- validation error logs use `VALIDATION_ERROR`,
- logged path excludes query strings,
- body/query marker values are absent from structured HTTP logs,
- localhost IP is logged only as `127.0.0.x`.
