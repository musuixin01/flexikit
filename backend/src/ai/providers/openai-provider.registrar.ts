import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderRegistry } from '../ai-provider.registry';
import {
  DEFAULT_OPENAI_MODEL_ID,
  OpenAiProvider,
} from './openai.provider';

@Injectable()
export class OpenAiProviderRegistrar implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: AiProviderRegistry,
  ) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return;

    const defaultModelId = (
      this.configService.get<string>('OPENAI_MODEL')?.trim()
      || DEFAULT_OPENAI_MODEL_ID
    );

    this.registry.register(new OpenAiProvider({
      apiKey,
      defaultModelId,
    }));
  }
}
