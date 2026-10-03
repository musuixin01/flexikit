import { Injectable, Optional } from '@nestjs/common';
import { AiModelRouter } from './ai-model-router';
import { AiProviderRegistry } from './ai-provider.registry';
import { AiByokProviderFactory } from './ai-byok-provider.factory';
import { AiProviderExecutionError } from './ai-provider.errors';
import {
  AiResiliencePolicy,
  isRetryableAiProviderError,
} from './ai-resilience';
import { AiUsageService } from './ai-usage.service';
import type {
  AiByokCredential,
  AiGenerateRequest,
  AiProvider,
  AiProviderCatalog,
  AiProviderGenerateResult,
  AiResolvedRoute,
  AiRouteTarget,
  AiRoutedGenerateResult,
} from './contracts/ai-provider';

export interface AiUsageContext {
  userId?: number;
}

@Injectable()
export class AiService {
  private readonly resilience: AiResiliencePolicy;

  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly router: AiModelRouter,
    private readonly byokProviderFactory: AiByokProviderFactory,
    @Optional()
    private readonly aiUsageService?: AiUsageService,
    @Optional()
    resiliencePolicy?: AiResiliencePolicy,
  ) {
    this.resilience = resiliencePolicy ?? new AiResiliencePolicy();
  }

  getProviderCatalog(): AiProviderCatalog {
    return {
      providers: this.registry.catalog(),
    };
  }

  getByokProviderCatalog(): AiProviderCatalog {
    return this.byokProviderFactory.getCatalog();
  }

  async generateText(
    request: AiGenerateRequest,
    target: AiRouteTarget = {},
    byokCredential?: Readonly<AiByokCredential>,
    usageContext: Readonly<AiUsageContext> = {},
  ): Promise<AiRoutedGenerateResult> {
    const deadlineAt = (
      this.resilience.now() + this.resilience.config.totalTimeoutMs
    );

    if (byokCredential) {
      const providerId = target.providerId?.trim();
      if (!providerId) {
        throw new AiProviderExecutionError(
          'INVALID_REQUEST',
          'BYOK 调用必须明确指定 Provider',
          'byok',
        );
      }

      const requestedModelId = target.modelId?.trim() || undefined;
      const provider = this.byokProviderFactory.create(
        providerId,
        byokCredential.apiKey,
        requestedModelId,
      );
      const modelId = requestedModelId ?? provider.definition.defaultModelId;
      return this.generateAcrossRoutes(
        [{ provider, modelId }],
        request,
        'byok',
        usageContext,
        deadlineAt,
        false,
      );
    }

    const resolvedRoutes = this.router.resolveCandidates(target);
    const allowFallback = (
      this.resilience.config.fallbackEnabled
      && !target.providerId
      && !target.modelId
    );
    const routes = allowFallback
      ? resolvedRoutes
      : [resolvedRoutes[0]];

    return this.generateAcrossRoutes(
      routes,
      request,
      'platform',
      usageContext,
      deadlineAt,
      allowFallback,
    );
  }

  private async generateAcrossRoutes(
    routes: readonly AiResolvedRoute[],
    request: AiGenerateRequest,
    billingMode: 'platform' | 'byok',
    usageContext: Readonly<AiUsageContext>,
    deadlineAt: number,
    allowFallback: boolean,
  ): Promise<AiRoutedGenerateResult> {
    let lastError: unknown;

    for (let index = 0; index < routes.length; index += 1) {
      const route = routes[index];
      try {
        const result = await this.generateProviderWithRetries(
          route.provider,
          route.modelId,
          request,
          deadlineAt,
        );
        return this.completeResult(
          result,
          route.provider,
          route.modelId,
          billingMode,
          usageContext,
        );
      } catch (error: unknown) {
        lastError = error;
        const hasFallback = index < routes.length - 1;
        if (
          !allowFallback
          || !hasFallback
          || !isRetryableAiProviderError(error)
          || this.resilience.now() >= deadlineAt
        ) {
          throw error;
        }
      }
    }

    throw lastError ?? new AiProviderExecutionError(
      'UPSTREAM_UNAVAILABLE',
      '当前没有可完成请求的 AI Provider',
      'router',
    );
  }

  private async generateProviderWithRetries(
    provider: AiProvider,
    modelId: string,
    request: AiGenerateRequest,
    deadlineAt: number,
  ): Promise<AiProviderGenerateResult> {
    const maxAttempts = this.resilience.config.maxAttemptsPerProvider;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.generateProviderAttempt(
          provider,
          modelId,
          request,
          deadlineAt,
        );
      } catch (error: unknown) {
        if (
          !isRetryableAiProviderError(error)
          || attempt >= maxAttempts
        ) {
          throw error;
        }

        const remainingMs = deadlineAt - this.resilience.now();
        if (remainingMs <= 0) throw error;

        const delayMs = this.resilience.retryDelayMs(error, attempt);
        if (delayMs >= remainingMs) throw error;
        if (delayMs > 0) {
          await this.resilience.sleep(delayMs);
        }
      }
    }

    throw new AiProviderExecutionError(
      'UPSTREAM_UNAVAILABLE',
      'AI Provider 重试流程异常结束',
      provider.definition.id,
    );
  }

  private async generateProviderAttempt(
    provider: AiProvider,
    modelId: string,
    request: AiGenerateRequest,
    deadlineAt: number,
  ): Promise<AiProviderGenerateResult> {
    const remainingMs = deadlineAt - this.resilience.now();
    if (remainingMs <= 0) {
      throw new AiProviderExecutionError(
        'UPSTREAM_TIMEOUT',
        'AI 请求超过总执行时限',
        provider.definition.id,
      );
    }

    const attemptTimeoutMs = Math.max(
      1,
      Math.min(this.resilience.config.attemptTimeoutMs, remainingMs),
    );
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const timeoutError = new AiProviderExecutionError(
      'UPSTREAM_TIMEOUT',
      'AI Provider 单次请求超时',
      provider.definition.id,
    );
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(timeoutError);
      }, attemptTimeoutMs);
    });

    try {
      return await Promise.race([
        provider.generateText({
          ...request,
          modelId,
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);
    } catch (error: unknown) {
      if (timedOut) throw timeoutError;
      throw error;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async completeResult(
    result: AiProviderGenerateResult,
    provider: AiProvider,
    modelId: string,
    billingMode: 'platform' | 'byok',
    usageContext: Readonly<AiUsageContext>,
  ): Promise<AiRoutedGenerateResult> {

    if (result.usage && this.aiUsageService) {
      await this.aiUsageService.record({
        userId: usageContext.userId,
        providerId: provider.definition.id,
        modelId,
        billingMode,
        usage: result.usage,
      });
    }

    return {
      ...result,
      providerId: provider.definition.id,
      modelId,
    };
  }
}
