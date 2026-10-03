import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  getOrder(@Request() req: AuthenticatedRequest) {
    return this.ordersService.getOrder(req.user.userId);
  }

  @Post()
  updateOrder(@Body() updateOrderDto: UpdateOrderDto, @Request() req: AuthenticatedRequest) {
    return this.ordersService.updateOrder(req.user.userId, updateOrderDto.ordered_ids);
  }
}