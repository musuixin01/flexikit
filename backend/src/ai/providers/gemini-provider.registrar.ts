import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderRegistry } from '../ai-provider.registry';
import {
  DEFAULT_GEMINI_MODEL_ID,
  GeminiProvider,
} from './gemini.provider';

@Injectable()
export class GeminiProviderRegistrar implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: AiProviderRegistry,
  ) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) return;

    const defaultModelId = (
      this.configService.get<string>('GEMINI_MODEL')?.trim()
      || DEFAULT_GEMINI_MODEL_ID
    );

    this.registry.register(new GeminiProvider({
      apiKey,
      defaultModelId,
    }));
  }
}
