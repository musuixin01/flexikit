import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  BadRequestException,
  ForbiddenException,
} = require('@nestjs/common');
const {
  ADMIN_READ_PERMISSIONS,
  parseAdminUserIds,
} = require('../dist/admin/admin-access.js');
const { AdminAccessService } = require('../dist/admin/admin-access.service.js');
const { AdminAccessGuard } = require('../dist/admin/admin-access.guard.js');
const { AdminController } = require('../dist/admin/admin.controller.js');
const { AdminService } = require('../dist/admin/admin.service.js');
const { User } = require('../dist/users/user.entity.js');
const { Favorite } = require('../dist/favorites/favorite.entity.js');
const { Tool } = require('../dist/tools/tool.entity.js');
const { ToolOrder } = require('../dist/orders/tool-order.entity.js');
const { Category } = require('../dist/categories/category.entity.js');
const { RefreshSession } = require('../dist/auth/refresh-session.entity.js');
const { AdminAuditEvent } = require('../dist/admin/admin-audit-event.entity.js');

function executionContextFor(userId) {
  return {
    switchToHttp() {
      return {
        getRequest() {
          return {
            user: {
              userId,
              username: `user-${userId}`,
              sessionId: null,
            },
          };
        },
      };
    },
  };
}

assert.deepEqual(
  [...parseAdminUserIds('1, 2,foo,-3,0,2, 99 ')],
  [1, 2, 99],
);
assert.deepEqual([...parseAdminUserIds(undefined)], []);

const accessUsers = new Map([
  [7, { id: 7, username: 'bootstrap', role: 'user', status: 'active' }],
  [8, { id: 8, username: 'persistent', role: 'admin', status: 'active' }],
  [9, { id: 9, username: 'normal', role: 'user', status: 'active' }],
  [10, { id: 10, username: 'suspended-admin', role: 'admin', status: 'suspended' }],
]);
const accessUsersRepository = {
  async findOne({ where }) {
    return accessUsers.get(where.id) ?? null;
  },
};
const accessService = new AdminAccessService(
  { get: key => key === 'ADMIN_USER_IDS' ? '7,11' : undefined },
  accessUsersRepository,
);

const bootstrapAccess = await accessService.require(7);
assert.equal(bootstrapAccess.accessMode, 'bootstrap-admin');
assert.equal(
  bootstrapAccess.permissions.includes('admin.users.role.write'),
  true,
);
assert.deepEqual(
  bootstrapAccess.permissions.slice(0, ADMIN_READ_PERMISSIONS.length),
  [...ADMIN_READ_PERMISSIONS],
);

const persistentAccess = await accessService.require(8);
assert.equal(persistentAccess.accessMode, 'persistent-admin');
assert.equal(
  persistentAccess.permissions.includes('admin.users.status.write'),
  true,
);
assert.equal(
  persistentAccess.permissions.includes('admin.users.delete.write'),
  true,
);
assert.equal(
  persistentAccess.permissions.includes('admin.users.role.write'),
  false,
);
assert.equal(await accessService.resolve(9), null);
assert.equal(await accessService.resolve(10), null);

const guard = new AdminAccessGuard(accessService);
assert.equal(await guard.canActivate(executionContextFor(7)), true);
await assert.rejects(
  () => guard.canActivate(executionContextFor(9)),
  error => error instanceof ForbiddenException,
);

const now = Date.now();
const mutableTarget = {
  id: 20,
  username: 'safe-user',
  email: 'safe@example.com',
  displayName: 'Safe User',
  role: 'user',
  status: 'active',
  created_at: new Date(now - 86400000),
  password_hash: 'must-not-leak',
};

const usersRepository = {
  async count(options) {
    const where = options?.where;
    if (where?.status === 'active') return 10;
    if (where?.status === 'suspended') return 2;
    if (where?.role === 'admin') return 1;
    if (where?.created_at) return 2;
    return 12;
  },
  async findAndCount() {
    return [[mutableTarget], 1];
  },
  async findOne({ where }) {
    return where.id === mutableTarget.id ? mutableTarget : null;
  },
};

const toolsRepository = {
  async count() {
    return 4;
  },
};

const favoritesRepository = {
  async count() {
    return 3;
  },
};

const refreshSessionsRepository = {
  async count(options) {
    return options?.where?.user_id ? 2 : 5;
  },
  async find() {
    return [{
      clientType: 'desktop',
      clientName: 'Windows',
      tokenHash: 'must-not-leak',
      createdAt: new Date(now - 3600000),
      lastUsedAt: new Date(now - 60000),
      expiresAt: new Date(now + 3600000),
      revokedAt: null,
    }];
  },
};

const auditRows = [{
  id: 1,
  actorUserId: 7,
  actorUsername: 'bootstrap',
  accessMode: 'bootstrap-admin',
  action: 'user.role.changed',
  targetUserId: 20,
  targetUsername: 'safe-user',
  metadata: { previousRole: 'user', nextRole: 'admin' },
  createdAt: new Date(now),
}];
const adminAuditRepository = {
  async findAndCount() {
    return [auditRows, auditRows.length];
  },
};

const insertedAudits = [];
const transactionUsersRepository = {
  async findOne({ where }) {
    return where.id === mutableTarget.id ? mutableTarget : null;
  },
  async save(user) {
    Object.assign(mutableTarget, user);
    return mutableTarget;
  },
  async count() {
    return 1;
  },
  async delete() {
    return { affected: 1 };
  },
};
const transactionRefreshRepository = {
  async update() {
    return { affected: 2 };
  },
  async delete() {
    return { affected: 2 };
  },
};
const transactionFavoritesRepository = {
  async find() {
    return [{ tool_id: 99 }];
  },
  async delete() {
    return { affected: 1 };
  },
};
const transactionToolsRepository = {
  async find() {
    return [{ id: 101 }];
  },
  async decrement() {
    return { affected: 1 };
  },
  async delete() {
    return { affected: 1 };
  },
};
const transactionToolOrdersRepository = {
  async delete() {
    return { affected: 1 };
  },
};
const transactionCategoriesRepository = {
  async delete() {
    return { affected: 1 };
  },
};
const transactionAuditRepository = {
  async insert(value) {
    insertedAudits.push(value);
    return { identifiers: [] };
  },
};
const dataSource = {
  async transaction(callback) {
    return callback({
      getRepository(entity) {
        if (entity === User) return transactionUsersRepository;
        if (entity === Favorite) return transactionFavoritesRepository;
        if (entity === Tool) return transactionToolsRepository;
        if (entity === ToolOrder) return transactionToolOrdersRepository;
        if (entity === Category) return transactionCategoriesRepository;
        if (entity === RefreshSession) return transactionRefreshRepository;
        if (entity === AdminAuditEvent) return transactionAuditRepository;
        throw new Error('unexpected repository');
      },
    });
  },
};
const adminAccessService = {
  async requirePermission(userId, permission) {
    if (permission === 'admin.users.role.write') {
      return {
        userId,
        username: 'bootstrap',
        accessMode: 'bootstrap-admin',
        permissions: [permission],
      };
    }
    return {
      userId,
      username: 'persistent',
      accessMode: 'persistent-admin',
      permissions: [permission],
    };
  },
  async require(userId) {
    return {
      userId,
      username: 'bootstrap',
      accessMode: 'bootstrap-admin',
      permissions: [],
    };
  },
};
const aiUsageService = {
  async getAdminSummary() {
    return {
      trackingStatus: 'active',
      source: 'provider-reported',
      pricingCatalogVersion: '2026-09-27',
      currency: 'USD',
      costScope: 'token-request-only',
      requestCount: 3,
      platformRequestCount: 2,
      byokRequestCount: 1,
      pricedRequestCount: 2,
      unpricedRequestCount: 1,
      inputTokens: 300,
      outputTokens: 90,
      totalTokens: 390,
      cachedInputTokens: 40,
      reasoningTokens: 12,
      estimatedCostUsd: '0.001000000000',
      platformEstimatedCostUsd: '0.000700000000',
      byokEstimatedCostUsd: '0.000300000000',
      byProviderModel: [],
      message: 'provider-reported',
    };
  },
};

const service = new AdminService(
  usersRepository,
  toolsRepository,
  favoritesRepository,
  refreshSessionsRepository,
  adminAuditRepository,
  dataSource,
  adminAccessService,
  aiUsageService,
);

const overview = await service.getOverview();
assert.equal(overview.totalUsers, 12);
assert.equal(overview.activeUsers, 10);
assert.equal(overview.suspendedUsers, 2);
assert.equal(overview.adminUsers, 1);
assert.equal(overview.aiUsageTracking, 'active');

const userList = await service.listUsers({
  page: 1,
  pageSize: 20,
});
assert.equal(userList.items[0].role, 'user');
assert.equal(userList.items[0].status, 'active');
assert.equal(JSON.stringify(userList).includes('password_hash'), false);
assert.equal(JSON.stringify(userList).includes('must-not-leak'), false);

const detail = await service.getUserDetail(20);
assert.equal(detail.toolCount, 4);
assert.equal(detail.favoriteCount, 3);
assert.equal(detail.recentSessions[0].status, 'active');
assert.equal(JSON.stringify(detail).includes('tokenHash'), false);
assert.equal(JSON.stringify(detail).includes('must-not-leak'), false);

const audit = await service.listAuditEvents({ page: 1, pageSize: 20 });
assert.equal(audit.items[0].action, 'user.role.changed');
assert.equal(audit.items[0].targetUsername, 'safe-user');

await service.updateUserStatus(8, 20, 'suspended');
assert.equal(mutableTarget.status, 'suspended');
assert.equal(insertedAudits.at(-1).action, 'user.status.changed');
assert.equal(insertedAudits.at(-1).metadata.revokedSessions, 2);

mutableTarget.status = 'active';
await service.updateUserRole(7, 20, 'admin');
assert.equal(mutableTarget.role, 'admin');
assert.equal(insertedAudits.at(-1).action, 'user.role.changed');

await assert.rejects(
  () => service.updateUserStatus(20, 20, 'suspended'),
  error => error instanceof BadRequestException,
);

await assert.rejects(
  () => service.deleteUserAccount(20, 20, 'safe-user'),
  error => error instanceof BadRequestException,
);

await assert.rejects(
  () => service.deleteUserAccount(8, 20, 'wrong-user'),
  error => error instanceof BadRequestException,
);

mutableTarget.role = 'admin';
await assert.rejects(
  () => service.deleteUserAccount(8, 20, 'safe-user'),
  error => error instanceof BadRequestException,
);

mutableTarget.role = 'user';
const deleted = await service.deleteUserAccount(8, 20, 'safe-user');
assert.deepEqual(deleted, {
  deletedUserId: 20,
  username: 'safe-user',
});
assert.equal(insertedAudits.at(-1).action, 'user.account.deleted');
assert.equal(insertedAudits.at(-1).targetUsername, 'safe-user');
assert.equal(insertedAudits.at(-1).metadata.revokedSessions, 2);
assert.equal(insertedAudits.at(-1).metadata.deletedSessions, 2);
assert.equal(insertedAudits.at(-1).metadata.deletedTools, 1);
assert.equal(insertedAudits.at(-1).metadata.deletedFavorites, 2);

const aiUsage = await service.getAiUsageStatus();
assert.equal(aiUsage.trackingStatus, 'active');
assert.equal(aiUsage.source, 'provider-reported');
assert.equal(aiUsage.platformEstimatedCostUsd, '0.000700000000');

const controller = new AdminController(service, adminAccessService);
const access = await controller.getAccess({
  user: {
    userId: 7,
    username: 'bootstrap',
    sessionId: null,
  },
});
assert.equal(access.accessMode, 'bootstrap-admin');

assert.deepEqual(
  Object.getOwnPropertyNames(AdminController.prototype)
    .filter(name => name !== 'constructor')
    .sort(),
  [
    'getAccess',
    'getAiUsageStatus',
    'getOverview',
    'getUserDetail',
    'deleteUser',
    'listAuditEvents',
    'listUsers',
    'updateUserRole',
    'updateUserStatus',
  ].sort(),
);

console.log('Persistent admin + bootstrap recovery authorization: PASS');
console.log('Suspended admins/users fail closed at admin access layer: PASS');
console.log('Admin overview and user views expose safe role/status metadata only: PASS');
console.log('User suspension revokes sessions and emits immutable audit insert: PASS');
console.log('Role changes require bootstrap permission and emit audit insert: PASS');
console.log('Admin user deletion enforces self/admin/username guards and audit cleanup: PASS');
console.log('AI Usage exposes Provider-reported Token/cost accounting summary: PASS');
console.log('S5 Admin V1 backend regression: PASS');
