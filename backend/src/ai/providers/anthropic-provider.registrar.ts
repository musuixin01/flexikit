import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderRegistry } from '../ai-provider.registry';
import {
  AnthropicProvider,
  DEFAULT_ANTHROPIC_MODEL_ID,
} from './anthropic.provider';

@Injectable()
export class AnthropicProviderRegistrar implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: AiProviderRegistry,
  ) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY')?.trim();
    if (!apiKey) return;

    const defaultModelId = (
      this.configService.get<string>('ANTHROPIC_MODEL')?.trim()
      || DEFAULT_ANTHROPIC_MODEL_ID
    );

    this.registry.register(new AnthropicProvider({
      apiKey,
      defaultModelId,
    }));
  }
}
