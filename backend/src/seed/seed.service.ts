import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool } from '../tools/tool.entity';
import { FAC, DEF_ICON } from './data/data';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Tool)
    private toolsRepository: Repository<Tool>,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'development') return;
    const count = await this.toolsRepository.count();
    if (count === 0) {
      this.logger.log('🌱 Seeding initial tools...');
      for (const tool of FAC) {
        const newTool = this.toolsRepository.create({
          name: tool.name,
          url: tool.url,
          description: tool.desc,
          tags: tool.tags || [],
          category: tool.cat,
          icon: tool.icon || DEF_ICON,
          is_custom: false,
          user_id: null,
        });
        await this.toolsRepository.save(newTool);
      }
      this.logger.log(`✅ Seeded ${FAC.length} tools.`);
    }
  }
}