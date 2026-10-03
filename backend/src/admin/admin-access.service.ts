import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import {
  ADMIN_BOOTSTRAP_PERMISSIONS,
  ADMIN_READ_PERMISSIONS,
  ADMIN_WRITE_PERMISSIONS,
  type AdminAccessMode,
  type AdminPermission,
  parseAdminUserIds,
} from './admin-access';

export interface ResolvedAdminAccess {
  userId: number;
  username: string;
  accessMode: AdminAccessMode;
  permissions: AdminPermission[];
}

@Injectable()
export class AdminAccessService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private bootstrapUserIds(): ReadonlySet<number> {
    return parseAdminUserIds(
      this.configService.get<string>('ADMIN_USER_IDS'),
    );
  }

  async resolve(userId: number): Promise<ResolvedAdminAccess | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') return null;

    const isBootstrapAdmin = this.bootstrapUserIds().has(user.id);
    if (!isBootstrapAdmin && user.role !== 'admin') return null;

    const permissions: AdminPermission[] = [
      ...ADMIN_READ_PERMISSIONS,
      ...ADMIN_WRITE_PERMISSIONS,
      ...(isBootstrapAdmin ? ADMIN_BOOTSTRAP_PERMISSIONS : []),
    ];

    return {
      userId: user.id,
      username: user.username,
      accessMode: isBootstrapAdmin ? 'bootstrap-admin' : 'persistent-admin',
      permissions,
    };
  }

  async require(userId: number): Promise<ResolvedAdminAccess> {
    const access = await this.resolve(userId);
    if (!access) {
      throw new ForbiddenException('无管理端访问权限');
    }
    return access;
  }

  async requirePermission(
    userId: number,
    permission: AdminPermission,
  ): Promise<ResolvedAdminAccess> {
    const access = await this.require(userId);
    if (!access.permissions.includes(permission)) {
      throw new ForbiddenException('当前管理员权限不足');
    }
    return access;
  }
}
