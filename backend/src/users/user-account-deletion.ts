import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityManager,
  In,
  IsNull,
} from 'typeorm';
import { Favorite } from '../favorites/favorite.entity';
import { Tool } from '../tools/tool.entity';
import { ToolOrder } from '../orders/tool-order.entity';
import { Category } from '../categories/category.entity';
import { RefreshSession } from '../auth/refresh-session.entity';
import { User } from './user.entity';

export interface DeleteUserAccountOptions {
  expectedUsername?: string;
}

export interface DeletedUserAccountSummary {
  userId: number;
  username: string;
  previousRole: 'user' | 'admin';
  previousStatus: 'active' | 'suspended';
  revokedSessions: number;
  deletedSessions: number;
  deletedTools: number;
  deletedFavorites: number;
  deletedCategories: number;
  deletedToolOrders: number;
}

export async function deleteUserAccountData(
  manager: EntityManager,
  userId: number,
  options: DeleteUserAccountOptions = {},
): Promise<DeletedUserAccountSummary> {
  const usersRepository = manager.getRepository(User);
  const favoritesRepository = manager.getRepository(Favorite);
  const toolsRepository = manager.getRepository(Tool);
  const toolOrdersRepository = manager.getRepository(ToolOrder);
  const categoriesRepository = manager.getRepository(Category);
  const refreshSessionsRepository = manager.getRepository(RefreshSession);

  const user = await usersRepository.findOne({
    where: { id: userId },
    lock: { mode: 'pessimistic_write' },
  });

  if (!user) {
    throw new NotFoundException('用户不存在');
  }

  if (
    options.expectedUsername !== undefined
    && options.expectedUsername !== user.username
  ) {
    throw new BadRequestException('确认用户名不匹配');
  }

  if (user.role === 'admin') {
    throw new BadRequestException('管理员账号需先撤销管理员角色后再删除');
  }

  const ownedTools = await toolsRepository.find({
    where: { user_id: userId },
    select: ['id'],
  });
  const ownedToolIds = ownedTools.map((tool) => tool.id);
  const ownedToolIdSet = new Set(ownedToolIds);
  const userFavorites = await favoritesRepository.find({
    where: { user_id: userId },
    select: ['tool_id'],
  });
  const removedFavoriteCounts = new Map<number, number>();

  for (const favorite of userFavorites) {
    if (ownedToolIdSet.has(favorite.tool_id)) continue;
    removedFavoriteCounts.set(
      favorite.tool_id,
      (removedFavoriteCounts.get(favorite.tool_id) ?? 0) + 1,
    );
  }

  for (const [toolId, count] of removedFavoriteCounts) {
    await toolsRepository.decrement({ id: toolId }, 'favorite_count', count);
  }

  const revokedSessionsResult = await refreshSessionsRepository.update(
    {
      user_id: userId,
      revokedAt: IsNull(),
    },
    { revokedAt: new Date() },
  );
  const userFavoritesDelete = await favoritesRepository.delete({ user_id: userId });
  let ownedToolFavoritesDeleted = 0;
  if (ownedToolIds.length > 0) {
    const ownedToolFavoritesDelete = await favoritesRepository.delete({
      tool_id: In(ownedToolIds),
    });
    ownedToolFavoritesDeleted = ownedToolFavoritesDelete.affected ?? 0;
  }
  const toolOrdersDelete = await toolOrdersRepository.delete({ user_id: userId });
  const categoriesDelete = await categoriesRepository.delete({ user_id: userId });
  const toolsDelete = await toolsRepository.delete({ user_id: userId });
  const sessionsDelete = await refreshSessionsRepository.delete({ user_id: userId });
  await usersRepository.delete({ id: userId });

  return {
    userId: user.id,
    username: user.username,
    previousRole: user.role,
    previousStatus: user.status,
    revokedSessions: revokedSessionsResult.affected ?? 0,
    deletedSessions: sessionsDelete.affected ?? 0,
    deletedTools: toolsDelete.affected ?? 0,
    deletedFavorites:
      (userFavoritesDelete.affected ?? 0) + ownedToolFavoritesDeleted,
    deletedCategories: categoriesDelete.affected ?? 0,
    deletedToolOrders: toolOrdersDelete.affected ?? 0,
  };
}
