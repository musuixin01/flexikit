import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tool } from './tool.entity';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { UsersModule } from '../users/users.module';
import { TagRecommendationService } from './tag-recommendation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tool]), UsersModule],
  providers: [ToolsService, TagRecommendationService],
  controllers: [ToolsController],
  exports: [ToolsService, TagRecommendationService],
})
export class ToolsModule {}