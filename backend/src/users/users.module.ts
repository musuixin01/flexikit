import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Tool } from '../tools/tool.entity';
import { ToolOrder } from '../orders/tool-order.entity';
import { Category } from '../categories/category.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Favorite, Tool, ToolOrder, Category])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}