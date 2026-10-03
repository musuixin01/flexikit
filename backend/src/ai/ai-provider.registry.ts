import { Injectable } from '@nestjs/common';
import type {
  AiModelCapabilityProfile,
  AiProvider,
  AiProviderCatalogItem,
  AiProviderDefinition,
} from './contracts/ai-provider';
import {
  AI_MODEL_CAPABILITY_KEYS,
} from './contracts/ai-provider';
import { AiProviderRegistrationError } from './ai-provider.errors';
import { cloneAiModelDefinition } from './model-capabilities';

const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const NATIVE_SUPPORT_VALUES = new Set([
  'supported',
  'conditional',
  'unsupported',
  'unknown',
]);
const REASONING_CONTROL_KINDS = new Set([
  'effort',
  'thinking-level',
  'manual-budget',
]);

function validateCapabilities(
  providerId: string,
  modelId: string,
  capabilities: AiModelCapabilityProfile | undefined,
): void {
  if (
    !capabilities
    || !capabilities.native
    || !capabilities.adapter
  ) {
    throw new AiProviderRegistrationError(
      'INVALID_PROVIDER_DEFINITION',
      `AI Provider "${providerId}" 的模型 "${modelId}" 缺少能力标签`,
    );
  }

  for (const key of AI_MODEL_CAPABILITY_KEYS) {
    const nativeValue = capabilities.native?.[key];
    const adapterValue = capabilities.adapter?.[key];
    if (
      !NATIVE_SUPPORT_VALUES.has(nativeValue)
      || typeof adapterValue !== 'boolean'
      || (nativeValue === 'unsupported' && adapterValue)
    ) {
      throw new AiProviderRegistrationError(
        'INVALID_PROVIDER_DEFINITION',
        `AI Provider "${providerId}" 的模型 "${modelId}" 包含无效能力标签`,
      );
    }
  }

  if (!capabilities.reasoningControls) return;

  const seenKinds = new Set<string>();
  for (const control of capabilities.reasoningControls) {
    if (
      !REASONING_CONTROL_KINDS.has(control.kind)
      || seenKinds.has(control.kind)
      || control.values?.some((value) => !value.trim())
      || (control.values && new Set(control.values).size !== control.values.length)
    ) {
      throw new AiProviderRegistrationError(
        'INVALID_PROVIDER_DEFINITION',
        `AI Provider "${providerId}" 的模型 "${modelId}" 包含无效推理控制定义`,
      );
    }
    seenKinds.add(control.kind);
  }
}

function validateProviderDefinition(definition: AiProviderDefinition): void {
  if (!PROVIDER_ID_PATTERN.test(definition.id)) {
    throw new AiProviderRegistrationError(
      'INVALID_PROVIDER_ID',
      `AI Provider id "${definition.id}" 不符合命名规则`,
    );
  }

  if (!definition.displayName.trim() || definition.models.length === 0) {
    throw new AiProviderRegistrationError(
      'INVALID_PROVIDER_DEFINITION',
      `AI Provider "${definition.id}" 必须提供显示名称和至少一个模型`,
    );
  }

  const modelIds = new Set<string>();
  for (const model of definition.models) {
    if (!model.id.trim() || !model.displayName.trim() || modelIds.has(model.id)) {
      throw new AiProviderRegistrationError(
        'INVALID_PROVIDER_DEFINITION',
        `AI Provider "${definition.id}" 包含无效或重复的模型定义`,
      );
    }
    validateCapabilities(definition.id, model.id, model.capabilities);
    modelIds.add(model.id);
  }

  if (!modelIds.has(definition.defaultModelId)) {
    throw new AiProviderRegistrationError(
      'INVALID_PROVIDER_DEFINITION',
      `AI Provider "${definition.id}" 的默认模型不存在于模型列表中`,
    );
  }
}

function toCatalogItem(definition: AiProviderDefinition): AiProviderCatalogItem {
  return {
    id: definition.id,
    displayName: definition.displayName,
    defaultModelId: definition.defaultModelId,
    models: definition.models.map(cloneAiModelDefinition),
  };
}

@Injectable()
export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();

  register(provider: AiProvider): void {
    validateProviderDefinition(provider.definition);

    if (this.providers.has(provider.definition.id)) {
      throw new AiProviderRegistrationError(
        'DUPLICATE_PROVIDER',
        `AI Provider "${provider.definition.id}" 已注册`,
      );
    }

    this.providers.set(provider.definition.id, provider);
  }

  get(providerId: string): AiProvider | undefined {
    return this.providers.get(providerId);
  }

  list(): AiProvider[] {
    return [...this.providers.values()];
  }

  catalog(): AiProviderCatalogItem[] {
    return this.list().map((provider) => toCatalogItem(provider.definition));
  }
}
