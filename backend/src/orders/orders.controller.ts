import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  getOrder(@Request() req) {
    return this.ordersService.getOrder(req.user.userId);
  }

  @Post()
  updateOrder(@Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    return this.ordersService.updateOrder(req.user.userId, updateOrderDto.ordered_ids);
  }
}