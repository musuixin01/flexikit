import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const { AiModelRouter } = require('../dist/ai/ai-model-router.js');
const { AiService } = require('../dist/ai/ai.service.js');
const { AiController } = require('../dist/ai/ai.controller.js');
const {
  AiProviderRegistrationError,
  AiRoutingError,
} = require('../dist/ai/ai-provider.errors.js');

function createProvider(id, models, defaultModelId = models[0].id) {
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
  return {
    definition: {
      id,
      displayName: id.toUpperCase(),
      defaultModelId,
      models: models.map(model => ({
        ...model,
        capabilities: model.capabilities ?? capabilities,
      })),
    },
    async generateText(request) {
      return {
        text: `${id}:${request.modelId}:${request.messages.at(-1)?.content ?? ''}`,
        finishReason: 'stop',
      };
    },
  };
}

function assertThrowsCode(fn, ErrorType, code) {
  assert.throws(fn, error => (
    error instanceof ErrorType
    && error.code === code
  ));
}

const emptyRegistry = new AiProviderRegistry();
const emptyRouter = new AiModelRouter(emptyRegistry);
assertThrowsCode(
  () => emptyRouter.resolve(),
  AiRoutingError,
  'NO_PROVIDER_AVAILABLE',
);

const registry = new AiProviderRegistry();
const openai = createProvider('openai', [
  { id: 'gpt-default', displayName: 'GPT Default' },
  { id: 'gpt-fast', displayName: 'GPT Fast' },
]);
const gemini = createProvider('gemini', [
  { id: 'gemini-default', displayName: 'Gemini Default' },
]);

registry.register(openai);
registry.register(gemini);

assertThrowsCode(
  () => registry.register(openai),
  AiProviderRegistrationError,
  'DUPLICATE_PROVIDER',
);
assertThrowsCode(
  () => registry.register(createProvider('Bad_ID', [{ id: 'x', displayName: 'X' }])),
  AiProviderRegistrationError,
  'INVALID_PROVIDER_ID',
);
assertThrowsCode(
  () => registry.register(createProvider(
    'broken',
    [{ id: 'only', displayName: 'Only' }],
    'missing',
  )),
  AiProviderRegistrationError,
  'INVALID_PROVIDER_DEFINITION',
);
assertThrowsCode(
  () => registry.register(createProvider('invalid-capability', [{
    id: 'invalid',
    displayName: 'Invalid',
    capabilities: {
      native: {
        ...openai.definition.models[0].capabilities.native,
        vision: 'unsupported',
      },
      adapter: {
        ...openai.definition.models[0].capabilities.adapter,
        vision: true,
      },
    },
  }])),
  AiProviderRegistrationError,
  'INVALID_PROVIDER_DEFINITION',
);

const catalog = registry.catalog();
assert.deepEqual(catalog.map(provider => provider.id), ['openai', 'gemini']);
assert.equal(catalog[0].defaultModelId, 'gpt-default');
assert.notEqual(catalog[0].models, openai.definition.models);
const mutableCatalog = registry.catalog();
mutableCatalog[0].models[0].capabilities.native.vision = 'unknown';
assert.equal(
  openai.definition.models[0].capabilities.native.vision,
  'unsupported',
);
assertThrowsCode(
  () => registry.register({
    definition: {
      id: 'missing-capabilities',
      displayName: 'Missing Capabilities',
      defaultModelId: 'missing-capabilities-model',
      models: [{
        id: 'missing-capabilities-model',
        displayName: 'Missing Capabilities Model',
      }],
    },
    async generateText() {
      return { text: 'unused' };
    },
  }),
  AiProviderRegistrationError,
  'INVALID_PROVIDER_DEFINITION',
);

const router = new AiModelRouter(registry);
assert.equal(router.resolve().provider.definition.id, 'openai');
assert.equal(router.resolve().modelId, 'gpt-default');
assert.equal(
  router.resolve({ providerId: 'openai', modelId: 'gpt-fast' }).modelId,
  'gpt-fast',
);
assertThrowsCode(
  () => router.resolve({ providerId: 'missing' }),
  AiRoutingError,
  'PROVIDER_NOT_FOUND',
);
assertThrowsCode(
  () => router.resolve({ providerId: 'gemini', modelId: 'gpt-fast' }),
  AiRoutingError,
  'MODEL_NOT_FOUND',
);

const service = new AiService(registry, router);
assert.deepEqual(service.getProviderCatalog(), { providers: catalog });
const controller = new AiController(service);
assert.deepEqual(controller.getProviders(), { providers: catalog });
const generated = await service.generateText(
  { messages: [{ role: 'user', content: 'hello' }] },
  { providerId: 'openai', modelId: 'gpt-fast' },
);
assert.deepEqual(generated, {
  text: 'openai:gpt-fast:hello',
  finishReason: 'stop',
  providerId: 'openai',
  modelId: 'gpt-fast',
});

console.log('provider definition validation and duplicate protection: PASS');
console.log('capability schema validation rejects impossible adapter/native combinations: PASS');
console.log('deterministic default/explicit provider-model routing: PASS');
console.log('missing provider/model fail closed with typed domain errors: PASS');
console.log('provider catalog returns defensive model metadata copies: PASS');
console.log('AI controller exposes the same normalized provider catalog: PASS');
console.log('normalized generateText delegates through the selected route: PASS');
console.log('S5.1 AI Provider abstraction regression: PASS');
