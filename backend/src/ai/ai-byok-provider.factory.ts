import { Injectable } from '@nestjs/common';
import { AiProviderExecutionError } from './ai-provider.errors';
import type {
  AiProvider,
  AiProviderCatalog,
  AiProviderCatalogItem,
} from './contracts/ai-provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { cloneAiModelDefinition } from './model-capabilities';

const CATALOG_PLACEHOLDER_CREDENTIAL = 'flexikit-byok-catalog-placeholder';

function toCatalogItem(provider: AiProvider): AiProviderCatalogItem {
  return {
    id: provider.definition.id,
    displayName: provider.definition.displayName,
    defaultModelId: provider.definition.defaultModelId,
    models: provider.definition.models.map(cloneAiModelDefinition),
  };
}

@Injectable()
export class AiByokProviderFactory {
  getCatalog(): AiProviderCatalog {
    return {
      providers: [
        new OpenAiProvider({ apiKey: CATALOG_PLACEHOLDER_CREDENTIAL }),
        new GeminiProvider({ apiKey: CATALOG_PLACEHOLDER_CREDENTIAL }),
        new AnthropicProvider({ apiKey: CATALOG_PLACEHOLDER_CREDENTIAL }),
      ].map(toCatalogItem),
    };
  }

  create(
    providerId: string,
    apiKey: string,
    defaultModelId?: string,
  ): AiProvider {
    const normalizedProviderId = providerId.trim();
    const normalizedModelId = defaultModelId?.trim() || undefined;

    if (normalizedProviderId === 'openai') {
      return new OpenAiProvider({
        apiKey,
        defaultModelId: normalizedModelId,
      });
    }

    if (normalizedProviderId === 'gemini') {
      return new GeminiProvider({
        apiKey,
        defaultModelId: normalizedModelId,
      });
    }

    if (normalizedProviderId === 'anthropic') {
      return new AnthropicProvider({
        apiKey,
        defaultModelId: normalizedModelId,
      });
    }

    throw new AiProviderExecutionError(
      'INVALID_REQUEST',
      '当前 BYOK Provider 不受支持',
      normalizedProviderId || 'byok',
    );
  }
}
