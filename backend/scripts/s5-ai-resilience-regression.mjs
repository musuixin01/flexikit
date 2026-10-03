import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const { AiModelRouter } = require('../dist/ai/ai-model-router.js');
const {
  AiProviderExecutionError,
} = require('../dist/ai/ai-provider.errors.js');
const {
  AiResiliencePolicy,
  retryAfterMsFromHeaders,
} = require('../dist/ai/ai-resilience.js');
const { AiService } = require('../dist/ai/ai.service.js');
const { OpenAiProvider } = require('../dist/ai/providers/openai.provider.js');
const { GeminiProvider } = require('../dist/ai/providers/gemini.provider.js');
const {
  AnthropicProvider,
} = require('../dist/ai/providers/anthropic.provider.js');

const capabilities = {
  native: {
    textGeneration: 'supported',
    vision: 'unsupported',
    streaming: 'unsupported',
    toolCalling: 'unsupported',
    structuredOutput: 'unsupported',
    reasoningControl: 'unsupported',
    temperature: 'unsupported',
    maxOutputTokens: 'supported',
  },
  adapter: {
    textGeneration: true,
    vision: false,
    streaming: false,
    toolCalling: false,
    structuredOutput: false,
    reasoningControl: false,
    temperature: false,
    maxOutputTokens: true,
  },
};

const measuredUsage = {
  inputTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  cachedInputTokens: 0,
  cacheWriteInputTokens: 0,
  cacheWrite5mInputTokens: 0,
  cacheWrite1hInputTokens: 0,
  reasoningTokens: 0,
};

function provider(id, modelId, generateText) {
  return {
    definition: {
      id,
      displayName: id,
      defaultModelId: modelId,
      models: [{
        id: modelId,
        displayName: modelId,
        capabilities,
      }],
    },
    generateText,
  };
}

function success(text = 'ok') {
  return {
    text,
    finishReason: 'stop',
    usage: measuredUsage,
  };
}

function executionError(
  providerId,
  code = 'UPSTREAM_UNAVAILABLE',
  retryAfterMs,
) {
  return new AiProviderExecutionError(
    code,
    'safe test error',
    providerId,
    undefined,
    retryAfterMs,
  );
}

function policyFixture(config = {}) {
  let now = 0;
  const sleeps = [];
  const policy = AiResiliencePolicy.createForTesting(
    {
      attemptTimeoutMs: 1_000,
      totalTimeoutMs: 10_000,
      maxAttemptsPerProvider: 3,
      retryBaseDelayMs: 100,
      retryMaxDelayMs: 1_000,
      fallbackEnabled: true,
      ...config,
    },
    {
      now: () => now,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
        now += milliseconds;
      },
      random: () => 0.5,
    },
  );
  return { policy, sleeps, now: () => now };
}

function serviceFixture({
  providers,
  policy,
  usageRecords = [],
  byokFactory,
}) {
  const registry = new AiProviderRegistry();
  for (const item of providers) registry.register(item);
  const router = new AiModelRouter(registry);
  const usageRecorder = {
    async record(value) {
      usageRecords.push(value);
    },
  };
  return {
    registry,
    service: new AiService(
      registry,
      router,
      byokFactory,
      usageRecorder,
      policy,
    ),
  };
}

function assertExecutionCode(error, code) {
  return error instanceof AiProviderExecutionError && error.code === code;
}

assert.equal(
  retryAfterMsFromHeaders(new Headers({ 'Retry-After': '2' }), 0),
  2_000,
);
assert.equal(
  retryAfterMsFromHeaders(new Headers({ 'Retry-After': 'invalid' }), 0),
  undefined,
);

for (const [ProviderClass, modelId] of [
  [OpenAiProvider, 'gpt-6-sol'],
  [GeminiProvider, 'gemini-3.8-flash'],
  [AnthropicProvider, 'claude-sonnet-5'],
]) {
  let forwardedSignal;
  const instance = new ProviderClass({
    apiKey: 'resilience-test-key',
    fetchImpl: async (_url, init) => {
      forwardedSignal = init.signal;
      return new Response(JSON.stringify({ error: { type: 'rate_limit' } }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '2',
        },
      });
    },
  });
  const controller = new AbortController();
  await assert.rejects(
    () => instance.generateText({
      modelId,
      messages: [{ role: 'user', content: 'hello' }],
      signal: controller.signal,
    }),
    error => (
      assertExecutionCode(error, 'RATE_LIMITED')
      && error.retryAfterMs === 2_000
    ),
  );
  assert.equal(forwardedSignal, controller.signal);
}

{
  const { policy } = policyFixture({
    retryBaseDelayMs: 0,
  });
  let openAiCalls = 0;
  let geminiCalls = 0;
  const quotaOpenAi = new OpenAiProvider({
    apiKey: 'resilience-test-key',
    fetchImpl: async () => {
      openAiCalls += 1;
      return new Response(JSON.stringify({
        error: {
          code: 'project_spend_limit_exceeded',
          type: 'insufficient_quota',
          message: 'raw billing detail',
        },
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  const gemini = provider('gemini', 'gemini-model', async () => {
    geminiCalls += 1;
    return success('must-not-fallback');
  });
  const { service } = serviceFixture({
    providers: [quotaOpenAi, gemini],
    policy,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
    ),
    error => (
      assertExecutionCode(error, 'UPSTREAM_REJECTED')
      && !error.message.includes('raw billing detail')
    ),
  );
  assert.equal(openAiCalls, 1);
  assert.equal(geminiCalls, 0);
}

{
  const { policy, sleeps } = policyFixture();
  let calls = 0;
  const usageRecords = [];
  const openai = provider('openai', 'openai-model', async () => {
    calls += 1;
    if (calls === 1) throw executionError('openai');
    return success('retried');
  });
  const { service } = serviceFixture({
    providers: [openai],
    policy,
    usageRecords,
  });
  const result = await service.generateText(
    { messages: [{ role: 'user', content: 'hello' }] },
    { providerId: 'openai' },
    undefined,
    { userId: 7 },
  );
  assert.equal(result.text, 'retried');
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [100]);
  assert.equal(usageRecords.length, 1);
  assert.equal(usageRecords[0].providerId, 'openai');
}

{
  const { policy, sleeps } = policyFixture();
  let calls = 0;
  const rateLimited = provider('openai', 'openai-model', async () => {
    calls += 1;
    if (calls === 1) {
      throw executionError('openai', 'RATE_LIMITED', 250);
    }
    return success('retry-after');
  });
  const { service } = serviceFixture({
    providers: [rateLimited],
    policy,
  });
  const result = await service.generateText(
    { messages: [{ role: 'user', content: 'hello' }] },
    { providerId: 'openai' },
  );
  assert.equal(result.text, 'retry-after');
  assert.deepEqual(sleeps, [250]);
}

{
  const { policy, sleeps } = policyFixture();
  let calls = 0;
  const unauthorized = provider('openai', 'openai-model', async () => {
    calls += 1;
    throw executionError('openai', 'AUTHENTICATION_FAILED');
  });
  const { service } = serviceFixture({
    providers: [unauthorized],
    policy,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      { providerId: 'openai' },
    ),
    error => assertExecutionCode(error, 'AUTHENTICATION_FAILED'),
  );
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
}

{
  const { policy, sleeps } = policyFixture({
    totalTimeoutMs: 400,
    maxAttemptsPerProvider: 3,
  });
  let calls = 0;
  const rateLimited = provider('openai', 'openai-model', async () => {
    calls += 1;
    throw executionError('openai', 'RATE_LIMITED', 500);
  });
  const { service } = serviceFixture({
    providers: [rateLimited],
    policy,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      { providerId: 'openai' },
    ),
    error => assertExecutionCode(error, 'RATE_LIMITED'),
  );
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
}

{
  const { policy, sleeps } = policyFixture({
    maxAttemptsPerProvider: 2,
    retryBaseDelayMs: 25,
  });
  const callOrder = [];
  const usageRecords = [];
  const openai = provider('openai', 'openai-model', async () => {
    callOrder.push('openai');
    throw executionError('openai');
  });
  const gemini = provider('gemini', 'gemini-model', async () => {
    callOrder.push('gemini');
    return success('fallback');
  });
  const { service } = serviceFixture({
    providers: [openai, gemini],
    policy,
    usageRecords,
  });
  const result = await service.generateText(
    { messages: [{ role: 'user', content: 'hello' }] },
  );
  assert.equal(result.providerId, 'gemini');
  assert.deepEqual(callOrder, ['openai', 'openai', 'gemini']);
  assert.deepEqual(sleeps, [25]);
  assert.equal(usageRecords.length, 1);
  assert.equal(usageRecords[0].providerId, 'gemini');
}

for (const target of [
  { providerId: 'openai' },
  { modelId: 'openai-model' },
]) {
  const { policy } = policyFixture({
    maxAttemptsPerProvider: 2,
    retryBaseDelayMs: 0,
  });
  let openAiCalls = 0;
  let geminiCalls = 0;
  const openai = provider('openai', 'openai-model', async () => {
    openAiCalls += 1;
    throw executionError('openai');
  });
  const gemini = provider('gemini', 'gemini-model', async () => {
    geminiCalls += 1;
    return success('must-not-fallback');
  });
  const { service } = serviceFixture({
    providers: [openai, gemini],
    policy,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      target,
    ),
    error => assertExecutionCode(error, 'UPSTREAM_UNAVAILABLE'),
  );
  assert.equal(openAiCalls, 2);
  assert.equal(geminiCalls, 0);
}

{
  const { policy } = policyFixture({
    maxAttemptsPerProvider: 2,
    retryBaseDelayMs: 0,
  });
  let byokCalls = 0;
  let platformCalls = 0;
  const byokProvider = provider('openai', 'openai-model', async () => {
    byokCalls += 1;
    throw executionError('openai');
  });
  const platformGemini = provider('gemini', 'gemini-model', async () => {
    platformCalls += 1;
    return success('platform-fallback-must-not-run');
  });
  const byokFactory = {
    create() {
      return byokProvider;
    },
    getCatalog() {
      return { providers: [] };
    },
  };
  const { service } = serviceFixture({
    providers: [platformGemini],
    policy,
    byokFactory,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      { providerId: 'openai', modelId: 'openai-model' },
      { apiKey: 'temporary-test-key' },
    ),
    error => assertExecutionCode(error, 'UPSTREAM_UNAVAILABLE'),
  );
  assert.equal(byokCalls, 2);
  assert.equal(platformCalls, 0);
}

{
  const { policy } = policyFixture({
    attemptTimeoutMs: 15,
    totalTimeoutMs: 100,
    maxAttemptsPerProvider: 1,
  });
  let aborted = false;
  const hanging = provider('openai', 'openai-model', async (request) => (
    new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('raw abort must be normalized'));
      }, { once: true });
    })
  ));
  const { service } = serviceFixture({
    providers: [hanging],
    policy,
  });
  await assert.rejects(
    () => service.generateText(
      { messages: [{ role: 'user', content: 'hello' }] },
      { providerId: 'openai' },
    ),
    error => assertExecutionCode(error, 'UPSTREAM_TIMEOUT'),
  );
  assert.equal(aborted, true);
}

console.log('Retry-After parsing and AbortSignal forwarding across all Providers: PASS');
console.log('OpenAI billing/quota 429 fails closed without retry or fallback: PASS');
console.log('transient failures retry with bounded exponential backoff: PASS');
console.log('Retry-After overrides local backoff without exceeding total budget: PASS');
console.log('authentication and other non-transient errors fail closed immediately: PASS');
console.log('implicit platform routing falls back only after transient retry exhaustion: PASS');
console.log('explicit Provider/model and BYOK never cross Provider boundaries: PASS');
console.log('attempt timeout aborts in-flight work and normalizes raw abort failures: PASS');
console.log('usage accounting records only the final successful routed result once: PASS');
console.log('S5.1 AI resilience regression: PASS');
