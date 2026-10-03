import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  EmbeddingProviderError,
  EmbeddingService,
} = require('../dist/embedding/embedding.service.js');
const {
  buildCanonicalToolEmbeddingSource,
  TOOL_EMBEDDING_DIMENSIONS,
  TOOL_EMBEDDING_MAX_BATCH_SIZE,
  TOOL_EMBEDDING_MAX_SOURCE_BYTES,
  TOOL_EMBEDDING_MODEL,
  TOOL_EMBEDDING_PROVIDER,
  TOOL_EMBEDDING_SOURCE_VERSION,
} = require('../dist/embedding/tool-embedding-source.js');
const {
  ToolEmbeddingPipelineService,
} = require('../dist/embedding/tool-embedding-pipeline.service.js');
const {
  AddToolEmbeddingProvenance1790611200000,
} = require('../dist/migration/1790611200000-AddToolEmbeddingProvenance.js');
const {
  estimateAiUsageCost,
} = require('../dist/ai/ai-usage-pricing.js');

const sourceA = buildCanonicalToolEmbeddingSource({
  name: '  Visual   Studio Code ',
  description: ' Developer\n editor ',
  tags: ['Editor', ' AI ', 'editor'],
  category: 'Development',
  url: 'https://code.example.com/private/path?token=must-not-leak',
  isLocal: false,
});
const sourceB = buildCanonicalToolEmbeddingSource({
  name: 'Visual Studio Code',
  description: 'Developer editor',
  tags: ['AI', 'Editor'],
  category: 'Development',
  url: 'https://code.example.com/another/path?secret=also-hidden',
  isLocal: false,
});
assert.equal(sourceA.hash, sourceB.hash);
assert.match(sourceA.text, /host:code\.example\.com/);
assert.equal(sourceA.text.includes('/private/path'), false);
assert.equal(sourceA.text.includes('must-not-leak'), false);
assert.equal(sourceA.text.includes('local_path'), false);

const localSource = buildCanonicalToolEmbeddingSource({
  name: 'Local IDE',
  description: 'Local development environment',
  tags: ['IDE'],
  category: 'Development',
  url: 'https://must-not-be-used.example/private',
  isLocal: true,
});
assert.match(localSource.text, /kind:local/);
assert.equal(localSource.text.includes('must-not-be-used.example'), false);

const boundedSource = buildCanonicalToolEmbeddingSource({
  name: 'Large description',
  description: '你'.repeat(10_000),
  isLocal: false,
});
assert.ok(
  Buffer.byteLength(boundedSource.text, 'utf8')
    <= TOOL_EMBEDDING_MAX_SOURCE_BYTES,
);

const vector0 = Array(TOOL_EMBEDDING_DIMENSIONS).fill(0.01);
const vector1 = Array(TOOL_EMBEDDING_DIMENSIONS).fill(0.02);
let fetchCalls = 0;
let requestBody;
const config = {
  get(key) {
    if (key === 'OPENAI_API_KEY') return 'server-test-key';
    if (key === 'EMBEDDING_TIMEOUT_MS') return '5000';
    return undefined;
  },
};
const embeddingService = new EmbeddingService(
  config,
  async (_url, init) => {
    fetchCalls += 1;
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      object: 'list',
      data: [
        { object: 'embedding', index: 1, embedding: vector1 },
        { object: 'embedding', index: 0, embedding: vector0 },
      ],
      model: TOOL_EMBEDDING_MODEL,
      usage: { prompt_tokens: 12, total_tokens: 12 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
);
const batchResult = await embeddingService.generateBatch([
  sourceA.text,
  localSource.text,
]);
assert.equal(fetchCalls, 1);
assert.equal(requestBody.model, TOOL_EMBEDDING_MODEL);
assert.equal(requestBody.dimensions, TOOL_EMBEDDING_DIMENSIONS);
assert.equal(requestBody.encoding_format, 'float');
assert.deepEqual(batchResult.vectors[0], vector0);
assert.deepEqual(batchResult.vectors[1], vector1);
assert.equal(batchResult.promptTokens, 12);

const missingKeyService = new EmbeddingService(
  { get() { return undefined; } },
  async () => {
    throw new Error('fetch must not run without a configured server key');
  },
);
await assert.rejects(
  () => missingKeyService.generateBatch([sourceA.text]),
  error => error instanceof EmbeddingProviderError
    && error.code === 'NOT_CONFIGURED',
);
await assert.rejects(
  () => embeddingService.generateBatch(
    Array(TOOL_EMBEDDING_MAX_BATCH_SIZE + 1).fill(sourceA.text),
  ),
  error => error instanceof EmbeddingProviderError
    && error.code === 'UPSTREAM_REJECTED',
);

const invalidVectorService = new EmbeddingService(
  config,
  async () => new Response(JSON.stringify({
    model: TOOL_EMBEDDING_MODEL,
    data: [{ index: 0, embedding: [1, 2, 3] }],
    usage: { prompt_tokens: 1, total_tokens: 1 },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
);
await assert.rejects(
  () => invalidVectorService.generateBatch([sourceA.text]),
  error => error instanceof EmbeddingProviderError
    && error.code === 'INVALID_RESPONSE',
);

const wrongModelService = new EmbeddingService(
  config,
  async () => new Response(JSON.stringify({
    model: 'text-embedding-unexpected',
    data: [{ index: 0, embedding: vector0 }],
    usage: { prompt_tokens: 1, total_tokens: 1 },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }),
);
await assert.rejects(
  () => wrongModelService.generateBatch([sourceA.text]),
  error => error instanceof EmbeddingProviderError
    && error.code === 'INVALID_RESPONSE',
);

const pricedEmbedding = estimateAiUsageCost(
  TOOL_EMBEDDING_PROVIDER,
  TOOL_EMBEDDING_MODEL,
  {
    inputTokens: 1000,
    outputTokens: 0,
    totalTokens: 1000,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: 0,
  },
  new Date('2026-09-28T00:00:00.000Z'),
);
assert.equal(pricedEmbedding.status, 'estimated');
assert.equal(pricedEmbedding.estimatedCostUsd, '0.000020000000');

function makeTool(id, source, provenance = {}) {
  return {
    id,
    user_id: null,
    name: source.name,
    url: source.url ?? '',
    description: source.description ?? null,
    tags: source.tags ?? [],
    category: source.category ?? null,
    local_path: source.isLocal ? 'C:\\private\\must-not-leak.exe' : null,
    embeddingProvider: provenance.provider ?? null,
    embeddingModel: provenance.model ?? null,
    embeddingDimensions: provenance.dimensions ?? null,
    embeddingSourceVersion: provenance.sourceVersion ?? null,
    embeddingSourceHash: provenance.sourceHash ?? null,
  };
}

const staleSourceInput = {
  name: 'Public stale tool',
  url: 'https://public.example.com/private/path',
  description: 'Useful public tool',
  tags: ['Utility'],
  category: 'Utilities',
  isLocal: false,
};
const currentSourceInput = {
  name: 'Public current tool',
  url: 'https://current.example.com',
  description: 'Already embedded',
  tags: ['Utility'],
  category: 'Utilities',
  isLocal: false,
};
const currentSource = buildCanonicalToolEmbeddingSource(currentSourceInput);
const staleTool = makeTool(1, staleSourceInput);
const currentTool = makeTool(2, currentSourceInput, {
  provider: TOOL_EMBEDDING_PROVIDER,
  model: TOOL_EMBEDDING_MODEL,
  dimensions: TOOL_EMBEDDING_DIMENSIONS,
  sourceVersion: TOOL_EMBEDDING_SOURCE_VERSION,
  sourceHash: currentSource.hash,
});

const queryCalls = [];
const queryBuilder = {
  addSelect(value) { queryCalls.push(['addSelect', value]); return this; },
  where(value) { queryCalls.push(['where', value]); return this; },
  andWhere(value) { queryCalls.push(['andWhere', value]); return this; },
  orderBy(value, direction) {
    queryCalls.push(['orderBy', value, direction]);
    return this;
  },
  take(value) { queryCalls.push(['take', value]); return this; },
  async getMany() { return [staleTool, currentTool]; },
};
const repository = {
  createQueryBuilder() { return queryBuilder; },
};
const writes = [];
const currentById = new Map([
  [1, staleTool],
]);
const dataSource = {
  async transaction(callback) {
    return callback({
      getRepository() {
        return {
          async findOne({ where }) {
            return currentById.get(where.id) ?? null;
          },
        };
      },
      async query(sql, params) {
        writes.push({ sql, params });
        return [];
      },
    });
  },
};
const embeddedInputs = [];
const pipelineEmbeddingService = {
  async generateBatch(inputs) {
    embeddedInputs.push(...inputs);
    return {
      vectors: inputs.map(() => vector0),
      modelId: TOOL_EMBEDDING_MODEL,
      providerId: TOOL_EMBEDDING_PROVIDER,
      promptTokens: 9,
    };
  },
};
const usageRecords = [];
const pipeline = new ToolEmbeddingPipelineService(
  repository,
  dataSource,
  pipelineEmbeddingService,
  {
    async record(value) {
      usageRecords.push(value);
    },
  },
);
const syncResult = await pipeline.syncStaleTools({ limit: 10 });
assert.equal(syncResult.scanned, 2);
assert.equal(syncResult.stale, 1);
assert.equal(syncResult.updated, 1);
assert.equal(syncResult.skippedChanged, 0);
assert.equal(syncResult.batches, 1);
assert.equal(syncResult.promptTokens, 9);
assert.equal(embeddedInputs.length, 1);
assert.equal(embeddedInputs[0].includes('/private/path'), false);
assert.equal(writes.length, 1);
assert.match(writes[0].sql, /UPDATE "tools"/);
assert.equal(writes[0].params[1], TOOL_EMBEDDING_PROVIDER);
assert.equal(writes[0].params[2], TOOL_EMBEDDING_MODEL);
assert.equal(writes[0].params[3], TOOL_EMBEDDING_DIMENSIONS);
assert.equal(writes[0].params[4], TOOL_EMBEDDING_SOURCE_VERSION);
assert.equal(usageRecords.length, 1);
assert.equal(usageRecords[0].billingMode, 'platform');
assert.equal(usageRecords[0].userId, undefined);
assert.equal(usageRecords[0].usage.inputTokens, 9);
assert.equal(
  queryCalls.some(
    ([kind, value]) => kind === 'where' && value === 'tool.user_id IS NULL',
  ),
  true,
);
for (const property of [
  'tool.embeddingProvider',
  'tool.embeddingModel',
  'tool.embeddingDimensions',
  'tool.embeddingSourceVersion',
  'tool.embeddingSourceHash',
]) {
  assert.equal(
    queryCalls.some(
      ([kind, value]) => kind === 'addSelect' && value === property,
    ),
    true,
  );
}

const changedTool = {
  ...staleTool,
  name: 'Changed while embedding request was in flight',
};
const changedWrites = [];
const changedPipeline = new ToolEmbeddingPipelineService(
  repository,
  {
    async transaction(callback) {
      return callback({
        getRepository() {
          return {
            async findOne() {
              return changedTool;
            },
          };
        },
        async query(...args) {
          changedWrites.push(args);
        },
      });
    },
  },
  pipelineEmbeddingService,
  { async record() {} },
);
const changedResult = await changedPipeline.syncStaleTools({ limit: 1 });
assert.equal(changedResult.updated, 0);
assert.equal(changedResult.skippedChanged, 1);
assert.equal(changedWrites.length, 0);

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');
const migration = read(
  'src',
  'migration',
  '1790611200000-AddToolEmbeddingProvenance.ts',
);
const entity = read('src', 'tools', 'tool.entity.ts');
const runner = read('src', 'embedding', 'sync-tool-embeddings.ts');
assert.match(migration, /embedding_source_hash/);
assert.match(migration, /CHK_tools_embedding_provenance/);
assert.match(migration, /UPDATE "tools" SET "embedding" = NULL/);
assert.equal(/hnsw|ivfflat|vector_cosine_ops/i.test(migration), false);
assert.match(entity, /embeddingProvider/);
assert.match(entity, /embeddingUpdatedAt/);
assert.match(entity, /select: false/);
assert.equal(runner.includes('local_path'), false);
assert.equal(runner.includes('prompt'), false);
assert.equal(runner.includes('clipboard'), false);

const migrationQueries = [];
const migrationInstance = new AddToolEmbeddingProvenance1790611200000();
await migrationInstance.up({
  async query(sql) {
    migrationQueries.push(sql);
  },
});
assert.equal(migrationQueries.length, 3);
assert.match(migrationQueries[0], /ADD COLUMN "embedding_provider"/);
assert.match(migrationQueries[1], /SET "embedding" = NULL/);
assert.match(migrationQueries[2], /CHK_tools_embedding_provenance/);

console.log('canonical tool source is deterministic, bounded and URL-path/private-path safe: PASS');
console.log('OpenAI embedding batch order/dimensions/usage are strictly validated: PASS');
console.log('missing credentials, oversized batches, wrong models and invalid vectors fail closed: PASS');
console.log('embedding price is covered by the existing platform AI usage ledger: PASS');
console.log('pipeline scans public tools only and skips already-current provenance: PASS');
console.log('source changes during embedding generation prevent stale vector writes: PASS');
console.log('migration executes provenance/reset/check steps and intentionally adds no vector-search index yet: PASS');
console.log('S5.3 Embedding Pipeline regression: PASS');
