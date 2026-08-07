import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  controllers: [StatsController],
})
export class StatsModule {}