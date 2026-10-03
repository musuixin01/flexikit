import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const {
  AiProviderExecutionError,
} = require('../dist/ai/ai-provider.errors.js');
const {
  DEFAULT_OPENAI_MODEL_ID,
  OpenAiProvider,
} = require('../dist/ai/providers/openai.provider.js');
const {
  OpenAiProviderRegistrar,
} = require('../dist/ai/providers/openai-provider.registrar.js');

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
const provider = new OpenAiProvider({
  apiKey: 'test-openai-credential',
  fetchImpl: async (url, init) => {
    requests.push({ url, init });
    return response(200, {
      status: 'completed',
      output: [
        { type: 'reasoning', summary: [] },
        {
          type: 'message',
          role: 'assistant',
          content: [
            { type: 'output_text', text: 'hello ' },
            { type: 'output_text', text: 'world' },
          ],
        },
      ],
      usage: {
        input_tokens: 120,
        input_tokens_details: {
          cached_tokens: 20,
          cache_write_tokens: 10,
        },
        output_tokens: 30,
        output_tokens_details: {
          reasoning_tokens: 8,
        },
        total_tokens: 150,
      },
    });
  },
});

assert.equal(provider.definition.id, 'openai');
assert.equal(provider.definition.defaultModelId, DEFAULT_OPENAI_MODEL_ID);
assert.deepEqual(
  provider.definition.models.map(model => model.id),
  ['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'],
);

const result = await provider.generateText({
  modelId: 'gpt-6-sol',
  messages: [
    { role: 'system', content: 'Be concise.' },
    { role: 'user', content: 'Say hello.' },
  ],
  parameters: { maxOutputTokens: 64 },
});
assert.deepEqual(result, {
  text: 'hello world',
  finishReason: 'stop',
  usage: {
    inputTokens: 120,
    outputTokens: 30,
    totalTokens: 150,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 10,
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: 8,
  },
});

assert.equal(requests.length, 1);
assert.equal(requests[0].url, 'https://api.openai.com/v1/responses');
assert.equal(requests[0].init.method, 'POST');
assert.equal(requests[0].init.headers['Content-Type'], 'application/json');
assert.match(requests[0].init.headers.Authorization, /^Bearer /);
const sentBody = JSON.parse(requests[0].init.body);
assert.equal(sentBody.model, 'gpt-6-sol');
assert.equal(sentBody.store, false);
assert.equal(sentBody.max_output_tokens, 64);
assert.deepEqual(sentBody.input, [
  { role: 'system', content: 'Be concise.' },
  { role: 'user', content: 'Say hello.' },
]);

const customModelProvider = new OpenAiProvider({
  apiKey: 'test-openai-credential',
  defaultModelId: 'gpt-6-astra-2026-09-03',
  fetchImpl: async () => response(200, {
    status: 'completed',
    output_text: 'ok',
  }),
});
assert.equal(customModelProvider.definition.defaultModelId, 'gpt-6-astra-2026-09-03');
assert.ok(
  customModelProvider.definition.models
    .some(model => model.id === 'gpt-6-astra-2026-09-03'),
);

const incompleteProvider = new OpenAiProvider({
  apiKey: 'test-openai-credential',
  fetchImpl: async () => response(200, {
    status: 'incomplete',
    incomplete_details: { reason: 'max_output_tokens' },
    output: [],
  }),
});
assert.deepEqual(
  await incompleteProvider.generateText({
    modelId: 'gpt-6-sol',
    messages: [{ role: 'user', content: 'continue' }],
  }),
  { text: '', finishReason: 'length' },
);

await assert.rejects(
  () => provider.generateText({
    modelId: 'gpt-6-sol',
    messages: [{ role: 'user', content: 'temperature' }],
    parameters: { temperature: 0.2 },
  }),
  error => assertExecutionCode(error, 'UNSUPPORTED_PARAMETER'),
);

for (const [status, code] of [
  [401, 'AUTHENTICATION_FAILED'],
  [429, 'RATE_LIMITED'],
  [504, 'UPSTREAM_TIMEOUT'],
  [503, 'UPSTREAM_UNAVAILABLE'],
  [400, 'UPSTREAM_REJECTED'],
]) {
  const failingProvider = new OpenAiProvider({
    apiKey: 'test-openai-credential',
    fetchImpl: async () => response(status, { error: { message: 'ignored' } }),
  });
  await assert.rejects(
    () => failingProvider.generateText({
      modelId: 'gpt-6-sol',
      messages: [{ role: 'user', content: 'hello' }],
    }),
    error => assertExecutionCode(error, code),
  );
}

for (const limitCode of [
  'credit_balance_exhausted',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
]) {
  const quotaProvider = new OpenAiProvider({
    apiKey: 'test-openai-credential',
    fetchImpl: async () => response(429, {
      error: {
        code: limitCode,
        type: 'insufficient_quota',
        message: 'billing detail must not leak',
      },
    }),
  });
  await assert.rejects(
    () => quotaProvider.generateText({
      modelId: 'gpt-6-sol',
      messages: [{ role: 'user', content: 'hello' }],
    }),
    error => (
      assertExecutionCode(error, 'UPSTREAM_REJECTED')
      && !error.message.includes('billing detail')
    ),
  );
}

const malformedProvider = new OpenAiProvider({
  apiKey: 'test-openai-credential',
  fetchImpl: async () => response(200, {
    status: 'completed',
    output: [{ type: 'reasoning' }],
  }),
});
await assert.rejects(
  () => malformedProvider.generateText({
    modelId: 'gpt-6-sol',
    messages: [{ role: 'user', content: 'hello' }],
  }),
  error => assertExecutionCode(error, 'INVALID_RESPONSE'),
);

const failedResponseProvider = new OpenAiProvider({
  apiKey: 'test-openai-credential',
  fetchImpl: async () => response(200, {
    status: 'failed',
    error: { message: 'upstream detail must not leak' },
  }),
});
await assert.rejects(
  () => failedResponseProvider.generateText({
    modelId: 'gpt-6-sol',
    messages: [{ role: 'user', content: 'hello' }],
  }),
  error => (
    assertExecutionCode(error, 'UPSTREAM_REJECTED')
    && !error.message.includes('upstream detail')
  ),
);

const noKeyRegistry = new AiProviderRegistry();
const noKeyRegistrar = new OpenAiProviderRegistrar(
  { get: () => undefined },
  noKeyRegistry,
);
noKeyRegistrar.onModuleInit();
assert.equal(noKeyRegistry.list().length, 0);

const configuredRegistry = new AiProviderRegistry();
const configuredRegistrar = new OpenAiProviderRegistrar(
  {
    get: key => (
      key === 'OPENAI_API_KEY'
        ? 'test-openai-credential'
        : key === 'OPENAI_MODEL'
          ? 'gpt-6-astra'
          : undefined
    ),
  },
  configuredRegistry,
);
configuredRegistrar.onModuleInit();
assert.equal(configuredRegistry.list().length, 1);
assert.equal(
  configuredRegistry.get('openai').definition.defaultModelId,
  'gpt-6-astra',
);

console.log('OpenAI Provider model catalog and configurable default: PASS');
console.log('Responses API request uses normalized messages and store=false: PASS');
console.log('raw Responses output text aggregation and finish mapping: PASS');
console.log('Responses usage is normalized without text-based token estimation: PASS');
console.log('provider-specific parameter and upstream error normalization: PASS');
console.log('billing/quota 429 errors are classified as non-retryable: PASS');
console.log('HTTP-200 failed response is normalized without upstream detail leakage: PASS');
console.log('OPENAI_API_KEY-gated Provider registration: PASS');
console.log('S5.1 OpenAI Provider regression: PASS');
