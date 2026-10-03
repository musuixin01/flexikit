import api from './client'

export interface AiModelCatalogItem {
  id: string
  displayName: string
}

export interface AiProviderCatalogItem {
  id: string
  displayName: string
  defaultModelId: string
  models: AiModelCatalogItem[]
}

export interface AiProviderCatalog {
  providers: AiProviderCatalogItem[]
}

export interface AiAssistantToolContext {
  id?: number
  name: string
  category?: string
  kind: 'web' | 'local'
  host?: string
}

export interface AiAssistantFileContext {
  name: string
  extension: string
  content: string
}

export interface AiAssistantClipboardContext {
  content: string
}

export interface AiAssistantGenerateRequest {
  message: string
  providerId?: string
  modelId?: string
  byokApiKey?: string
  currentTool?: AiAssistantToolContext
  currentFile?: AiAssistantFileContext
  currentClipboard?: AiAssistantClipboardContext
}

export interface AiAssistantGenerateResult {
  text: string
  providerId: string
  modelId: string
  finishReason?: 'stop' | 'length' | 'content_filter' | 'other'
}

export const aiApi = {
  getProviders: () => api.get<AiProviderCatalog>('/ai/providers'),
  getByokProviders: () => api.get<AiProviderCatalog>('/ai/byok/providers'),
  generateAssistant: (request: AiAssistantGenerateRequest) =>
    api.post<AiAssistantGenerateResult>(
      '/ai/assistant/generate',
      request,
      { timeout: 100_000 },
    ),
}
