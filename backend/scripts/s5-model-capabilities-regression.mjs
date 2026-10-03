import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AI_MODEL_CAPABILITY_KEYS,
} = require('../dist/ai/contracts/ai-provider.js');
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const { AiByokProviderFactory } = require('../dist/ai/ai-byok-provider.factory.js');
const { OpenAiProvider } = require('../dist/ai/providers/openai.provider.js');
const { GeminiProvider } = require('../dist/ai/providers/gemini.provider.js');
const { AnthropicProvider } = require('../dist/ai/providers/anthropic.provider.js');

function getModel(provider, modelId) {
  const model = provider.definition.models.find(item => item.id === modelId);
  assert.ok(model, `missing model ${modelId}`);
  return model;
}

function assertCompleteCapabilityProfile(model) {
  assert.deepEqual(
    Object.keys(model.capabilities.native).sort(),
    [...AI_MODEL_CAPABILITY_KEYS].sort(),
  );
  assert.deepEqual(
    Object.keys(model.capabilities.adapter).sort(),
    [...AI_MODEL_CAPABILITY_KEYS].sort(),
  );
  for (const key of AI_MODEL_CAPABILITY_KEYS) {
    assert.ok([
      'supported',
      'conditional',
      'unsupported',
      'unknown',
    ].includes(model.capabilities.native[key]));
    assert.equal(typeof model.capabilities.adapter[key], 'boolean');
  }
}

const openai = new OpenAiProvider({ apiKey: 'capability-test-openai' });
const astra = getModel(openai, 'gpt-6-astra');
const sol = getModel(openai, 'gpt-6-sol');
const luna = getModel(openai, 'gpt-6-luna');

for (const model of [astra, sol, luna]) {
  assertCompleteCapabilityProfile(model);
  assert.equal(model.capabilities.native.vision, 'supported');
  assert.equal(model.capabilities.native.streaming, 'supported');
  assert.equal(model.capabilities.native.toolCalling, 'supported');
  assert.equal(model.capabilities.native.structuredOutput, 'supported');
  assert.equal(model.capabilities.native.reasoningControl, 'supported');
  assert.equal(model.capabilities.adapter.textGeneration, true);
  assert.equal(model.capabilities.adapter.maxOutputTokens, true);
  assert.equal(model.capabilities.adapter.vision, false);
  assert.equal(model.capabilities.adapter.streaming, false);
  assert.equal(model.capabilities.adapter.toolCalling, false);
  assert.equal(model.capabilities.adapter.structuredOutput, false);
  assert.equal(model.capabilities.adapter.reasoningControl, false);
  assert.equal(model.capabilities.adapter.temperature, false);
}
assert.equal(astra.capabilities.native.temperature, 'unsupported');
assert.equal(sol.capabilities.native.temperature, 'conditional');
assert.equal(luna.capabilities.native.temperature, 'conditional');
assert.deepEqual(astra.capabilities.reasoningControls, [{
  kind: 'effort',
  values: ['low', 'medium', 'high', 'xhigh', 'max'],
}]);
assert.deepEqual(sol.capabilities.reasoningControls, [{
  kind: 'effort',
  values: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
}]);

const gemini = new GeminiProvider({ apiKey: 'capability-test-gemini' });
const gemini38 = getModel(gemini, 'gemini-3.8-flash');
const gemini35 = getModel(gemini, 'gemini-3.5-flash');
const gemini35Lite = getModel(gemini, 'gemini-3.5-flash-lite');

for (const model of [gemini38, gemini35, gemini35Lite]) {
  assertCompleteCapabilityProfile(model);
  for (const key of AI_MODEL_CAPABILITY_KEYS) {
    assert.equal(model.capabilities.native[key], 'supported');
  }
  assert.equal(model.capabilities.adapter.textGeneration, true);
  assert.equal(model.capabilities.adapter.temperature, true);
  assert.equal(model.capabilities.adapter.maxOutputTokens, true);
  assert.equal(model.capabilities.adapter.vision, false);
  assert.equal(model.capabilities.adapter.streaming, false);
  assert.equal(model.capabilities.adapter.toolCalling, false);
  assert.equal(model.capabilities.adapter.structuredOutput, false);
  assert.equal(model.capabilities.adapter.reasoningControl, false);
}
assert.deepEqual(gemini38.capabilities.reasoningControls, [{
  kind: 'thinking-level',
  values: ['low', 'medium', 'high'],
}]);
assert.deepEqual(gemini35.capabilities.reasoningControls[0].values, [
  'minimal',
  'low',
  'medium',
  'high',
]);

const anthropic = new AnthropicProvider({ apiKey: 'capability-test-anthropic' });
const sonnet = getModel(anthropic, 'claude-sonnet-5');
const opus = getModel(anthropic, 'claude-opus-5');
const fable = getModel(anthropic, 'claude-fable-5');
const haiku = getModel(anthropic, 'claude-haiku-4-5-20251001');

for (const model of [sonnet, opus, fable, haiku]) {
  assertCompleteCapabilityProfile(model);
  assert.equal(model.capabilities.native.vision, 'supported');
  assert.equal(model.capabilities.native.streaming, 'supported');
  assert.equal(model.capabilities.native.toolCalling, 'supported');
  assert.equal(model.capabilities.native.structuredOutput, 'supported');
  assert.equal(model.capabilities.native.reasoningControl, 'supported');
  assert.equal(model.capabilities.adapter.textGeneration, true);
  assert.equal(model.capabilities.adapter.maxOutputTokens, true);
  assert.equal(model.capabilities.adapter.reasoningControl, false);
  assert.equal(model.capabilities.adapter.temperature, false);
}
for (const model of [sonnet, opus, fable]) {
  assert.equal(model.capabilities.native.temperature, 'unsupported');
  assert.deepEqual(model.capabilities.reasoningControls, [{ kind: 'effort' }]);
}
assert.equal(haiku.capabilities.native.temperature, 'supported');
assert.deepEqual(haiku.capabilities.reasoningControls, [{ kind: 'manual-budget' }]);

for (const [Provider, options, adapterExpected] of [
  [OpenAiProvider, { apiKey: 'custom', defaultModelId: 'custom-openai-model' }, ['textGeneration', 'maxOutputTokens']],
  [GeminiProvider, { apiKey: 'custom', defaultModelId: 'custom-gemini-model' }, ['textGeneration', 'temperature', 'maxOutputTokens']],
  [AnthropicProvider, { apiKey: 'custom', defaultModelId: 'custom-anthropic-model' }, ['textGeneration', 'maxOutputTokens']],
]) {
  const provider = new Provider(options);
  const model = getModel(provider, provider.definition.defaultModelId);
  assertCompleteCapabilityProfile(model);
  for (const key of AI_MODEL_CAPABILITY_KEYS) {
    assert.equal(model.capabilities.native[key], 'unknown');
    assert.equal(
      model.capabilities.adapter[key],
      adapterExpected.includes(key),
    );
  }
}

const registry = new AiProviderRegistry();
registry.register(openai);
const catalog = registry.catalog();
catalog[0].models[0].capabilities.native.vision = 'unknown';
catalog[0].models[0].capabilities.adapter.vision = true;
catalog[0].models[0].capabilities.reasoningControls[0].values[0] = 'mutated';
assert.equal(astra.capabilities.native.vision, 'supported');
assert.equal(astra.capabilities.adapter.vision, false);
assert.equal(astra.capabilities.reasoningControls[0].values[0], 'low');

const byokCatalog = new AiByokProviderFactory().getCatalog();
assert.deepEqual(
  byokCatalog.providers.map(provider => provider.id),
  ['openai', 'gemini', 'anthropic'],
);
assert.equal(
  byokCatalog.providers
    .find(provider => provider.id === 'openai')
    .models
    .find(model => model.id === 'gpt-6-sol')
    .capabilities.native.temperature,
  'conditional',
);

console.log('all model capability profiles expose the complete normalized key set: PASS');
console.log('OpenAI GPT-6 native/adapter capability and reasoning differences: PASS');
console.log('Gemini 3.8/3.5 native capabilities and thinking-level metadata: PASS');
console.log('Claude 5/Haiku 4.5 thinking and temperature generation differences: PASS');
console.log('custom model overrides fail safe to unknown native capabilities: PASS');
console.log('registry and BYOK catalogs deep-copy nested capability metadata: PASS');
console.log('S5.1 model capability labels regression: PASS');
