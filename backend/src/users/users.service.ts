import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Tool } from '../tools/tool.entity';
import { ToolOrder } from '../orders/tool-order.entity';
import { Category } from '../categories/category.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['tools', 'favorites', 'toolOrders', 'categories'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        avatarType: user.avatarType,
        createdAt: user.created_at,
      },
      tools: user.tools || [],
      favorites: user.favorites || [],
      toolOrders: user.toolOrders || [],
      categories: user.categories || [],
    };
  }

  /**
   * GDPR：删除用户账户及所有关联数据（不可逆）
   */
  async deleteUserAccount(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 按依赖顺序删除关联数据
    await this.favoritesRepository.delete({ user: { id: userId } });
    await this.toolOrdersRepository.delete({ user: { id: userId } });
    await this.categoriesRepository.delete({ user: { id: userId } });
    await this.toolsRepository.delete({ user: { id: userId } });

    // 最后删除用户本身
    await this.usersRepository.remove(user);
  }
}