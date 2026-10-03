import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Tool } from '../tools/tool.entity';
import { ToolOrder } from '../orders/tool-order.entity';
import { Category } from '../categories/category.entity';
import { RefreshSession } from '../auth/refresh-session.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { deleteUserAccountData } from './user-account-deletion';

type ProfileUpdateData = Pick<User, 'displayName' | 'avatar' | 'avatarType' | 'email'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    @InjectRepository(Tool)
    private toolsRepository: Repository<Tool>,
    @InjectRepository(ToolOrder)
    private toolOrdersRepository: Repository<ToolOrder>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 根据 ID 查找用户
   */
  findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * 创建新用户
   */
  create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  /**
   * 更新用户资料，只允许更新前端资料页需要的安全字段。
   */
  async update(id: number, updateData: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const filteredData: Partial<ProfileUpdateData> = {};
    if (updateData.displayName !== undefined) {
      filteredData.displayName = updateData.displayName;
    }
    if (updateData.avatar !== undefined) {
      filteredData.avatar = updateData.avatar;
    }
    if (updateData.avatarType !== undefined) {
      filteredData.avatarType = updateData.avatarType;
    }
    if (updateData.email !== undefined) {
      filteredData.email = updateData.email;
    }

    if (Object.keys(filteredData).length > 0) {
      await this.usersRepository.update(id, filteredData);
    }

    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('用户不存在');
    return updated;
  }

  /**
   * GDPR：导出用户的所有个人数据（JSON 格式）
   */
  async exportUserData(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const refreshSessionsRepository = this.dataSource.getRepository(RefreshSession);
    const [tools, favorites, toolOrders, categories, authSessions] = await Promise.all([
      this.toolsRepository.find({ where: { user_id: userId }, order: { id: 'ASC' } }),
      this.favoritesRepository.find({ where: { user_id: userId }, order: { id: 'ASC' } }),
      this.toolOrdersRepository.find({ where: { user_id: userId }, order: { id: 'ASC' } }),
      this.categoriesRepository.find({
        where: { user_id: userId },
        order: { display_order: 'ASC', id: 'ASC' },
      }),
      refreshSessionsRepository.find({
        where: { user_id: userId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        avatarType: user.avatarType,
        role: user.role,
        status: user.status,
        createdAt: user.created_at.toISOString(),
      },
      tools: tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        url: tool.url,
        description: tool.description,
        tags: tool.tags,
        category: tool.category,
        icon: tool.icon,
        isCustom: tool.is_custom,
        localPath: tool.local_path,
        cardColor: tool.card_color,
        createdAt: tool.created_at.toISOString(),
        updatedAt: tool.updated_at.toISOString(),
      })),
      favorites: favorites.map((favorite) => ({
        id: favorite.id,
        toolId: favorite.tool_id,
        createdAt: favorite.created_at.toISOString(),
      })),
      toolOrders: toolOrders.map((order) => ({
        id: order.id,
        orderedIds: order.ordered_ids,
      })),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        displayOrder: category.display_order,
        createdAt: category.created_at.toISOString(),
      })),
      authSessions: authSessions.map((session) => ({
        sessionId: session.id,
        clientType: session.clientType,
        clientInstanceId: session.clientInstanceId,
        clientName: session.clientName,
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null,
        lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
      })),
    };
  }

  /**
   * GDPR：删除用户账户及所有关联数据（不可逆）
   */
  async deleteUserAccount(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await deleteUserAccountData(manager, userId);
    });
  }
}
