import {
  AI_MODEL_CAPABILITY_KEYS,
  type AiModelCapability,
  type AiModelCapabilityProfile,
  type AiModelDefinition,
  type AiNativeCapabilitySupport,
} from './contracts/ai-provider';

export function capabilityRecord(
  overrides: Partial<Record<AiModelCapability, AiNativeCapabilitySupport>>,
  fallback: AiNativeCapabilitySupport = 'unsupported',
): Record<AiModelCapability, AiNativeCapabilitySupport> {
  return Object.fromEntries(
    AI_MODEL_CAPABILITY_KEYS.map((key) => [key, overrides[key] ?? fallback]),
  ) as Record<AiModelCapability, AiNativeCapabilitySupport>;
}

export function adapterCapabilityRecord(
  supported: readonly AiModelCapability[],
): Record<AiModelCapability, boolean> {
  const enabled = new Set<AiModelCapability>(supported);
  return Object.fromEntries(
    AI_MODEL_CAPABILITY_KEYS.map((key) => [key, enabled.has(key)]),
  ) as Record<AiModelCapability, boolean>;
}

export function unknownModelCapabilities(
  adapterSupported: readonly AiModelCapability[],
): AiModelCapabilityProfile {
  return {
    native: capabilityRecord({}, 'unknown'),
    adapter: adapterCapabilityRecord(adapterSupported),
  };
}

export function cloneAiModelDefinition(
  model: AiModelDefinition,
): AiModelDefinition {
  return {
    id: model.id,
    displayName: model.displayName,
    capabilities: {
      native: { ...model.capabilities.native },
      adapter: { ...model.capabilities.adapter },
      ...(model.capabilities.reasoningControls
        ? {
            reasoningControls: model.capabilities.reasoningControls.map((control) => ({
              kind: control.kind,
              ...(control.values ? { values: [...control.values] } : {}),
            })),
          }
        : {}),
    },
  };
}
