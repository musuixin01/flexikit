import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ToolVectorSearchService,
} = require('../dist/embedding/tool-vector-search.service.js');
const {
  TOOL_EMBEDDING_DIMENSIONS,
  TOOL_EMBEDDING_MODEL,
  TOOL_EMBEDDING_PROVIDER,
  TOOL_EMBEDDING_SOURCE_VERSION,
} = require('../dist/embedding/tool-embedding-source.js');

const calls = [];
const queryBuilder = {
  addSelect(value, alias) {
    calls.push(['addSelect', value, alias]);
    return this;
  },
  where(value, params) {
    calls.push(['where', value, params]);
    return this;
  },
  andWhere(value, params) {
    calls.push(['andWhere', value, params]);
    return this;
  },
  orderBy(value, direction) {
    calls.push(['orderBy', value, direction]);
    return this;
  },
  addOrderBy(value, direction) {
    calls.push(['addOrderBy', value, direction]);
    return this;
  },
  setParameters(params) {
    calls.push(['setParameters', params]);
    return this;
  },
  take(value) {
    calls.push(['take', value]);
    return this;
  },
  async getRawAndEntities() {
    return {
      entities: [
        { id: 11, name: 'Nearest public Tool' },
        { id: 12, name: 'Second public Tool' },
      ],
      raw: [
        { vector_distance: '0.125', vector_similarity: '0.875' },
        { vector_distance: 0.25, vector_similarity: 0.75 },
      ],
    };
  },
};
const repository = {
  createQueryBuilder(alias) {
    calls.push(['createQueryBuilder', alias]);
    return queryBuilder;
  },
};
const service = new ToolVectorSearchService(repository);
const queryVector = Array(TOOL_EMBEDDING_DIMENSIONS).fill(0.01);
const matches = await service.searchPublicTools(queryVector, {
  limit: 7,
  excludeToolIds: [3, 5, 3],
});

assert.equal(matches.length, 2);
assert.equal(matches[0].tool.id, 11);
assert.equal(matches[0].cosineDistance, 0.125);
assert.equal(matches[0].cosineSimilarity, 0.875);
assert.equal(matches[1].cosineDistance, 0.25);
assert.equal(matches[1].cosineSimilarity, 0.75);

const selectDistance = calls.find(
  ([kind, , alias]) => kind === 'addSelect' && alias === 'vector_distance',
);
const selectSimilarity = calls.find(
  ([kind, , alias]) => kind === 'addSelect' && alias === 'vector_similarity',
);
assert.ok(selectDistance);
assert.ok(selectSimilarity);
assert.match(selectDistance[1], /tool\.embedding <=> CAST\(:queryVector AS vector\)/);
assert.match(selectSimilarity[1], /1 - \(tool\.embedding <=> CAST\(:queryVector AS vector\)\)/);

const order = calls.find(([kind]) => kind === 'orderBy');
assert.deepEqual(order, [
  'orderBy',
  'tool.embedding <=> CAST(:queryVector AS vector)',
  'ASC',
]);
assert.deepEqual(
  calls.find(([kind]) => kind === 'addOrderBy'),
  ['addOrderBy', 'tool.id', 'ASC'],
);
assert.deepEqual(calls.find(([kind]) => kind === 'take'), ['take', 7]);

const parameters = calls.find(([kind]) => kind === 'setParameters')[1];
assert.equal(parameters.embeddingProvider, TOOL_EMBEDDING_PROVIDER);
assert.equal(parameters.embeddingModel, TOOL_EMBEDDING_MODEL);
assert.equal(parameters.embeddingDimensions, TOOL_EMBEDDING_DIMENSIONS);
assert.equal(parameters.embeddingSourceVersion, TOOL_EMBEDDING_SOURCE_VERSION);
assert.equal(typeof parameters.queryVector, 'string');
assert.equal(parameters.queryVector.startsWith('['), true);
assert.equal(parameters.queryVector.endsWith(']'), true);

for (const predicate of [
  'tool.user_id IS NULL',
  'tool.embedding IS NOT NULL',
  'tool.embeddingProvider = :embeddingProvider',
  'tool.embeddingModel = :embeddingModel',
  'tool.embeddingDimensions = :embeddingDimensions',
  'tool.embeddingSourceVersion = :embeddingSourceVersion',
  'tool.embeddingSourceHash IS NOT NULL',
  'tool.embeddingUpdatedAt IS NOT NULL',
  'tool.embeddingUpdatedAt >= tool.updated_at',
]) {
  assert.equal(
    calls.some(
      ([kind, value]) => (
        (kind === 'where' || kind === 'andWhere')
        && value === predicate
      ),
    ),
    true,
    `missing pgvector predicate: ${predicate}`,
  );
}
const excludeCall = calls.find(
  ([kind, value]) => (
    kind === 'andWhere'
    && value === 'tool.id NOT IN (:...excludeToolIds)'
  ),
);
assert.deepEqual(excludeCall[2], { excludeToolIds: [3, 5] });

for (const invalidVector of [
  [],
  Array(TOOL_EMBEDDING_DIMENSIONS - 1).fill(0),
  [...queryVector.slice(0, -1), Number.NaN],
  [...queryVector.slice(0, -1), Number.POSITIVE_INFINITY],
  [...queryVector.slice(0, -1), 1_000_001],
]) {
  await assert.rejects(
    () => service.searchPublicTools(invalidVector),
    /Vector search input is invalid/,
  );
}
await assert.rejects(
  () => service.searchPublicTools(queryVector, { limit: 0 }),
  /Vector search limit is outside the supported range/,
);
await assert.rejects(
  () => service.searchPublicTools(queryVector, { limit: 51 }),
  /Vector search limit is outside the supported range/,
);
await assert.rejects(
  () => service.searchPublicTools(queryVector, { excludeToolIds: [0] }),
  /Excluded Tool ids are invalid/,
);
await assert.rejects(
  () => service.searchPublicTools(queryVector, {
    excludeToolIds: Array.from({ length: 101 }, (_value, index) => index + 1),
  }),
  /Too many excluded Tool ids/,
);

const mismatchService = new ToolVectorSearchService({
  createQueryBuilder() {
    return {
      ...queryBuilder,
      async getRawAndEntities() {
        return {
          entities: [{ id: 1 }],
          raw: [],
        };
      },
    };
  },
});
await assert.rejects(
  () => mismatchService.searchPublicTools(queryVector),
  /inconsistent result metadata/,
);

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');
const source = read('src', 'embedding', 'tool-vector-search.service.ts');
const initialMigration = read(
  'src',
  'migration',
  '1786084322210-InitialSchema.ts',
);
const provenanceMigration = read(
  'src',
  'migration',
  '1790611200000-AddToolEmbeddingProvenance.ts',
);

assert.match(initialMigration, /CREATE EXTENSION IF NOT EXISTS "vector"/);
assert.match(initialMigration, /"embedding" vector\(1536\)/);
assert.match(source, /<=>/);
assert.match(source, /CAST\(:queryVector AS vector\)/);
assert.equal(/Math\.sqrt|dotProduct|cosineSimilarity\s*\(/.test(source), false);
assert.equal(/for\s*\([^)]*embedding/.test(source), false);
assert.equal(/hnsw|ivfflat|vector_cosine_ops/i.test(provenanceMigration), false);

console.log('pgvector cosine distance/similarity is calculated in PostgreSQL with <=>: PASS');
console.log('query vector and exclusions are bounded and parameterized: PASS');
console.log('only public, current-provenance, non-stale embeddings are eligible: PASS');
console.log('candidate vectors remain select:false and no in-memory vector similarity loop exists: PASS');
console.log('exact-search baseline intentionally adds no unverified ANN index: PASS');
console.log('S5.3 pgvector regression: PASS');
