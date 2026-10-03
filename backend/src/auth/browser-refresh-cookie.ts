import type { CookieOptions, Request, Response } from 'express';

export const BROWSER_AUTH_MODE_HEADER = 'x-flexikit-auth-mode';
export const BROWSER_AUTH_MODE_VALUE = 'browser-cookie';
export const BROWSER_REFRESH_COOKIE_NAME = 'flexikit_refresh_session';

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return typeof value === 'string' ? value.trim() || null : null;
}

export function isBrowserCookieAuthRequest(
  request: Pick<Request, 'headers'>,
): boolean {
  return firstHeaderValue(request.headers[BROWSER_AUTH_MODE_HEADER])
    === BROWSER_AUTH_MODE_VALUE;
}

export function readBrowserRefreshCookie(
  request: Pick<Request, 'headers'>,
): string | null {
  const header = firstHeaderValue(request.headers.cookie);
  if (!header) return null;

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    if (name !== BROWSER_REFRESH_COOKIE_NAME) continue;

    const encoded = pair.slice(separator + 1).trim();
    if (!encoded) return null;
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }

  return null;
}

export function browserRefreshCookieOptions(
  secure: boolean,
  expiresAt?: string,
): CookieOptions {
  const base: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
  };

  if (!expiresAt) return base;

  const expires = new Date(expiresAt);
  if (!Number.isFinite(expires.getTime())) {
    throw new Error('Refresh cookie expiry metadata is invalid');
  }

  return {
    ...base,
    expires,
    maxAge: Math.max(0, expires.getTime() - Date.now()),
  };
}

export function setBrowserRefreshCookie(
  response: Pick<Response, 'cookie'>,
  token: string,
  expiresAt: string,
  secure: boolean,
): void {
  response.cookie(
    BROWSER_REFRESH_COOKIE_NAME,
    token,
    browserRefreshCookieOptions(secure, expiresAt),
  );
}

export function clearBrowserRefreshCookie(
  response: Pick<Response, 'clearCookie'>,
  secure: boolean,
): void {
  response.clearCookie(
    BROWSER_REFRESH_COOKIE_NAME,
    browserRefreshCookieOptions(secure),
  );
}

export function omitRefreshToken<T extends { refresh_token: string }>(
  result: T,
): Omit<T, 'refresh_token'> {
  const { refresh_token: _refreshToken, ...safe } = result;
  return safe;
}