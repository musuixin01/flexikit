import { aiApi, type AiAssistantGenerateResult } from '@/api/ai'
import {
  loadByokCredential,
  type ByokProviderId,
} from './byokCredentialStore'
import type { CurrentToolContext } from './currentToolContext'
import type { CurrentFileContext } from './currentFileContext'
import type { CurrentClipboardContext } from './currentClipboardContext'

export type AiAssistantBillingMode = 'platform' | 'byok'

export interface GenerateAssistantInput {
  message: string
  billingMode: AiAssistantBillingMode
  providerId?: string
  modelId?: string
  currentTool?: CurrentToolContext
  currentFile?: CurrentFileContext
  currentClipboard?: CurrentClipboardContext
}

function asByokProviderId(providerId: string): ByokProviderId {
  if (
    providerId !== 'openai'
    && providerId !== 'gemini'
    && providerId !== 'anthropic'
  ) {
    throw new Error('当前 Provider 不支持 BYOK')
  }
  return providerId
}

export async function generateAssistantMessage(
  input: Readonly<GenerateAssistantInput>,
): Promise<AiAssistantGenerateResult> {
  if (input.billingMode === 'platform') {
    const response = await aiApi.generateAssistant({
      message: input.message,
      ...(input.providerId ? { providerId: input.providerId } : {}),
      ...(input.modelId ? { modelId: input.modelId } : {}),
      ...(input.currentTool ? { currentTool: input.currentTool } : {}),
      ...(input.currentFile ? { currentFile: input.currentFile } : {}),
      ...(input.currentClipboard ? { currentClipboard: input.currentClipboard } : {}),
    })
    return response.data
  }

  if (!input.providerId) {
    throw new Error('使用自己的 API Key 时必须选择 Provider')
  }

  const providerId = asByokProviderId(input.providerId)
  const credential = await loadByokCredential(providerId)
  if (!credential) {
    throw new Error('该 Provider 尚未配置 API Key，请先到账户设置中添加')
  }

  const response = await aiApi.generateAssistant({
    message: input.message,
    providerId,
    ...(input.modelId ? { modelId: input.modelId } : {}),
    ...(input.currentTool ? { currentTool: input.currentTool } : {}),
    ...(input.currentFile ? { currentFile: input.currentFile } : {}),
    ...(input.currentClipboard ? { currentClipboard: input.currentClipboard } : {}),
    byokApiKey: credential,
  })
  return response.data
}
