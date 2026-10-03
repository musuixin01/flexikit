import { Injectable } from '@nestjs/common';
import { AiProviderRegistry } from './ai-provider.registry';
import { AiRoutingError } from './ai-provider.errors';
import type { AiResolvedRoute, AiRouteTarget } from './contracts/ai-provider';

@Injectable()
export class AiModelRouter {
  constructor(private readonly registry: AiProviderRegistry) {}

  resolve(target: AiRouteTarget = {}): AiResolvedRoute {
    const providers = this.registry.list();
    if (providers.length === 0) {
      throw new AiRoutingError(
        'NO_PROVIDER_AVAILABLE',
        '当前没有可用的 AI Provider',
      );
    }

    const provider = target.providerId
      ? this.registry.get(target.providerId)
      : providers[0];

    if (!provider) {
      throw new AiRoutingError(
        'PROVIDER_NOT_FOUND',
        `AI Provider "${target.providerId}" 不存在`,
      );
    }

    const modelId = target.modelId ?? provider.definition.defaultModelId;
    if (!provider.definition.models.some((model) => model.id === modelId)) {
      throw new AiRoutingError(
        'MODEL_NOT_FOUND',
        `AI Provider "${provider.definition.id}" 不支持模型 "${modelId}"`,
      );
    }

    return { provider, modelId };
  }

  resolveCandidates(target: AiRouteTarget = {}): AiResolvedRoute[] {
    const primary = this.resolve(target);
    if (target.providerId || target.modelId) {
      return [primary];
    }

    return this.registry.list().map((provider) => ({
      provider,
      modelId: provider.definition.defaultModelId,
    }));
  }
}
