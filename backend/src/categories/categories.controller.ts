import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedRequest, OptionalUserRequest } from '../common/types/authenticated-request';

@Controller('categories')
// 移除全局守卫，改为在需要登录的方法上加守卫
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Request() req: OptionalUserRequest) {
    const userId = req.user?.userId || null;
    return this.categoriesService.findAll(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateCategoryDto, @Request() req: AuthenticatedRequest) {
    return this.categoriesService.create(createDto, req.user.userId);
  }

  @Put('order')
  @UseGuards(JwtAuthGuard)
  updateOrder(@Body('order') order: number[], @Request() req: AuthenticatedRequest) {
    return this.categoriesService.updateOrder(order, req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto, @Request() req: AuthenticatedRequest) {
    return this.categoriesService.update(id, updateDto, req.user.userId);
  }
}