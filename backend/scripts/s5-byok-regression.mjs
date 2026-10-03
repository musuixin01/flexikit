import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AiProviderRegistry } = require('../dist/ai/ai-provider.registry.js');
const { AiModelRouter } = require('../dist/ai/ai-model-router.js');
const { AiByokProviderFactory } = require('../dist/ai/ai-byok-provider.factory.js');
const { AiProviderExecutionError } = require('../dist/ai/ai-provider.errors.js');
const { AiService } = require('../dist/ai/ai.service.js');
const { AiController } = require('../dist/ai/ai.controller.js');

function assertExecutionCode(error, code) {
  return error instanceof AiProviderExecutionError && error.code === code;
}

const factory = new AiByokProviderFactory();
const catalog = factory.getCatalog();

assert.deepEqual(
  catalog.providers.map(provider => provider.id),
  ['openai', 'gemini', 'anthropic'],
);
assert.equal(JSON.stringify(catalog).includes('placeholder'), false);
assert.equal(JSON.stringify(catalog).includes('apiKey'), false);

const emptyRegistry = new AiProviderRegistry();
const router = new AiModelRouter(emptyRegistry);
const service = new AiService(emptyRegistry, router, factory);
const controller = new AiController(service);

assert.deepEqual(controller.getByokProviders(), catalog);
assert.equal(emptyRegistry.list().length, 0);

assert.throws(
  () => factory.create('unsupported-provider', 'temporary-user-key'),
  error => assertExecutionCode(error, 'INVALID_REQUEST'),
);

await assert.rejects(
  () => service.generateText(
    { messages: [{ role: 'user', content: 'hello' }] },
    {},
    { apiKey: 'temporary-user-key' },
  ),
  error => assertExecutionCode(error, 'INVALID_REQUEST'),
);

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, init) => {
  requests.push({ url: String(url), init });
  return new Response(JSON.stringify({
    status: 'completed',
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: 'BYOK works' }],
    }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  const byokKey = 'temporary-user-key-not-persisted';
  const result = await service.generateText(
    { messages: [{ role: 'user', content: 'hello' }] },
    { providerId: 'openai', modelId: 'gpt-6-sol' },
    { apiKey: byokKey },
  );

  assert.deepEqual(result, {
    text: 'BYOK works',
    finishReason: 'stop',
    providerId: 'openai',
    modelId: 'gpt-6-sol',
  });
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].init.headers.Authorization,
    `Bearer ${byokKey}`,
  );
  assert.equal(JSON.stringify(result).includes(byokKey), false);
  assert.equal(JSON.stringify(service.getByokProviderCatalog()).includes(byokKey), false);
  assert.equal(emptyRegistry.list().length, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('BYOK catalog exposes supported providers without credentials: PASS');
console.log('BYOK requires an explicit supported Provider: PASS');
console.log('BYOK creates an ephemeral Provider without registry mutation: PASS');
console.log('BYOK credential reaches only the transient upstream request: PASS');
console.log('BYOK result/catalog never echo the raw credential: PASS');
console.log('S5.1 BYOK backend regression: PASS');
