import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { User } from '../users/user.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async findAll(userId: number | null): Promise<Category[]> {
    if (userId === null) {
      return this.categoriesRepository.find({
        where: { user_id: IsNull() },
        order: { display_order: 'ASC' },
      });
    }
    return this.categoriesRepository.find({
      where: [{ user_id: IsNull() }, { user_id: userId }],
      order: { display_order: 'ASC' },
    });
  }

  async create(createDto: CreateCategoryDto, user: User): Promise<Category> {
    const cat = this.categoriesRepository.create({
      ...createDto,
      user_id: user.id,
    });
    return this.categoriesRepository.save(cat);
  }

  async update(id: number, updateDto: UpdateCategoryDto, userId: number): Promise<Category> {
    const cat = await this.categoriesRepository.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.user_id !== userId) throw new ForbiddenException('Not yours');
    Object.assign(cat, updateDto);
    return this.categoriesRepository.save(cat);
  }

  // ✅ 修改为接收 ID 数组
  async updateOrder(orderIds: number[], userId: number): Promise<void> {
    // 将顺序数组中的 ID 与对应的分类关联，更新 display_order
    for (let i = 0; i < orderIds.length; i++) {
      const cat = await this.categoriesRepository.findOne({
        where: { user_id: userId, id: orderIds[i] },
      });
      if (cat) {
        cat.display_order = i;
        await this.categoriesRepository.save(cat);
      }
    }
  }
}