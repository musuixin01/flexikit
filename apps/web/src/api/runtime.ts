declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
    }
  }
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function invokeDesktop<T = void>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktopRuntime() || !window.__TAURI_INTERNALS__) {
    throw new Error('Desktop bridge is unavailable')
  }
  return window.__TAURI_INTERNALS__.invoke<T>(command, args)
}

function configuredApiUrl(): string {
  return (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '')
}

export function getApiBaseUrl(): string {
  if (isDesktopRuntime()) return configuredApiUrl()
  if (import.meta.env.DEV) return '/api'
  return import.meta.env.VITE_API_URL || '/api'
}

export function resolveApiUrl(path: string): string {
  if (!isDesktopRuntime()) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const backendPath = normalizedPath === '/api'
    ? ''
    : normalizedPath.startsWith('/api/') ? normalizedPath.slice(4) : normalizedPath
  return `${configuredApiUrl()}${backendPath}`
}

export {}
