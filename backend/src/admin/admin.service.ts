import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  ILike,
  IsNull,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  User,
  type UserAccountStatus,
  type UserRole,
} from '../users/user.entity';
import { deleteUserAccountData } from '../users/user-account-deletion';
import { Tool } from '../tools/tool.entity';
import { Favorite } from '../favorites/favorite.entity';
import { RefreshSession } from '../auth/refresh-session.entity';
import {
  AiUsageService,
  type AdminAiUsageSummary,
} from '../ai/ai-usage.service';
import { AdminAuditEvent } from './admin-audit-event.entity';
import { AdminAccessService } from './admin-access.service';
import type { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import type { AdminAuditQueryDto } from './dto/admin-audit-query.dto';

export interface AdminOverview {
  totalUsers: number;
  newUsersLast7Days: number;
  totalTools: number;
  totalFavorites: number;
  activeSessions: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  aiUsageTracking: 'active';
}

export interface AdminUserListItem {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: UserAccountStatus;
  createdAt: string;
}

export interface AdminUserListResult {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserSessionSummary {
  clientType: string;
  clientName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface AdminUserDetail extends AdminUserListItem {
  toolCount: number;
  favoriteCount: number;
  sessionCount: number;
  activeSessionCount: number;
  recentSessions: AdminUserSessionSummary[];
}

export interface AdminAuditEventItem {
  id: number;
  actorUserId: number;
  actorUsername: string;
  accessMode: 'persistent-admin' | 'bootstrap-admin';
  action: string;
  targetUserId: number | null;
  targetUsername: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AdminAuditEventListResult {
  items: AdminAuditEventItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminDeleteUserResult {
  deletedUserId: number;
  username: string;
}

function sessionStatus(
  session: Pick<RefreshSession, 'revokedAt' | 'expiresAt'>,
  nowMs: number,
): AdminUserSessionSummary['status'] {
  if (session.revokedAt) return 'revoked';
  if (session.expiresAt.getTime() <= nowMs) return 'expired';
  return 'active';
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Tool)
    private readonly toolsRepository: Repository<Tool>,
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionsRepository: Repository<RefreshSession>,
    @InjectRepository(AdminAuditEvent)
    private readonly adminAuditRepository: Repository<AdminAuditEvent>,
    private readonly dataSource: DataSource,
    private readonly adminAccessService: AdminAccessService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async getOverview(): Promise<AdminOverview> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const [
      totalUsers,
      newUsersLast7Days,
      totalTools,
      totalFavorites,
      activeSessions,
      activeUsers,
      suspendedUsers,
      adminUsers,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({
        where: { created_at: MoreThanOrEqual(sevenDaysAgo) },
      }),
      this.toolsRepository.count(),
      this.favoritesRepository.count(),
      this.refreshSessionsRepository.count({
        where: {
          revokedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
      }),
      this.usersRepository.count({ where: { status: 'active' } }),
      this.usersRepository.count({ where: { status: 'suspended' } }),
      this.usersRepository.count({ where: { role: 'admin' } }),
    ]);

    return {
      totalUsers,
      newUsersLast7Days,
      totalTools,
      totalFavorites,
      activeSessions,
      activeUsers,
      suspendedUsers,
      adminUsers,
      aiUsageTracking: 'active',
    };
  }

  async listUsers(query: AdminUsersQueryDto): Promise<AdminUserListResult> {
    const page = query.page;
    const pageSize = query.pageSize;
    const search = query.search?.trim();
    const where = search
      ? [
          { username: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
          { displayName: ILike(`%${search}%`) },
        ]
      : undefined;

    const [users, total] = await this.usersRepository.findAndCount({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        created_at: true,
      },
      order: {
        created_at: 'DESC',
        id: 'DESC',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.created_at.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async getUserDetail(userId: number): Promise<AdminUserDetail> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const now = new Date();
    const [
      toolCount,
      favoriteCount,
      sessionCount,
      activeSessionCount,
      sessions,
    ] = await Promise.all([
      this.toolsRepository.count({ where: { user_id: userId } }),
      this.favoritesRepository.count({ where: { user_id: userId } }),
      this.refreshSessionsRepository.count({ where: { user_id: userId } }),
      this.refreshSessionsRepository.count({
        where: {
          user_id: userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
      }),
      this.refreshSessionsRepository.find({
        where: { user_id: userId },
        select: {
          clientType: true,
          clientName: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
        order: {
          lastUsedAt: 'DESC',
          createdAt: 'DESC',
        },
        take: 20,
      }),
    ]);

    const nowMs = now.getTime();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      createdAt: user.created_at.toISOString(),
      toolCount,
      favoriteCount,
      sessionCount,
      activeSessionCount,
      recentSessions: sessions.map((session) => ({
        clientType: session.clientType,
        clientName: session.clientName,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
        expiresAt: session.expiresAt.toISOString(),
        status: sessionStatus(session, nowMs),
      })),
    };
  }

  async listAuditEvents(
    query: AdminAuditQueryDto,
  ): Promise<AdminAuditEventListResult> {
    const [events, total] = await this.adminAuditRepository.findAndCount({
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      items: events.map((event) => ({
        id: event.id,
        actorUserId: event.actorUserId,
        actorUsername: event.actorUsername,
        accessMode: event.accessMode,
        action: event.action,
        targetUserId: event.targetUserId,
        targetUsername: event.targetUsername,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    };
  }

  async updateUserStatus(
    actorUserId: number,
    targetUserId: number,
    nextStatus: UserAccountStatus,
  ): Promise<AdminUserDetail> {
    const actorAccess = await this.adminAccessService.requirePermission(
      actorUserId,
      'admin.users.status.write',
    );
    if (actorUserId === targetUserId) {
      throw new BadRequestException('管理员不能修改自己的账号状态');
    }

    await this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const refreshRepository = manager.getRepository(RefreshSession);
      const auditRepository = manager.getRepository(AdminAuditEvent);
      const target = await usersRepository.findOne({
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('用户不存在');

      if (
        target.role === 'admin'
        && actorAccess.accessMode !== 'bootstrap-admin'
      ) {
        throw new ForbiddenException('普通管理员不能修改其他管理员状态');
      }

      if (target.status === nextStatus) return;

      if (target.role === 'admin' && nextStatus === 'suspended') {
        const remainingActiveAdmins = await usersRepository.count({
          where: {
            id: Not(target.id),
            role: 'admin',
            status: 'active',
          },
        });
        if (remainingActiveAdmins === 0) {
          throw new BadRequestException('至少需要保留一个有效的持久管理员');
        }
      }

      const previousStatus = target.status;
      target.status = nextStatus;
      await usersRepository.save(target);

      let revokedSessions = 0;
      if (nextStatus === 'suspended') {
        const revokeResult = await refreshRepository.update(
          {
            user_id: target.id,
            revokedAt: IsNull(),
          },
          { revokedAt: new Date() },
        );
        revokedSessions = revokeResult.affected ?? 0;
      }

      await auditRepository.insert({
        actorUserId: actorAccess.userId,
        actorUsername: actorAccess.username,
        accessMode: actorAccess.accessMode,
        action: 'user.status.changed',
        targetUserId: target.id,
        targetUsername: target.username,
        metadata: {
          previousStatus,
          nextStatus,
          revokedSessions,
        },
      });
    });

    return this.getUserDetail(targetUserId);
  }

  async updateUserRole(
    actorUserId: number,
    targetUserId: number,
    nextRole: UserRole,
  ): Promise<AdminUserDetail> {
    const actorAccess = await this.adminAccessService.requirePermission(
      actorUserId,
      'admin.users.role.write',
    );

    await this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const auditRepository = manager.getRepository(AdminAuditEvent);
      const target = await usersRepository.findOne({
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('用户不存在');
      if (target.role === nextRole) return;
      if (actorUserId === targetUserId && nextRole !== 'admin') {
        throw new BadRequestException('管理员不能撤销自己的管理员角色');
      }

      if (target.role === 'admin' && nextRole === 'user') {
        const remainingActiveAdmins = await usersRepository.count({
          where: {
            id: Not(target.id),
            role: 'admin',
            status: 'active',
          },
        });
        if (remainingActiveAdmins === 0) {
          throw new BadRequestException('至少需要保留一个有效的持久管理员');
        }
      }

      const previousRole = target.role;
      target.role = nextRole;
      await usersRepository.save(target);
      await auditRepository.insert({
        actorUserId: actorAccess.userId,
        actorUsername: actorAccess.username,
        accessMode: actorAccess.accessMode,
        action: 'user.role.changed',
        targetUserId: target.id,
        targetUsername: target.username,
        metadata: {
          previousRole,
          nextRole,
        },
      });
    });

    return this.getUserDetail(targetUserId);
  }

  async deleteUserAccount(
    actorUserId: number,
    targetUserId: number,
    confirmationUsername: string,
  ): Promise<AdminDeleteUserResult> {
    const actorAccess = await this.adminAccessService.requirePermission(
      actorUserId,
      'admin.users.delete.write',
    );
    if (actorUserId === targetUserId) {
      throw new BadRequestException('管理员不能删除自己的账号');
    }

    return this.dataSource.transaction(async (manager) => {
      const deleted = await deleteUserAccountData(manager, targetUserId, {
        expectedUsername: confirmationUsername,
      });
      const auditRepository = manager.getRepository(AdminAuditEvent);

      await auditRepository.insert({
        actorUserId: actorAccess.userId,
        actorUsername: actorAccess.username,
        accessMode: actorAccess.accessMode,
        action: 'user.account.deleted',
        targetUserId: deleted.userId,
        targetUsername: deleted.username,
        metadata: {
          previousRole: deleted.previousRole,
          previousStatus: deleted.previousStatus,
          revokedSessions: deleted.revokedSessions,
          deletedSessions: deleted.deletedSessions,
          deletedTools: deleted.deletedTools,
          deletedFavorites: deleted.deletedFavorites,
          deletedCategories: deleted.deletedCategories,
          deletedToolOrders: deleted.deletedToolOrders,
        },
      });

      return {
        deletedUserId: deleted.userId,
        username: deleted.username,
      };
    });
  }

  getAiUsageStatus(): Promise<AdminAiUsageSummary> {
    return this.aiUsageService.getAdminSummary();
  }
}
