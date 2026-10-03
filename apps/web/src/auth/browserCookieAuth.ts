import { isDesktopRuntime } from '@/api/runtime';

export const BROWSER_AUTH_MODE_HEADER = 'X-FlexiKit-Auth-Mode';
export const BROWSER_AUTH_MODE_VALUE = 'browser-cookie';
const BROWSER_REFRESH_LOCK_NAME = 'flexikit-browser-refresh-v1';

interface LockManagerLike {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export function isBrowserCookieAuthRuntime(): boolean {
  return typeof window !== 'undefined' && !isDesktopRuntime();
}

export function browserCookieAuthRequestOptions(): {
  withCredentials?: boolean;
  headers?: Record<string, string>;
} {
  if (!isBrowserCookieAuthRuntime()) return {};
  return {
    withCredentials: true,
    headers: {
      [BROWSER_AUTH_MODE_HEADER]: BROWSER_AUTH_MODE_VALUE,
    },
  };
}

export async function withBrowserRefreshLock<T>(
  task: () => Promise<T>,
): Promise<T> {
  if (!isBrowserCookieAuthRuntime() || typeof navigator === 'undefined') {
    return task();
  }

  const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
  if (!locks) return task();

  return locks.request(BROWSER_REFRESH_LOCK_NAME, task);
}
