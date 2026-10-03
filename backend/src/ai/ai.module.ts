import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AiByokProviderFactory } from './ai-byok-provider.factory';
import { AiModelRouter } from './ai-model-router';
import { AiProviderRegistry } from './ai-provider.registry';
import { AiService } from './ai.service';
import { AiResiliencePolicy } from './ai-resilience';
import { AiUsageEvent } from './ai-usage-event.entity';
import { AiUsageService } from './ai-usage.service';
import { OpenAiProviderRegistrar } from './providers/openai-provider.registrar';
import { GeminiProviderRegistrar } from './providers/gemini-provider.registrar';
import { AnthropicProviderRegistrar } from './providers/anthropic-provider.registrar';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsageEvent])],
  controllers: [AiController],
  providers: [
    AiProviderRegistry,
    AiModelRouter,
    AiByokProviderFactory,
    AiResiliencePolicy,
    AiUsageService,
    AiService,
    AiAssistantService,
    OpenAiProviderRegistrar,
    GeminiProviderRegistrar,
    AnthropicProviderRegistrar,
  ],
  exports: [AiProviderRegistry, AiModelRouter, AiUsageService, AiService],
})
export class AiModule {}
