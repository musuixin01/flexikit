export const WIDGET_PLUGIN_API_VERSION = 1 as const

export const WIDGET_PLUGIN_LIFECYCLE_CONTRACT = {
  mount: 'vue-onMounted',
  unmount: 'vue-onBeforeUnmount',
  transientState: 'component-instance',
  persistentState: 'desktop-widget-config',
} as const

export type WidgetPluginSource = 'builtin' | 'extension'
export type WidgetPluginInstancePolicy = 'single' | 'multiple'

export type WidgetPluginPermission =
  | 'network'
  | 'native-command'
  | 'desktop-read'
  | 'desktop-open'
  | 'clipboard-read'
  | 'clipboard-write'
  | 'system-read'
  | 'media-control'
  | 'tool-launch'

export interface WidgetPluginManifest {
  id: string
  version: string
  apiVersion: typeof WIDGET_PLUGIN_API_VERSION
  source: WidgetPluginSource
  instancePolicy: WidgetPluginInstancePolicy
  permissions: readonly WidgetPluginPermission[]
  networkOrigins?: readonly string[]
  nativeCommands?: readonly string[]
}

export interface WidgetPluginManifestOptions {
  version?: string
  instancePolicy?: WidgetPluginInstancePolicy
  permissions?: readonly WidgetPluginPermission[]
  networkOrigins?: readonly string[]
  nativeCommands?: readonly string[]
}

const KNOWN_PERMISSIONS: ReadonlySet<WidgetPluginPermission> = new Set([
  'network',
  'native-command',
  'desktop-read',
  'desktop-open',
  'clipboard-read',
  'clipboard-write',
  'system-read',
  'media-control',
  'tool-launch',
])

const PLUGIN_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const COMMAND_PATTERN = /^[a-z][a-z0-9_]*$/

export function createBuiltinWidgetPlugin(
  widgetType: string,
  options: WidgetPluginManifestOptions = {},
): WidgetPluginManifest {
  return {
    id: `flexikit.${widgetType}`,
    version: options.version ?? '1.0.0',
    apiVersion: WIDGET_PLUGIN_API_VERSION,
    source: 'builtin',
    instancePolicy: options.instancePolicy ?? 'multiple',
    permissions: [...(options.permissions ?? [])],
    networkOrigins: options.networkOrigins ? [...options.networkOrigins] : undefined,
    nativeCommands: options.nativeCommands ? [...options.nativeCommands] : undefined,
  }
}

export function validateWidgetPluginManifest(manifest: WidgetPluginManifest): string[] {
  const issues: string[] = []

  if (!PLUGIN_ID_PATTERN.test(manifest.id)) {
    issues.push('plugin.id must use lowercase dot/hyphen separated segments')
  }
  if (!VERSION_PATTERN.test(manifest.version)) {
    issues.push('plugin.version must be semantic version x.y.z')
  }
  if (manifest.apiVersion !== WIDGET_PLUGIN_API_VERSION) {
    issues.push(`unsupported plugin apiVersion ${manifest.apiVersion}`)
  }

  const permissions = new Set<WidgetPluginPermission>()
  for (const permission of manifest.permissions) {
    if (!KNOWN_PERMISSIONS.has(permission)) {
      issues.push(`unknown plugin permission: ${permission}`)
      continue
    }
    if (permissions.has(permission)) {
      issues.push(`duplicate plugin permission: ${permission}`)
    }
    permissions.add(permission)
  }

  const origins = manifest.networkOrigins ?? []
  if (origins.length && !permissions.has('network')) {
    issues.push('networkOrigins requires the network permission')
  }
  if (permissions.has('network') && !origins.length) {
    issues.push('network permission requires at least one explicit networkOrigins entry')
  }

  const seenOrigins = new Set<string>()
  for (const origin of origins) {
    try {
      const parsed = new URL(origin)
      if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
        issues.push(`network origin must be an exact https origin: ${origin}`)
      }
    } catch {
      issues.push(`invalid network origin: ${origin}`)
    }
    if (seenOrigins.has(origin)) issues.push(`duplicate network origin: ${origin}`)
    seenOrigins.add(origin)
  }

  const commands = manifest.nativeCommands ?? []
  if (commands.length && !permissions.has('native-command')) {
    issues.push('nativeCommands requires the native-command permission')
  }
  if (permissions.has('native-command') && !commands.length) {
    issues.push('native-command permission requires at least one explicit nativeCommands entry')
  }

  const seenCommands = new Set<string>()
  for (const command of commands) {
    if (!COMMAND_PATTERN.test(command)) {
      issues.push(`invalid native command name: ${command}`)
    }
    if (seenCommands.has(command)) issues.push(`duplicate native command: ${command}`)
    seenCommands.add(command)
  }

  return issues
}
