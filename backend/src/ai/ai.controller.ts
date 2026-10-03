import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { AiAssistantService } from './ai-assistant.service';
import { AiService } from './ai.service';
import type { AiProviderCatalog } from './contracts/ai-provider';
import { AiAssistantGenerateDto } from './dto/ai-assistant-generate.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiAssistantService: AiAssistantService,
  ) {}

  @Get('providers')
  getProviders(): AiProviderCatalog {
    return this.aiService.getProviderCatalog();
  }

  @Get('byok/providers')
  getByokProviders(): AiProviderCatalog {
    return this.aiService.getByokProviderCatalog();
  }

  @Post('assistant/generate')
  generateAssistant(
    @Request() request: AuthenticatedRequest,
    @Body() dto: AiAssistantGenerateDto,
  ) {
    return this.aiAssistantService.generate(request.user.userId, dto);
  }
}
