import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const { AiModelRouter } = require('../dist/ai/ai-model-router.js');
const { AiService } = require('../dist/ai/ai.service.js');
const { AiUsageService } = require('../dist/ai/ai-usage.service.js');
const {
  AI_PRICING_CATALOG_VERSION,
  estimateAiUsageCost,
} = require('../dist/ai/ai-usage-pricing.js');

const baseUsage = {
  inputTokens: 120,
  outputTokens: 30,
  totalTokens: 150,
  cachedInputTokens: 20,
  cacheWriteInputTokens: 10,
  cacheWrite5mInputTokens: 0,
  cacheWrite1hInputTokens: 0,
  reasoningTokens: 8,
};

const openAiCost = estimateAiUsageCost(
  'openai',
  'gpt-6-sol',
  baseUsage,
  new Date('2026-09-27T00:00:00.000Z'),
);
assert.equal(openAiCost.status, 'estimated');
assert.equal(openAiCost.estimatedCostUsd, '0.000509000000');
assert.equal(openAiCost.catalogVersion, AI_PRICING_CATALOG_VERSION);
assert.equal(openAiCost.scope, 'token-request-only');

const longContextCost = estimateAiUsageCost(
  'openai',
  'gpt-6-sol',
  {
    ...baseUsage,
    inputTokens: 272001,
    outputTokens: 100,
    totalTokens: 272101,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    reasoningTokens: 0,
  },
  new Date('2026-09-27T00:00:00.000Z'),
);
assert.equal(longContextCost.estimatedCostUsd, '1.089504000000');

const geminiCost = estimateAiUsageCost(
  'gemini',
  'gemini-3.8-flash',
  {
    ...baseUsage,
    inputTokens: 100,
    outputTokens: 40,
    totalTokens: 140,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 0,
    reasoningTokens: 10,
  },
  new Date('2026-09-27T00:00:00.000Z'),
);
assert.equal(geminiCost.estimatedCostUsd, '0.000211500000');
assert.equal(geminiCost.validThrough, '2026-12-31');
assert.equal(
  estimateAiUsageCost(
    'gemini',
    'gemini-3.8-flash',
    baseUsage,
    new Date('2027-01-01T00:00:00.000Z'),
  ).status,
  'unpriced',
);

const anthropicCost = estimateAiUsageCost(
  'anthropic',
  'claude-sonnet-5',
  {
    ...baseUsage,
    inputTokens: 90,
    outputTokens: 30,
    totalTokens: 120,
    cachedInputTokens: 20,
    cacheWriteInputTokens: 10,
    cacheWrite5mInputTokens: 10,
    cacheWrite1hInputTokens: 0,
  },
  new Date('2026-09-27T00:00:00.000Z'),
);
assert.equal(anthropicCost.estimatedCostUsd, '0.000449000000');

assert.equal(
  estimateAiUsageCost(
    'anthropic',
    'claude-sonnet-5',
    {
      ...baseUsage,
      inputTokens: 90,
      cachedInputTokens: 20,
      cacheWriteInputTokens: 10,
      cacheWrite5mInputTokens: 0,
      cacheWrite1hInputTokens: 0,
    },
  ).status,
  'unpriced',
);
assert.equal(
  estimateAiUsageCost('openai', 'custom-model', baseUsage).status,
  'unpriced',
);

const inserts = [];
const usageRepository = {
  async insert(value) {
    inserts.push(value);
    return { identifiers: [] };
  },
};
const usageService = new AiUsageService(usageRepository);
await usageService.record({
  userId: 42,
  providerId: 'openai',
  modelId: 'gpt-6-sol',
  billingMode: 'platform',
  usage: baseUsage,
  occurredAt: new Date('2026-09-27T01:02:03.000Z'),
});
await usageService.record({
  userId: 42,
  providerId: 'openai',
  modelId: 'custom-model',
  billingMode: 'byok',
  usage: baseUsage,
  occurredAt: new Date('2026-09-27T01:03:03.000Z'),
});
assert.equal(inserts[0].billingMode, 'platform');
assert.equal(inserts[0].estimatedCostPicoUsd, '509000000');
assert.equal(inserts[0].pricingSource, 'openai-api-pricing');
assert.equal(inserts[0].pricingEffectiveDate, '2026-09-27');
assert.equal(inserts[0].costScope, 'token-request-only');
assert.equal(inserts[1].billingMode, 'byok');
assert.equal(inserts[1].costStatus, 'unpriced');
assert.equal(inserts[1].estimatedCostPicoUsd, null);
const serializedInserts = JSON.stringify(inserts);
assert.equal(serializedInserts.includes('messages'), false);
assert.equal(serializedInserts.includes('apiKey'), false);
assert.equal(serializedInserts.includes('prompt'), false);

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

function measuredProvider(id, modelId) {
  return {
    definition: {
      id,
      displayName: id,
      defaultModelId: modelId,
      models: [{ id: modelId, displayName: modelId, capabilities }],
    },
    async generateText() {
      return {
        text: 'measured',
        finishReason: 'stop',
        usage: baseUsage,
      };
    },
  };
}

const recorded = [];
const recorder = {
  async record(value) {
    recorded.push(value);
  },
};
const registry = new AiProviderRegistry();
registry.register(measuredProvider('openai', 'gpt-6-sol'));
const router = new AiModelRouter(registry);
const byokProvider = measuredProvider('openai', 'gpt-6-sol');
const byokFactory = {
  create() {
    return byokProvider;
  },
  getCatalog() {
    return { providers: [] };
  },
};
const aiService = new AiService(registry, router, byokFactory, recorder);

await aiService.generateText(
  { messages: [{ role: 'user', content: 'server-owned usage only' }] },
  { providerId: 'openai', modelId: 'gpt-6-sol' },
  undefined,
  { userId: 77 },
);
await aiService.generateText(
  { messages: [{ role: 'user', content: 'byok request' }] },
  { providerId: 'openai', modelId: 'gpt-6-sol' },
  { apiKey: 'temporary-user-key' },
  { userId: 77 },
);
assert.equal(recorded.length, 2);
assert.equal(recorded[0].billingMode, 'platform');
assert.equal(recorded[0].userId, 77);
assert.equal(recorded[1].billingMode, 'byok');
assert.equal(recorded[1].userId, 77);
assert.equal(JSON.stringify(recorded).includes('temporary-user-key'), false);

console.log('official-versioned pricing uses exact pico-USD arithmetic: PASS');
console.log('OpenAI long-context pricing and Gemini expiry fail safe: PASS');
console.log('Anthropic cache-write pricing requires auditable 5m/1h classification: PASS');
console.log('unknown/custom models preserve usage while remaining unpriced: PASS');
console.log('usage events persist safe operational metadata without prompts/keys: PASS');
console.log('platform and BYOK routed calls are recorded with separate billing modes: PASS');
console.log('S5.1 AI usage and cost accounting regression: PASS');
