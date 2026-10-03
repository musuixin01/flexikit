import axios, { type AxiosError } from 'axios';
import { getApiBaseUrl } from './runtime';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  isStoredAccessTokenExpired,
  persistAccessToken,
  type AccessTokenLifecycle,
} from '@/auth/accessToken';
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  hasStoredRefreshSession,
  isStoredRefreshTokenExpired,
  persistRefreshToken,
  type RefreshTokenLifecycle,
} from '@/auth/refreshToken';
import {
  browserCookieAuthRequestOptions,
  isBrowserCookieAuthRuntime,
  withBrowserRefreshLock,
} from '@/auth/browserCookieAuth';

export interface ApiSuccessResponse<T> {
  code: 0;
  message: 'success';
  data: T;
}

function isApiSuccessResponse(value: unknown): value is ApiSuccessResponse<unknown> {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.code === 0 && body.message === 'success' && 'data' in body;
}

interface AuthSessionLifecycle extends AccessTokenLifecycle, RefreshTokenLifecycle {}

function isAuthSessionLifecycle(value: unknown): value is AuthSessionLifecycle {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;

  const refreshToken = session.refresh_token;

  return typeof session.access_token === 'string'
    && session.token_type === 'Bearer'
    && typeof session.expires_in === 'number'
    && typeof session.expires_at === 'string'
    && (refreshToken === undefined || typeof refreshToken === 'string')
    && typeof session.refresh_expires_in === 'number'
    && typeof session.refresh_expires_at === 'string';
}

export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  code?: string;
  details?: string[];
}

export const AUTH_INVALIDATED_EVENT = 'flexikit-auth-invalidated';
export const AUTH_REFRESHED_EVENT = 'flexikit-auth-refreshed';

function dispatchAuthInvalidated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT));
  }
}

function dispatchAuthRefreshed(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_REFRESHED_EVENT));
  }
}

async function clearStoredAuthSession(): Promise<void> {
  await Promise.allSettled([
    clearStoredAccessToken(),
    clearStoredRefreshToken(),
  ]);
}

function isAuthLifecycleRequest(url: string | undefined): boolean {
  if (!url) return false;
  return ['/auth/login', '/auth/register', '/auth/refresh'].some(
    path => url.endsWith(path) || url.includes(`${path}?`),
  );
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefreshUnlocked(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  const hasRefreshSession = await hasStoredRefreshSession();
  if (!refreshToken && !hasRefreshSession) return null;

  if (await isStoredRefreshTokenExpired()) {
    await clearStoredRefreshToken();
    return null;
  }

  try {
    const response = await axios.post(
      `${getApiBaseUrl()}/auth/refresh`,
      refreshToken ? { refresh_token: refreshToken } : {},
      {
        timeout: 10000,
        ...browserCookieAuthRequestOptions(),
      },
    );

    const payload: unknown = response.data;
    if (!isApiSuccessResponse(payload) || !isAuthSessionLifecycle(payload.data)) {
      return null;
    }

    await Promise.all([
      persistAccessToken(payload.data),
      persistRefreshToken(payload.data),
    ]);
    dispatchAuthRefreshed();
    return payload.data.access_token;
  } catch {
    return null;
  }
}

async function performRefresh(): Promise<string | null> {
  return withBrowserRefreshLock(performRefreshUnlocked);
}

async function refreshAccessTokenSingleFlight(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function isApiUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function isApiNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
}

export function getApiErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const details = error.response?.data?.details;
    if (Array.isArray(details) && details.length) return details.join('、');
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('、');
    if (typeof message === 'string' && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  withCredentials: isBrowserCookieAuthRuntime(),
});

api.interceptors.request.use(
  async (config) => {
    if (isAuthLifecycleRequest(config.url)) {
      return config;
    }

    let token = await getStoredAccessToken();
    const hasRefreshSession = await hasStoredRefreshSession();
    const hadAuthMaterial = Boolean(token || hasRefreshSession);

    if (!token || await isStoredAccessTokenExpired()) {
      if (token) await clearStoredAccessToken();
      token = await refreshAccessTokenSingleFlight();

      if (!token && hadAuthMaterial) {
        await clearStoredAuthSession();
        dispatchAuthInvalidated();
        return config;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const payload: unknown = response.data;
    if (isApiSuccessResponse(payload)) {
      response.data = payload.data;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as (typeof error.config & { _authRetry?: boolean }) | undefined;
    const isProtectedRequest = !isAuthLifecycleRequest(config?.url);

    if (
      error.response?.status === 401
      && config
      && isProtectedRequest
      && !config._authRetry
      && await hasStoredRefreshSession()
    ) {
      config._authRetry = true;
      const token = await refreshAccessTokenSingleFlight();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      }
    }

    if (error.response?.status === 401 && isProtectedRequest) {
      await clearStoredAuthSession();
      dispatchAuthInvalidated();
    }

    return Promise.reject(error);
  }
);

export default api;
