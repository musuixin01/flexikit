import { invokeDesktop, isDesktopRuntime } from '@/api/runtime';

export interface RefreshTokenLifecycle {
  refresh_token?: string;
  refresh_expires_in: number;
  refresh_expires_at: string;
}

export const REFRESH_TOKEN_KEY = 'flexikit-refresh-token';
export const REFRESH_TOKEN_EXPIRES_AT_KEY = 'flexikit-refresh-token-expires-at';
export const BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY = 'flexikit-browser-refresh-session-expires-at-v1';

type DesktopSecureToken = [string, string] | null;

let desktopRefreshToken: string | null = null;
let desktopRefreshExpiresAt: string | null = null;
let desktopHydrated = false;
let desktopHydration: Promise<void> | null = null;

function legacyStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

function browserMarkerStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function validExpiry(value: string | null): value is string {
  return Boolean(value) && Number.isFinite(Date.parse(value as string));
}

function clearLegacyBrowserCopy(): void {
  const store = legacyStorage();
  if (!store) return;
  store.removeItem(REFRESH_TOKEN_KEY);
  store.removeItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
}

function clearBrowserSessionMarker(): void {
  browserMarkerStorage()?.removeItem(BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY);
}

async function clearDesktopSlotSilently(): Promise<void> {
  try {
    await invokeDesktop('clear_secure_auth_token', { slot: 'refresh' });
  } catch {
    // An unreadable DPAPI record is treated as an expired local session.
  }
}

async function hydrateDesktopRefreshToken(): Promise<void> {
  if (!isDesktopRuntime() || desktopHydrated) return;
  if (desktopHydration) return desktopHydration;

  desktopHydration = (async () => {
    let nativeRecord: DesktopSecureToken = null;

    try {
      nativeRecord = await invokeDesktop<DesktopSecureToken>('load_secure_auth_token', {
        slot: 'refresh',
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
      desktopRefreshToken = nativeRecord[0];
      desktopRefreshExpiresAt = nativeRecord[1];
      clearLegacyBrowserCopy();
      clearBrowserSessionMarker();
      desktopHydrated = true;
      return;
    }

    const store = legacyStorage();
    const legacyToken = store?.getItem(REFRESH_TOKEN_KEY) ?? null;
    const legacyExpiry = store?.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY) ?? null;

    if (legacyToken && validExpiry(legacyExpiry)) {
      await invokeDesktop('store_secure_auth_token', {
        slot: 'refresh',
        token: legacyToken,
        expiresAt: legacyExpiry,
      });
      desktopRefreshToken = legacyToken;
      desktopRefreshExpiresAt = legacyExpiry;
    }

    clearLegacyBrowserCopy();
    clearBrowserSessionMarker();
    desktopHydrated = true;
  })().finally(() => {
    desktopHydration = null;
  });

  return desktopHydration;
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (isDesktopRuntime()) {
    await hydrateDesktopRefreshToken();
    return desktopRefreshToken;
  }

  // Browser Web only exposes a legacy token long enough for one-time migration
  // into the HttpOnly cookie flow.
  return legacyStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export async function getStoredRefreshTokenExpiresAtMs(): Promise<number | null> {
  if (isDesktopRuntime()) {
    await hydrateDesktopRefreshToken();
    return validExpiry(desktopRefreshExpiresAt)
      ? Date.parse(desktopRefreshExpiresAt)
      : null;
  }

  const marker = browserMarkerStorage()?.getItem(BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY) ?? null;
  if (validExpiry(marker)) return Date.parse(marker);

  const legacyExpiry = legacyStorage()?.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY) ?? null;
  return validExpiry(legacyExpiry) ? Date.parse(legacyExpiry) : null;
}

export async function hasStoredRefreshSession(nowMs = Date.now()): Promise<boolean> {
  if (isDesktopRuntime()) {
    const token = await getStoredRefreshToken();
    const expiresAt = await getStoredRefreshTokenExpiresAtMs();
    return Boolean(token) && expiresAt !== null && expiresAt > nowMs;
  }

  const markerStore = browserMarkerStorage();
  const marker = markerStore?.getItem(BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY) ?? null;
  if (validExpiry(marker)) {
    if (Date.parse(marker) > nowMs) return true;
    markerStore?.removeItem(BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY);
  }

  const legacyToken = legacyStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  const legacyExpiry = legacyStorage()?.getItem(REFRESH_TOKEN_EXPIRES_AT_KEY) ?? null;
  return Boolean(
    legacyToken
    && validExpiry(legacyExpiry)
    && Date.parse(legacyExpiry) > nowMs,
  );
}

export async function isStoredRefreshTokenExpired(nowMs = Date.now()): Promise<boolean> {
  const expiresAt = await getStoredRefreshTokenExpiresAtMs();
  return expiresAt !== null && expiresAt <= nowMs;
}

export async function persistRefreshToken(lifecycle: RefreshTokenLifecycle): Promise<void> {
  if (!validExpiry(lifecycle.refresh_expires_at)) {
    throw new Error('Refresh Token expiry metadata is invalid');
  }

  if (isDesktopRuntime()) {
    if (!lifecycle.refresh_token) {
      throw new Error('Desktop Refresh Token is missing');
    }

    await invokeDesktop('store_secure_auth_token', {
      slot: 'refresh',
      token: lifecycle.refresh_token,
      expiresAt: lifecycle.refresh_expires_at,
    });
    desktopRefreshToken = lifecycle.refresh_token;
    desktopRefreshExpiresAt = lifecycle.refresh_expires_at;
    desktopHydrated = true;
    clearLegacyBrowserCopy();
    clearBrowserSessionMarker();
    return;
  }

  browserMarkerStorage()?.setItem(
    BROWSER_REFRESH_SESSION_EXPIRES_AT_KEY,
    lifecycle.refresh_expires_at,
  );
  clearLegacyBrowserCopy();
}

export async function clearStoredRefreshToken(): Promise<void> {
  desktopRefreshToken = null;
  desktopRefreshExpiresAt = null;
  clearLegacyBrowserCopy();
  clearBrowserSessionMarker();

  if (isDesktopRuntime()) {
    desktopHydrated = true;
    await invokeDesktop('clear_secure_auth_token', { slot: 'refresh' });
  }
}