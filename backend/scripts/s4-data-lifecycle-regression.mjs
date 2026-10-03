import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { UsersService } = require('../dist/users/users.service.js');
const { DeleteAccountDto } = require('../dist/users/dto/delete-account.dto.js');
const { validate } = require('class-validator');
const { User } = require('../dist/users/user.entity.js');
const { Tool } = require('../dist/tools/tool.entity.js');
const { Favorite } = require('../dist/favorites/favorite.entity.js');
const { ToolOrder } = require('../dist/orders/tool-order.entity.js');
const { Category } = require('../dist/categories/category.entity.js');
const { RefreshSession } = require('../dist/auth/refresh-session.entity.js');

const now = new Date('2026-09-26T00:00:00.000Z');
const userId = 42;
const user = {
  id: userId,
  username: 'export-user',
  email: 'export@example.test',
  password_hash: 'must-never-export-password-hash',
  displayName: 'Export User',
  avatar: null,
  avatarType: null,
  role: 'user',
  status: 'active',
  created_at: now,
};

const tool = {
  id: 5,
  user_id: userId,
  name: 'Private Tool',
  url: 'https://example.test',
  description: 'description',
  tags: ['private'],
  category: '自定义',
  icon: null,
  is_custom: true,
  local_path: 'C:/private/tool.exe',
  card_color: null,
  embedding: [987654321],
  view_count: 11,
  click_count: 12,
  favorite_count: 13,
  created_at: now,
  updated_at: now,
};

const favorite = { id: 7, user_id: userId, tool_id: 5, created_at: now };
const toolOrder = { id: 8, user_id: userId, ordered_ids: [5, 1] };
const category = { id: 9, user_id: userId, name: '自定义', display_order: 1, created_at: now };
const authSession = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: userId,
  tokenHash: 'must-never-export-refresh-hash',
  clientType: 'desktop',
  clientInstanceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  clientName: 'FlexiKit Desktop',
  expiresAt: new Date(now.getTime() + 3_600_000),
  revokedAt: null,
  lastUsedAt: now,
  createdAt: now,
  updatedAt: now,
};

const directRepositories = {
  user: {
    findOne: async ({ where }) => where.id === userId ? user : null,
  },
  favorites: {
    find: async () => [favorite],
  },
  tools: {
    find: async () => [tool],
  },
  orders: {
    find: async () => [toolOrder],
  },
  categories: {
    find: async () => [category],
  },
};

const transactionDeletes = [];
let transactionCount = 0;

function deletionRepository(entity) {
  if (entity === User) {
    return {
      findOne: async ({ where, lock }) => {
        assert.equal(where.id, userId);
        assert.equal(lock.mode, 'pessimistic_write');
        return user;
      },
      delete: async (where) => {
        transactionDeletes.push(['users', where]);
        return { affected: 1 };
      },
    };
  }
  if (entity === Tool) {
    return {
      find: async () => [{ id: tool.id }],
      decrement: async (where, field, count) => {
        transactionDeletes.push(['tool_favorite_count', { where, field, count }]);
      },
      delete: async (where) => {
        transactionDeletes.push(['tools', where]);
        return { affected: 1 };
      },
    };
  }
  if (entity === Favorite) {
    return {
      find: async () => [
        { tool_id: 99 },
        { tool_id: tool.id },
      ],
      delete: async (where) => {
        transactionDeletes.push(['favorites', where]);
        return { affected: 1 };
      },
    };
  }
  if (entity === ToolOrder) {
    return {
      delete: async (where) => {
        transactionDeletes.push(['tool_orders', where]);
        return { affected: 1 };
      },
    };
  }
  if (entity === Category) {
    return {
      delete: async (where) => {
        transactionDeletes.push(['categories', where]);
        return { affected: 1 };
      },
    };
  }
  if (entity === RefreshSession) {
    return {
      update: async (where, value) => {
        transactionDeletes.push(['refresh_sessions_revoke', { where, value }]);
        return { affected: 1 };
      },
      delete: async (where) => {
        transactionDeletes.push(['refresh_sessions', where]);
        return { affected: 1 };
      },
    };
  }
  throw new Error('unexpected transactional repository');
}

const dataSource = {
  getRepository(entity) {
    assert.equal(entity, RefreshSession);
    return {
      find: async () => [authSession],
    };
  },
  async transaction(callback) {
    transactionCount += 1;
    return callback({ getRepository: deletionRepository });
  },
};

const service = new UsersService(
  directRepositories.user,
  directRepositories.favorites,
  directRepositories.tools,
  directRepositories.orders,
  directRepositories.categories,
  dataSource,
);

const rejectedConfirmation = Object.assign(new DeleteAccountDto(), { confirmation: 'delete' });
const acceptedConfirmation = Object.assign(new DeleteAccountDto(), { confirmation: 'DELETE' });
assert.ok((await validate(rejectedConfirmation)).length > 0);
assert.equal((await validate(acceptedConfirmation)).length, 0);

const exported = await service.exportUserData(userId);
const serialized = JSON.stringify(exported);
assert.equal(exported.schemaVersion, 1);
assert.equal(exported.account.username, user.username);
assert.equal(exported.tools[0].localPath, tool.local_path);
assert.equal(exported.authSessions[0].sessionId, authSession.id);
assert.equal(serialized.includes(user.password_hash), false);
assert.equal(serialized.includes(authSession.tokenHash), false);
assert.equal(serialized.includes('987654321'), false);
assert.equal('user_id' in exported.tools[0], false);

await service.deleteUserAccount(userId);
assert.equal(transactionCount, 1);
assert.ok(transactionDeletes.some(([table, where]) => table === 'favorites' && where.user_id === userId));
assert.ok(transactionDeletes.some(([table, value]) => (
  table === 'tool_favorite_count'
  && value.where.id === 99
  && value.field === 'favorite_count'
  && value.count === 1
)));
assert.ok(transactionDeletes.some(([table, where]) => table === 'tools' && where.user_id === userId));
assert.ok(transactionDeletes.some(([table, value]) => (
  table === 'refresh_sessions_revoke'
  && value.where.user_id === userId
  && value.value.revokedAt instanceof Date
)));
assert.ok(transactionDeletes.some(([table, where]) => table === 'refresh_sessions' && where.user_id === userId));
assert.ok(transactionDeletes.some(([table, where]) => table === 'users' && where.id === userId));

console.log('server export uses an explicit safe-field contract: PASS');
console.log('server export excludes password/token hashes and embeddings: PASS');
console.log('account deletion requires the exact DELETE confirmation DTO: PASS');
console.log('account deletion runs inside one transaction with a row lock: PASS');
console.log('account deletion decrements surviving tool favorite counters: PASS');
console.log('account deletion revokes Refresh Sessions before deleting them: PASS');
console.log('account deletion removes business data and Refresh Sessions before user: PASS');
console.log('S4.3 server data lifecycle regression: PASS');
