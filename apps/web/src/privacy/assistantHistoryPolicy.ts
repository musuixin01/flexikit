export const AI_PROMPT_HISTORY_STORAGE_KEY = 'flexikit-ai-prompt-history-v1' as const

export const ASSISTANT_HISTORY_POLICY = Object.freeze({
  mode: 'session-only',
  clientPersistence: 'disabled',
  serverPersistence: 'disabled',
  retention: 'until-page-reload',
  attachmentRetention: 'excluded',
  backup: 'excluded',
  futureLocalPersistenceRequiresExplicitOptIn: true,
  displayLabel: '仅本次会话',
} as const)

export type AssistantHistoryPolicy = typeof ASSISTANT_HISTORY_POLICY

export function isAssistantHistoryPersistenceAllowed(): false {
  return false
}
