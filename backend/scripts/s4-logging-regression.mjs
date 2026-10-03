import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildHttpErrorLogEntry,
  buildHttpRequestLogEntry,
  ensureRequestId,
  maskClientIp,
  sanitizeUserAgent,
} = require('../dist/common/logging/http-log-context.js');

function requestFixture({
  requestId,
  incomingRequestId,
  userId,
  ip = '203.0.113.42',
  userAgent = 'FlexiKit-Test/1.0',
} = {}) {
  return {
    requestId,
    method: 'GET',
    path: '/tools',
    ip,
    user: userId ? { userId } : undefined,
    header(name) {
      const key = name.toLowerCase();
      if (key === 'x-request-id') return incomingRequestId;
      if (key === 'user-agent') return userAgent;
      return undefined;
    },
  };
}

assert.equal(
  ensureRequestId(requestFixture({ incomingRequestId: 'client-trace-1234' })),
  'client-trace-1234',
);
console.log('valid incoming request id is preserved: PASS');

const generated = ensureRequestId(requestFixture({ incomingRequestId: 'bad\ntrace' }));
assert.match(generated, /^[0-9a-f-]{36}$/);
console.log('unsafe incoming request id is replaced: PASS');

assert.equal(maskClientIp('::ffff:192.168.1.25'), '192.168.1.x');
assert.equal(maskClientIp('2001:db8:85a3::8a2e:370:7334'), '2001:db8:85a3::x');
console.log('client IP masking: PASS');

const sanitizedUa = sanitizeUserAgent('Agent\r\nInjected\tValue');
assert.equal(sanitizedUa, 'Agent Injected Value');
assert.ok(sanitizeUserAgent('x'.repeat(300)).length <= 160);
console.log('user-agent sanitization: PASS');

const request = requestFixture({
  requestId: 'server-trace-1234',
  userId: 42,
});
const requestLog = buildHttpRequestLogEntry(request, 200, 12.3456, 'completed');
assert.equal(requestLog.requestId, 'server-trace-1234');
assert.equal(requestLog.userId, 42);
assert.equal(requestLog.clientIp, '203.0.113.x');
assert.equal(requestLog.durationMs, 12.35);
assert.equal(requestLog.path, '/tools');
assert.ok(!('body' in requestLog));
assert.ok(!('query' in requestLog));
assert.ok(!('headers' in requestLog));
console.log('request log excludes sensitive request payloads: PASS');

const errorLog = buildHttpErrorLogEntry(request, 400, 'BAD_REQUEST');
assert.equal(errorLog.requestId, requestLog.requestId);
assert.equal(errorLog.code, 'BAD_REQUEST');
assert.ok(!('message' in errorLog));
console.log('error log correlation and safe fields: PASS');

console.log('S4.1 logging regression: PASS');
