import { invokeDesktop, isDesktopRuntime } from '@/api/runtime'

export type InstalledAppSource = string
export type InstalledAppLaunchKind = 'executable' | 'aumid' | 'url' | ''
export type InstalledAppSnapshot = [string, string, string, InstalledAppSource, string, InstalledAppLaunchKind, string, string]

export interface InstalledApp {
  name: string
  publisher: string
  version: string
  source: InstalledAppSource
  entryPath: string
  launchKind: InstalledAppLaunchKind
  launchTarget: string
  launchArgs: string
}

export async function discoverInstalledApps(forceRefresh = false): Promise<InstalledApp[]> {
  if (!isDesktopRuntime()) return []
  const snapshots = await invokeDesktop<InstalledAppSnapshot[]>('get_installed_apps', { forceRefresh })
  return snapshots.map(([name, publisher, version, source, entryPath, launchKind, launchTarget, launchArgs]) => ({
    name,
    publisher,
    version,
    source,
    entryPath,
    launchKind,
    launchTarget,
    launchArgs,
  }))
}

export async function getInstalledAppIcon(name: string): Promise<string | null> {
  if (!isDesktopRuntime() || !name.trim()) return null
  return invokeDesktop<string | null>('get_installed_app_icon', { name })
}

export async function launchInstalledApp(name: string): Promise<boolean> {
  if (!isDesktopRuntime() || !name.trim()) return false
  await invokeDesktop('launch_installed_app', { name })
  return true
}
