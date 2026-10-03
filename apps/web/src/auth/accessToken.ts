import { invokeDesktop, isDesktopRuntime } from '@/api/runtime';

export interface AccessTokenLifecycle {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: string;
}

export const ACCESS_TOKEN_KEY = 'token';
export const ACCESS_TOKEN_EXPIRES_AT_KEY = 'flexikit-access-token-expires-at';

type DesktopSecureToken = [string, string] | null;

let browserAccessToken: string | null = null;
let browserAccessExpiresAt: string | null = null;
let browserHydrated = false;

let desktopAccessToken: string | null = null;
let desktopAccessExpiresAt: string | null = null;
let desktopHydrated = false;
let desktopHydration: Promise<void> | null = null;

function storage(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function decodeJwtExpiryMs(token: string): number | null {
  if (typeof window === 'undefined' || typeof window.atob !== 'function') return null;

  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded: unknown = JSON.parse(window.atob(padded));
    if (!decoded || typeof decoded !== 'object') return null;

    const exp = (decoded as Record<string, unknown>).exp;
    return typeof exp === 'number' && Number.isFinite(exp)
      ? exp * 1000
      : null;
  } catch {
    return null;
  }
}

function validExpiry(value: string | null): value is string {
  return Boolean(value) && Number.isFinite(Date.parse(value as string));
}

function clearLegacyBrowserCopy(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS_TOKEN_KEY);
  store.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

function hydrateBrowserAccessToken(): void {
  if (browserHydrated) return;

  const store = storage();
  const legacyToken = store?.getItem(ACCESS_TOKEN_KEY) ?? null;
  const explicitExpiry = store?.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY) ?? null;
  const decodedExpiryMs = legacyToken ? decodeJwtExpiryMs(legacyToken) : null;
  const migrationExpiry = validExpiry(explicitExpiry)
    ? explicitExpiry
    : decodedExpiryMs !== null
      ? new Date(decodedExpiryMs).toISOString()
      : null;

  if (legacyToken && migrationExpiry && Date.parse(migrationExpiry) > Date.now()) {
    browserAccessToken = legacyToken;
    browserAccessExpiresAt = migrationExpiry;
  }

  clearLegacyBrowserCopy();
  browserHydrated = true;
}

async function clearDesktopSlotSilently(): Promise<void> {
  try {
    await invokeDesktop('clear_secure_auth_token', { slot: 'access' });
  } catch {
    // An unreadable DPAPI record is treated as an expired local session.
  }
}

async function hydrateDesktopAccessToken(): Promise<void> {
  if (!isDesktopRuntime() || desktopHydrated) return;
  if (desktopHydration) return desktopHydration;

  desktopHydration = (async () => {
    let nativeRecord: DesktopSecureToken = null;

    try {
      nativeRecord = await invokeDesktop<DesktopSecureToken>('load_secure_auth_token', {
        slot: 'access',
      });
    } catch {
      await clearDesktopSlotSilently();
    }

    if (
      Array.isArray(nativeRecord)
      && nativeRecord.length === 2
      && typeof nativeRecord[0] === 'string'
      && validExpiry(nativeRecord[1])
    ) {
      desktopAccessToken = nativeRecord[0];
      desktopAccessExpiresAt = nativeRecord[1];
      clearLegacyBrowserCopy();
      desktopHydrated = true;
      return;
    }

    const store = storage();
    const legacyToken = store?.getItem(ACCESS_TOKEN_KEY) ?? null;
    const explicitExpiry = store?.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY) ?? null;
    const decodedExpiryMs = legacyToken ? decodeJwtExpiryMs(legacyToken) : null;
    const migrationExpiry = validExpiry(explicitExpiry)
      ? explicitExpiry
      : decodedExpiryMs !== null
        ? new Date(decodedExpiryMs).toISOString()
        : null;

    if (legacyToken && migrationExpiry) {
      await invokeDesktop('store_secure_auth_token', {
        slot: 'access',
        token: legacyToken,
        expiresAt: migrationExpiry,
      });
      desktopAccessToken = legacyToken;
      desktopAccessExpiresAt = migrationExpiry;
    }

    clearLegacyBrowserCopy();
    desktopHydrated = true;
  })().finally(() => {
    desktopHydration = null;
  });

  return desktopHydration;
}

export async function getStoredAccessToken(): Promise<string | null> {
  if (isDesktopRuntime()) {
    await hydrateDesktopAccessToken();
    return desktopAccessToken;
  }

  hydrateBrowserAccessToken();
  return browserAccessToken;
}

export async function getStoredAccessTokenExpiresAtMs(): Promise<number | null> {
  if (isDesktopRuntime()) {
    await hydrateDesktopAccessToken();
    return validExpiry(desktopAccessExpiresAt)
      ? Date.parse(desktopAccessExpiresAt)
      : null;
  }

  hydrateBrowserAccessToken();
  return validExpiry(browserAccessExpiresAt)
    ? Date.parse(browserAccessExpiresAt)
    : null;
}

export async function isStoredAccessTokenExpired(nowMs = Date.now()): Promise<boolean> {
  const expiresAt = await getStoredAccessTokenExpiresAtMs();
  return expiresAt !== null && expiresAt <= nowMs;
}

export async function persistAccessToken(lifecycle: AccessTokenLifecycle): Promise<void> {
  if (!validExpiry(lifecycle.expires_at)) {
    throw new Error('Access Token expiry metadata is invalid');
  }

  if (isDesktopRuntime()) {
    await invokeDesktop('store_secure_auth_token', {
      slot: 'access',
      token: lifecycle.access_token,
      expiresAt: lifecycle.expires_at,
    });
    desktopAccessToken = lifecycle.access_token;
    desktopAccessExpiresAt = lifecycle.expires_at;
    desktopHydrated = true;
    clearLegacyBrowserCopy();
    return;
  }

  browserAccessToken = lifecycle.access_token;
  browserAccessExpiresAt = lifecycle.expires_at;
  browserHydrated = true;
  clearLegacyBrowserCopy();
}

export async function clearStoredAccessToken(): Promise<void> {
  browserAccessToken = null;
  browserAccessExpiresAt = null;
  browserHydrated = true;
  desktopAccessToken = null;
  desktopAccessExpiresAt = null;

  if (isDesktopRuntime()) {
    desktopHydrated = true;
    clearLegacyBrowserCopy();
    await invokeDesktop('clear_secure_auth_token', { slot: 'access' });
    return;
  }

  clearLegacyBrowserCopy();
}