import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const {
  AiProviderExecutionError,
} = require('../dist/ai/ai-provider.errors.js');
const {
  ANTHROPIC_PROVIDER_ID,
  DEFAULT_ANTHROPIC_MAX_OUTPUT_TOKENS,
  DEFAULT_ANTHROPIC_MODEL_ID,
  AnthropicProvider,
} = require('../dist/ai/providers/anthropic.provider.js');
const {
  AnthropicProviderRegistrar,
} = require('../dist/ai/providers/anthropic-provider.registrar.js');

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function assertExecutionCode(error, code) {
  return (
    error instanceof AiProviderExecutionError
    && error.code === code
  );
}

const requests = [];
const provider = new AnthropicProvider({
  apiKey: 'test-anthropic-credential',
  fetchImpl: async (url, init) => {
    requests.push({ url, init });
    return response(200, {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-5',
      content: [
        { type: 'thinking', thinking: 'internal' },
        { type: 'text', text: 'hello ' },
        { type: 'text', text: 'world' },
      ],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 60,
        cache_read_input_tokens: 20,
        cache_creation_input_tokens: 10,
        cache_creation: {
          ephemeral_5m_input_tokens: 10,
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: 30,
        output_tokens_details: {
          thinking_tokens: 8,
        },
      },
    });
  },
});

assert.equal(provider.definition.id, ANTHROPIC_PROVIDER_ID);
assert.equal(provider.definition.defaultModelId, DEFAULT_ANTHROPIC_MODEL_ID);
assert.deepEqual(
  provider.definition.models.map(model => model.id),
  [
    'claude-sonnet-5',
    'claude-opus-5',
    'claude-fable-5',
    'claude-haiku-4-5-20251001',
  ],
);

const result = await provider.generateText({
  modelId: 'claude-sonnet-5',
  messages: [
    { role: 'system', content: 'Be concise.' },
    { role: 'system', content: 'Answer in plain text.' },
    { role: 'user', content: 'Say hello.' },
    { role: 'assistant', content: 'Earlier assistant message.' },
    { role: 'user', content: 'Continue.' },
  ],
  parameters: {
    maxOutputTokens: 128,
  },
});

assert.deepEqual(result, {
  text: 'hello world',
  finishReason: 'stop',
  usage: {
    inputTokens: 90,
    outputTokens: 30,
    totalTokens: 120,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 10,
    cacheWrite5mInputTokens: 10,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: 8,
  },
});
assert.equal(requests.length, 1);
assert.equal(requests[0].url, 'https://api.anthropic.com/v1/messages');
assert.equal(requests[0].init.method, 'POST');
assert.equal(
  requests[0].init.headers['x-api-key'],
  'test-anthropic-credential',
);
assert.equal(
  requests[0].init.headers['anthropic-version'],
  '2023-06-01',
);
assert.equal(requests[0].init.headers['Content-Type'], 'application/json');

const sentBody = JSON.parse(requests[0].init.body);
assert.equal(sentBody.model, 'claude-sonnet-5');
assert.equal(sentBody.max_tokens, 128);
assert.equal(sentBody.system, 'Be concise.\n\nAnswer in plain text.');
assert.deepEqual(sentBody.messages, [
  { role: 'user', content: 'Say hello.' },
  { role: 'assistant', content: 'Earlier assistant message.' },
  { role: 'user', content: 'Continue.' },
]);
assert.equal('temperature' in sentBody, false);
assert.equal('store' in sentBody, false);

const defaultTokenRequests = [];
const defaultTokenProvider = new AnthropicProvider({
  apiKey: 'test-anthropic-credential',
  fetchImpl: async (_url, init) => {
    defaultTokenRequests.push(JSON.parse(init.body));
    return response(200, {
      content: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end_turn',
    });
  },
});
await defaultTokenProvider.generateText({
  modelId: 'claude-sonnet-5',
  messages: [{ role: 'user', content: 'hello' }],
});
assert.equal(
  defaultTokenRequests[0].max_tokens,
  DEFAULT_ANTHROPIC_MAX_OUTPUT_TOKENS,
);

const customModelProvider = new AnthropicProvider({
  apiKey: 'test-anthropic-credential',
  defaultModelId: 'claude-sonnet-5-20260926',
  fetchImpl: async () => response(200, {
    content: [{ type: 'text', text: 'ok' }],
    stop_reason: 'end_turn',
  }),
});
assert.equal(
  customModelProvider.definition.defaultModelId,
  'claude-sonnet-5-20260926',
);
assert.ok(
  customModelProvider.definition.models
    .some(model => model.id === 'claude-sonnet-5-20260926'),
);

for (const [stopReason, expected] of [
  ['stop_sequence', 'stop'],
  ['max_tokens', 'length'],
  ['model_context_window_exceeded', 'length'],
  ['refusal', 'content_filter'],
]) {
  const finishProvider = new AnthropicProvider({
    apiKey: 'test-anthropic-credential',
    fetchImpl: async () => response(200, {
      content: stopReason === 'refusal'
        ? []
        : [{ type: 'text', text: stopReason === 'max_tokens' ? '' : 'partial' }],
      stop_reason: stopReason,
    }),
  });
  const finishResult = await finishProvider.generateText({
    modelId: 'claude-sonnet-5',
    messages: [{ role: 'user', content: 'hello' }],
  });
  assert.equal(finishResult.finishReason, expected);
}

await assert.rejects(
  () => provider.generateText({
    modelId: 'claude-sonnet-5',
    messages: [{ role: 'user', content: 'hello' }],
    parameters: { temperature: 0.2 },
  }),
  error => assertExecutionCode(error, 'UNSUPPORTED_PARAMETER'),
);

await assert.rejects(
  () => provider.generateText({
    modelId: 'claude-sonnet-5',
    messages: [{ role: 'system', content: 'system only' }],
  }),
  error => assertExecutionCode(error, 'INVALID_REQUEST'),
);

await assert.rejects(
  () => provider.generateText({
    modelId: 'claude-sonnet-5',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'prefill' },
    ],
  }),
  error => assertExecutionCode(error, 'INVALID_REQUEST'),
);

for (const [status, code] of [
  [401, 'AUTHENTICATION_FAILED'],
  [403, 'AUTHENTICATION_FAILED'],
  [429, 'RATE_LIMITED'],
  [504, 'UPSTREAM_TIMEOUT'],
  [529, 'UPSTREAM_UNAVAILABLE'],
  [503, 'UPSTREAM_UNAVAILABLE'],
  [400, 'UPSTREAM_REJECTED'],
]) {
  const failingProvider = new AnthropicProvider({
    apiKey: 'test-anthropic-credential',
    fetchImpl: async () => response(status, {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'raw upstream detail must not leak',
      },
    }),
  });
  await assert.rejects(
    () => failingProvider.generateText({
      modelId: 'claude-sonnet-5',
      messages: [{ role: 'user', content: 'hello' }],
    }),
    error => (
      assertExecutionCode(error, code)
      && !error.message.includes('raw upstream detail')
    ),
  );
}

const malformedProvider = new AnthropicProvider({
  apiKey: 'test-anthropic-credential',
  fetchImpl: async () => response(200, {
    content: [],
    stop_reason: 'end_turn',
  }),
});
await assert.rejects(
  () => malformedProvider.generateText({
    modelId: 'claude-sonnet-5',
    messages: [{ role: 'user', content: 'hello' }],
  }),
  error => assertExecutionCode(error, 'INVALID_RESPONSE'),
);

const noKeyRegistry = new AiProviderRegistry();
const noKeyRegistrar = new AnthropicProviderRegistrar(
  { get: () => undefined },
  noKeyRegistry,
);
noKeyRegistrar.onModuleInit();
assert.equal(noKeyRegistry.list().length, 0);

const configuredRegistry = new AiProviderRegistry();
const configuredRegistrar = new AnthropicProviderRegistrar(
  {
    get: key => (
      key === 'ANTHROPIC_API_KEY'
        ? 'test-anthropic-credential'
        : key === 'ANTHROPIC_MODEL'
          ? 'claude-opus-5'
          : undefined
    ),
  },
  configuredRegistry,
);
configuredRegistrar.onModuleInit();
assert.equal(configuredRegistry.list().length, 1);
assert.equal(
  configuredRegistry.get('anthropic').definition.defaultModelId,
  'claude-opus-5',
);

console.log('Anthropic Provider model catalog and configurable default: PASS');
console.log('Messages API headers/system/history/max_tokens mapping: PASS');
console.log('text blocks and stop-reason normalization: PASS');
console.log('Messages usage normalizes ordinary/cache-read/cache-write tokens: PASS');
console.log('temperature/prefill validation is fail-closed: PASS');
console.log('upstream failures are typed without raw error leakage: PASS');
console.log('ANTHROPIC_API_KEY-gated Provider registration: PASS');
console.log('S5.1 Anthropic Provider regression: PASS');
