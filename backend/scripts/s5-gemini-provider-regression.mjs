import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const {
  AiProviderExecutionError,
} = require('../dist/ai/ai-provider.errors.js');
const {
  DEFAULT_GEMINI_MODEL_ID,
  GeminiProvider,
} = require('../dist/ai/providers/gemini.provider.js');
const {
  GeminiProviderRegistrar,
} = require('../dist/ai/providers/gemini-provider.registrar.js');

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
const provider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  fetchImpl: async (url, init) => {
    requests.push({ url, init });
    return response(200, {
      candidates: [{
        content: {
          role: 'model',
          parts: [
            { text: 'hello ' },
            { text: 'world' },
          ],
        },
        finishReason: 'STOP',
      }],
      usageMetadata: {
        promptTokenCount: 100,
        cachedContentTokenCount: 20,
        candidatesTokenCount: 30,
        thoughtsTokenCount: 10,
        totalTokenCount: 140,
      },
    });
  },
});

assert.equal(provider.definition.id, 'gemini');
assert.equal(provider.definition.defaultModelId, DEFAULT_GEMINI_MODEL_ID);
assert.deepEqual(
  provider.definition.models.map(model => model.id),
  ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
);

const result = await provider.generateText({
  modelId: 'gemini-3.8-flash',
  messages: [
    { role: 'system', content: 'Be concise.' },
    { role: 'user', content: 'Say hello.' },
    { role: 'assistant', content: 'Earlier assistant message.' },
    { role: 'user', content: 'Continue.' },
  ],
  parameters: {
    temperature: 0.4,
    maxOutputTokens: 64,
  },
});
assert.deepEqual(result, {
  text: 'hello world',
  finishReason: 'stop',
  usage: {
    inputTokens: 100,
    outputTokens: 40,
    totalTokens: 140,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 0,
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: 10,
  },
});

assert.equal(requests.length, 1);
assert.equal(
  requests[0].url,
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
);
assert.equal(requests[0].init.method, 'POST');
assert.equal(requests[0].init.headers['Content-Type'], 'application/json');
assert.equal(requests[0].init.headers['x-goog-api-key'], 'test-gemini-credential');

const sentBody = JSON.parse(requests[0].init.body);
assert.equal(sentBody.store, false);
assert.deepEqual(sentBody.systemInstruction, {
  parts: [{ text: 'Be concise.' }],
});
assert.deepEqual(sentBody.contents, [
  { role: 'user', parts: [{ text: 'Say hello.' }] },
  { role: 'model', parts: [{ text: 'Earlier assistant message.' }] },
  { role: 'user', parts: [{ text: 'Continue.' }] },
]);
assert.deepEqual(sentBody.generationConfig, {
  temperature: 0.4,
  maxOutputTokens: 64,
});

const customModelProvider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  defaultModelId: 'gemini-3.8-flash-2026-09',
  fetchImpl: async () => response(200, {
    candidates: [{
      content: { parts: [{ text: 'ok' }] },
      finishReason: 'STOP',
    }],
  }),
});
assert.equal(
  customModelProvider.definition.defaultModelId,
  'gemini-3.8-flash-2026-09',
);
assert.ok(
  customModelProvider.definition.models
    .some(model => model.id === 'gemini-3.8-flash-2026-09'),
);

const lengthProvider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  fetchImpl: async () => response(200, {
    candidates: [{
      content: { parts: [{ text: 'partial' }] },
      finishReason: 'MAX_TOKENS',
    }],
  }),
});
assert.deepEqual(
  await lengthProvider.generateText({
    modelId: 'gemini-3.8-flash',
    messages: [{ role: 'user', content: 'long answer' }],
  }),
  { text: 'partial', finishReason: 'length' },
);

const blockedPromptProvider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  fetchImpl: async () => response(200, {
    promptFeedback: { blockReason: 'SAFETY' },
  }),
});
assert.deepEqual(
  await blockedPromptProvider.generateText({
    modelId: 'gemini-3.8-flash',
    messages: [{ role: 'user', content: 'blocked' }],
  }),
  { text: '', finishReason: 'content_filter' },
);

const blockedCandidateProvider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  fetchImpl: async () => response(200, {
    candidates: [{
      content: { parts: [] },
      finishReason: 'SAFETY',
    }],
  }),
});
assert.deepEqual(
  await blockedCandidateProvider.generateText({
    modelId: 'gemini-3.8-flash',
    messages: [{ role: 'user', content: 'blocked output' }],
  }),
  { text: '', finishReason: 'content_filter' },
);

for (const [status, code] of [
  [401, 'AUTHENTICATION_FAILED'],
  [429, 'RATE_LIMITED'],
  [504, 'UPSTREAM_TIMEOUT'],
  [503, 'UPSTREAM_UNAVAILABLE'],
  [400, 'UPSTREAM_REJECTED'],
]) {
  const failingProvider = new GeminiProvider({
    apiKey: 'test-gemini-credential',
    fetchImpl: async () => response(status, { error: { message: 'ignored' } }),
  });
  await assert.rejects(
    () => failingProvider.generateText({
      modelId: 'gemini-3.8-flash',
      messages: [{ role: 'user', content: 'hello' }],
    }),
    error => assertExecutionCode(error, code),
  );
}

const malformedProvider = new GeminiProvider({
  apiKey: 'test-gemini-credential',
  fetchImpl: async () => response(200, { candidates: [] }),
});
await assert.rejects(
  () => malformedProvider.generateText({
    modelId: 'gemini-3.8-flash',
    messages: [{ role: 'user', content: 'hello' }],
  }),
  error => assertExecutionCode(error, 'INVALID_RESPONSE'),
);

await assert.rejects(
  () => provider.generateText({
    modelId: 'gemini-3.8-flash',
    messages: [{ role: 'system', content: 'system only' }],
  }),
  error => assertExecutionCode(error, 'INVALID_REQUEST'),
);

const noKeyRegistry = new AiProviderRegistry();
const noKeyRegistrar = new GeminiProviderRegistrar(
  { get: () => undefined },
  noKeyRegistry,
);
noKeyRegistrar.onModuleInit();
assert.equal(noKeyRegistry.list().length, 0);

const configuredRegistry = new AiProviderRegistry();
const configuredRegistrar = new GeminiProviderRegistrar(
  {
    get: key => (
      key === 'GEMINI_API_KEY'
        ? 'test-gemini-credential'
        : key === 'GEMINI_MODEL'
          ? 'gemini-3.5-flash'
          : undefined
    ),
  },
  configuredRegistry,
);
configuredRegistrar.onModuleInit();
assert.equal(configuredRegistry.list().length, 1);
assert.equal(
  configuredRegistry.get('gemini').definition.defaultModelId,
  'gemini-3.5-flash',
);

console.log('Gemini Provider model catalog and configurable default: PASS');
console.log('generateContent maps system/history/generation config/store=false: PASS');
console.log('candidate text and finish-reason normalization: PASS');
console.log('usageMetadata normalizes cached/thinking tokens for accounting: PASS');
console.log('prompt/candidate safety blocking maps to content_filter: PASS');
console.log('upstream failures are typed without raw error leakage: PASS');
console.log('GEMINI_API_KEY-gated Provider registration: PASS');
console.log('S5.1 Gemini Provider regression: PASS');
