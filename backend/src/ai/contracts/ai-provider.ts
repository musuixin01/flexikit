export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiGenerationParameters {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiGenerateRequest {
  messages: readonly AiMessage[];
  parameters?: Readonly<AiGenerationParameters>;
}

export interface AiByokCredential {
  apiKey: string;
}

export interface AiProviderGenerateRequest extends AiGenerateRequest {
  modelId: string;
  signal?: AbortSignal;
}

export type AiFinishReason = 'stop' | 'length' | 'content_filter' | 'other';

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  cacheWrite5mInputTokens: number;
  cacheWrite1hInputTokens: number;
  reasoningTokens: number;
}

export interface AiProviderGenerateResult {
  text: string;
  finishReason?: AiFinishReason;
  usage?: AiTokenUsage;
}

export const AI_MODEL_CAPABILITY_KEYS = [
  'textGeneration',
  'vision',
  'streaming',
  'toolCalling',
  'structuredOutput',
  'reasoningControl',
  'temperature',
  'maxOutputTokens',
] as const;

export type AiModelCapability = typeof AI_MODEL_CAPABILITY_KEYS[number];
export type AiNativeCapabilitySupport =
  | 'supported'
  | 'conditional'
  | 'unsupported'
  | 'unknown';
export type AiReasoningControlKind =
  | 'effort'
  | 'thinking-level'
  | 'manual-budget';

export interface AiReasoningControlDefinition {
  kind: AiReasoningControlKind;
  values?: readonly string[];
}

export interface AiModelCapabilityProfile {
  native: Readonly<Record<AiModelCapability, AiNativeCapabilitySupport>>;
  adapter: Readonly<Record<AiModelCapability, boolean>>;
  reasoningControls?: readonly AiReasoningControlDefinition[];
}

export interface AiModelDefinition {
  id: string;
  displayName: string;
  capabilities: AiModelCapabilityProfile;
}

export interface AiProviderDefinition {
  id: string;
  displayName: string;
  defaultModelId: string;
  models: readonly AiModelDefinition[];
}

export interface AiProvider {
  readonly definition: AiProviderDefinition;
  generateText(request: AiProviderGenerateRequest): Promise<AiProviderGenerateResult>;
}

export interface AiRouteTarget {
  providerId?: string;
  modelId?: string;
}

export interface AiResolvedRoute {
  provider: AiProvider;
  modelId: string;
}

export interface AiRoutedGenerateResult extends AiProviderGenerateResult {
  providerId: string;
  modelId: string;
}

export interface AiProviderCatalogItem {
  id: string;
  displayName: string;
  defaultModelId: string;
  models: AiModelDefinition[];
}

export interface AiProviderCatalog {
  providers: AiProviderCatalogItem[];
}
