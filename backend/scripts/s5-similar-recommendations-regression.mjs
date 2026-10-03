import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { BadRequestException } = require('@nestjs/common');
const {
  RecommendationsService,
} = require('../dist/recommendations/recommendations.service.js');

function tool(id, name = `Tool ${id}`) {
  return {
    id,
    user_id: null,
    name,
    url: `https://tool-${id}.example`,
    description: null,
    tags: null,
    category: null,
    icon: null,
    is_custom: false,
    local_path: null,
    card_color: null,
    view_count: 0,
    click_count: 0,
    favorite_count: 0,
    created_at: new Date('2026-09-28T00:00:00Z'),
    updated_at: new Date('2026-09-28T00:00:00Z'),
  };
}

function favorite(toolId) {
  return {
    id: toolId,
    user_id: 7,
    tool_id: toolId,
    created_at: new Date('2026-09-28T00:00:00Z'),
    tool: tool(toolId),
  };
}

function vectorMatch(id, similarity) {
  return {
    tool: tool(id),
    cosineSimilarity: similarity,
    cosineDistance: 1 - similarity,
  };
}

function fixture({
  favoriteIds = [],
  seeds = [],
  vectorResults = new Map(),
  popularResults = [],
} = {}) {
  const favoriteCalls = [];
  const seedCalls = [];
  const vectorCalls = [];
  const popularCalls = [];

  const seedQuery = {
    innerJoinAndSelect(relation, alias) {
      seedCalls.push(['innerJoinAndSelect', relation, alias]);
      return this;
    },
    where(value, params) {
      seedCalls.push(['where', value, params]);
      return this;
    },
    andWhere(value, params) {
      seedCalls.push(['andWhere', value, params]);
      return this;
    },
    orderBy(value, direction) {
      seedCalls.push(['orderBy', value, direction]);
      return this;
    },
    addOrderBy(value, direction) {
      seedCalls.push(['addOrderBy', value, direction]);
      return this;
    },
    take(value) {
      seedCalls.push(['take', value]);
      return this;
    },
    async getMany() {
      seedCalls.push(['getMany']);
      return seeds;
    },
  };

  let popularTake = 0;
  const popularQuery = {
    where(value, params) {
      popularCalls.push(['where', value, params]);
      return this;
    },
    andWhere(value, params) {
      popularCalls.push(['andWhere', value, params]);
      return this;
    },
    addSelect(value, alias) {
      popularCalls.push(['addSelect', value, alias]);
      return this;
    },
    orderBy(value, direction) {
      popularCalls.push(['orderBy', value, direction]);
      return this;
    },
    addOrderBy(value, direction) {
      popularCalls.push(['addOrderBy', value, direction]);
      return this;
    },
    take(value) {
      popularTake = value;
      popularCalls.push(['take', value]);
      return this;
    },
    async getMany() {
      popularCalls.push(['getMany']);
      return popularResults.slice(0, popularTake);
    },
  };

  const toolsRepository = {
    createQueryBuilder(alias) {
      popularCalls.push(['createQueryBuilder', alias]);
      return popularQuery;
    },
  };
  const favoritesRepository = {
    async find(options) {
      favoriteCalls.push(['find', options]);
      return favoriteIds.map((id) => ({ tool_id: id }));
    },
    createQueryBuilder(alias) {
      seedCalls.push(['createQueryBuilder', alias]);
      return seedQuery;
    },
  };
  const vectorSearch = {
    async searchPublicToolsSimilarToTool(sourceToolId, options) {
      vectorCalls.push([sourceToolId, options]);
      const result = vectorResults.get(sourceToolId);
      if (result instanceof Error) throw result;
      return result ?? [];
    },
  };

  return {
    service: new RecommendationsService(
      toolsRepository,
      favoritesRepository,
      vectorSearch,
    ),
    favoriteCalls,
    seedCalls,
    vectorCalls,
    popularCalls,
  };
}

{
  const state = fixture({
    popularResults: [tool(90), tool(91), tool(92)],
  });
  const result = await state.service.getRecommendations(null, 2);
  assert.deepEqual(result.map(({ id }) => id), [90, 91]);
  assert.equal(state.favoriteCalls.length, 0);
  assert.equal(state.seedCalls.length, 0);
  assert.equal(state.vectorCalls.length, 0);
  assert.deepEqual(
    state.popularCalls.find(([kind]) => kind === 'take'),
    ['take', 2],
  );
}

{
  const state = fixture({
    favoriteIds: [],
    popularResults: [tool(80), tool(81)],
  });
  const result = await state.service.getRecommendations(7, 2);
  assert.deepEqual(result.map(({ id }) => id), [80, 81]);
  assert.equal(state.seedCalls.length, 0);
  assert.equal(state.vectorCalls.length, 0);
}

{
  const state = fixture({
    favoriteIds: [1, 2, 99],
    seeds: [favorite(1), favorite(2)],
    vectorResults: new Map([
      [1, [
        vectorMatch(2, 0.99),
        vectorMatch(11, 0.8),
        vectorMatch(10, 0.7),
      ]],
      [2, [
        vectorMatch(11, 0.85),
        vectorMatch(12, 0.8),
      ]],
    ]),
  });
  const result = await state.service.getRecommendations(7, 3);
  assert.deepEqual(result.map(({ id }) => id), [11, 12, 10]);
  assert.equal(new Set(result.map(({ id }) => id)).size, result.length);
  assert.equal(result.some(({ id }) => [1, 2, 99].includes(id)), false);
  assert.deepEqual(
    state.vectorCalls.map(([sourceToolId]) => sourceToolId),
    [1, 2],
  );
  for (const [, options] of state.vectorCalls) {
    assert.equal(options.limit, 12);
    assert.deepEqual(options.excludeToolIds, [1, 2, 99]);
  }
  assert.deepEqual(
    state.seedCalls.find(([kind]) => kind === 'andWhere'),
    ['andWhere', 'tool.user_id IS NULL', undefined],
  );
  assert.deepEqual(
    state.seedCalls.find(([kind]) => kind === 'take'),
    ['take', 3],
  );
  assert.equal(state.popularCalls.length, 0);
}

{
  const state = fixture({
    favoriteIds: [1],
    seeds: [favorite(1)],
    vectorResults: new Map([[1, new Error('vector unavailable')]]),
    popularResults: [tool(30), tool(31)],
  });
  const result = await state.service.getRecommendations(7, 2);
  assert.deepEqual(result.map(({ id }) => id), [30, 31]);
  const notExists = state.popularCalls.find(
    ([kind, value]) => kind === 'andWhere'
      && String(value).includes('NOT EXISTS'),
  );
  assert.ok(notExists);
  assert.deepEqual(notExists[2], { favoriteUserId: 7 });
}

{
  const state = fixture({
    favoriteIds: [1],
    seeds: [favorite(1)],
    vectorResults: new Map([[1, [vectorMatch(10, 0.9)]]]),
    popularResults: [tool(20), tool(21)],
  });
  const result = await state.service.getRecommendations(7, 3);
  assert.deepEqual(result.map(({ id }) => id), [10, 20, 21]);
  const selectedExclusion = state.popularCalls.find(
    ([kind, value]) => kind === 'andWhere'
      && value === 'tool.id NOT IN (:...excludeToolIds)',
  );
  assert.deepEqual(selectedExclusion[2], { excludeToolIds: [10] });
}

{
  const manyFavorites = Array.from({ length: 101 }, (_value, index) => index + 1);
  const state = fixture({
    favoriteIds: manyFavorites,
    seeds: [favorite(1)],
    vectorResults: new Map([[
      1,
      [vectorMatch(101, 0.99), vectorMatch(200, 0.8)],
    ]]),
    popularResults: [tool(300)],
  });
  const result = await state.service.getRecommendations(7, 2);
  assert.deepEqual(result.map(({ id }) => id), [200, 300]);
  assert.equal(state.vectorCalls[0][1].excludeToolIds.length, 100);
  assert.equal(result.some(({ id }) => manyFavorites.includes(id)), false);
}

{
  const state = fixture({
    popularResults: [tool(90), tool(91)],
  });
  const explained = await state.service.getExplainedRecommendations(null, 2);
  assert.deepEqual(
    explained.map(({ tool: item, explanation }) => ({
      id: item.id,
      explanation,
    })),
    [
      { id: 90, explanation: { kind: 'popular' } },
      { id: 91, explanation: { kind: 'popular' } },
    ],
  );
}

{
  const state = fixture({
    favoriteIds: [1],
    seeds: [favorite(1)],
    vectorResults: new Map([[1, [vectorMatch(10, 0.91)]]]),
  });
  const explained = await state.service.getExplainedRecommendations(7, 1);
  assert.equal(explained.length, 1);
  assert.equal(explained[0].tool.id, 10);
  assert.deepEqual(explained[0].explanation, {
    kind: 'similar_favorite',
    seedToolName: 'Tool 1',
  });
  const serialized = JSON.stringify(explained);
  assert.equal(/cosine|similarity|embedding|seedRank|candidateRank/.test(serialized), false);
}

{
  const state = fixture({
    favoriteIds: [1],
    seeds: [favorite(1)],
    vectorResults: new Map([[1, new Error('vector unavailable')]]),
    popularResults: [tool(30)],
  });
  const explained = await state.service.getExplainedRecommendations(7, 1);
  assert.deepEqual(explained[0].explanation, { kind: 'popular' });
}

for (const invalidLimit of [0, 21, Number.NaN, 1.5]) {
  const state = fixture();
  await assert.rejects(
    () => state.service.getRecommendations(null, invalidLimit),
    error => error instanceof BadRequestException,
  );
}

console.log('anonymous and no-favorite users preserve the public popular fallback: PASS');
console.log('only recent public favorites are selected as semantic seeds: PASS');
console.log('multi-seed pgvector candidates merge deterministically by best DB similarity: PASS');
console.log('all current favorites are excluded even beyond the vector SQL exclusion cap: PASS');
console.log('vector failures/shortfalls degrade to favorite-safe public popular results: PASS');
console.log('recommendation limit is bounded to 1..20 and response remains Tool[]: PASS');
console.log('explained recommendations expose only semantic-favorite/popular reasons without vector internals: PASS');
console.log('semantic failure fallback remains transparently labeled as popular: PASS');
console.log('S5.3 similar Tool recommendations regression: PASS');
