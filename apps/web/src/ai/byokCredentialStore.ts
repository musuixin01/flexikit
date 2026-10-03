import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'

export const BYOK_PROVIDER_IDS = ['openai', 'gemini', 'anthropic'] as const
export type ByokProviderId = typeof BYOK_PROVIDER_IDS[number]

const browserCredentials = new Map<ByokProviderId, string>()

function assertProviderId(providerId: string): asserts providerId is ByokProviderId {
  if (!BYOK_PROVIDER_IDS.includes(providerId as ByokProviderId)) {
    throw new Error('Unsupported BYOK provider')
  }
}

function normalizeCredential(value: string): string {
  const credential = value.trim()
  if (
    credential.length === 0
    || credential.length > 32 * 1024
    || credential.includes('\r')
    || credential.includes('\n')
  ) {
    throw new Error('Invalid BYOK credential')
  }
  return credential
}

export async function storeByokCredential(
  providerId: ByokProviderId,
  value: string,
): Promise<void> {
  assertProviderId(providerId)
  const credential = normalizeCredential(value)

  if (isDesktopRuntime()) {
    await invokeDesktop('store_ai_provider_credential', {
      provider: providerId,
      credential,
    })
    return
  }

  browserCredentials.set(providerId, credential)
}

export async function loadByokCredential(
  providerId: ByokProviderId,
): Promise<string | null> {
  assertProviderId(providerId)

  if (isDesktopRuntime()) {
    const credential = await invokeDesktop<string | null>(
      'load_ai_provider_credential',
      { provider: providerId },
    )
    return credential ? normalizeCredential(credential) : null
  }

  return browserCredentials.get(providerId) ?? null
}

export async function hasByokCredential(
  providerId: ByokProviderId,
): Promise<boolean> {
  return (await loadByokCredential(providerId)) !== null
}

export async function clearByokCredential(
  providerId: ByokProviderId,
): Promise<void> {
  assertProviderId(providerId)
  browserCredentials.delete(providerId)

  if (isDesktopRuntime()) {
    await invokeDesktop('clear_ai_provider_credential', {
      provider: providerId,
    })
  }
}

export async function clearAllByokCredentials(): Promise<void> {
  await Promise.all(BYOK_PROVIDER_IDS.map(clearByokCredential))
}
