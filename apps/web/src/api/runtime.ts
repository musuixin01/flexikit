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

export const API_VERSION = 'v1' as const
const API_PROXY_BASE = '/api'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function configuredApiUrl(): string {
  return stripTrailingSlash(import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001')
}

function appendApiVersion(baseUrl: string): string {
  const normalizedBase = stripTrailingSlash(baseUrl)
  return normalizedBase.endsWith(`/${API_VERSION}`)
    ? normalizedBase
    : `${normalizedBase}/${API_VERSION}`
}

function versionedProxyPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (normalizedPath === API_PROXY_BASE) return `${API_PROXY_BASE}/${API_VERSION}`
  if (normalizedPath === `${API_PROXY_BASE}/${API_VERSION}`) return normalizedPath
  if (normalizedPath.startsWith(`${API_PROXY_BASE}/${API_VERSION}/`)) return normalizedPath
  if (normalizedPath.startsWith(`${API_PROXY_BASE}/`)) {
    return `${API_PROXY_BASE}/${API_VERSION}${normalizedPath.slice(API_PROXY_BASE.length)}`
  }
  return normalizedPath
}

export function getApiBaseUrl(): string {
  if (isDesktopRuntime()) return appendApiVersion(configuredApiUrl())
  if (import.meta.env.DEV) return `${API_PROXY_BASE}/${API_VERSION}`
  return appendApiVersion(import.meta.env.VITE_API_URL || API_PROXY_BASE)
}

export function resolveApiUrl(path: string): string {
  const versionedPath = versionedProxyPath(path)
  if (!isDesktopRuntime()) return versionedPath

  const backendPath = versionedPath === `${API_PROXY_BASE}/${API_VERSION}`
    ? ''
    : versionedPath.startsWith(`${API_PROXY_BASE}/${API_VERSION}/`)
      ? versionedPath.slice(`${API_PROXY_BASE}/${API_VERSION}`.length)
      : versionedPath

  return `${appendApiVersion(configuredApiUrl())}${backendPath}`
}

export {}
