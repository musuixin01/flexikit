import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolOrder } from './tool-order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(ToolOrder)
    private ordersRepository: Repository<ToolOrder>,
  ) {}

  async getOrder(userId: number): Promise<number[]> {
    const order = await this.ordersRepository.findOne({ where: { user_id: userId } });
    return order ? order.ordered_ids : [];
  }

  async updateOrder(userId: number, orderedIds: number[]): Promise<void> {
    let order = await this.ordersRepository.findOne({ where: { user_id: userId } });
    if (order) {
      order.ordered_ids = orderedIds;
      await this.ordersRepository.save(order);
    } else {
      const newOrder = this.ordersRepository.create({ user_id: userId, ordered_ids: orderedIds });
      await this.ordersRepository.save(newOrder);
    }
  }
}