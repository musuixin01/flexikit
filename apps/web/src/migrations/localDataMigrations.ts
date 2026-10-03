export const LOCAL_DATA_SCHEMA_VERSION_KEY = 'flexikit-local-data-schema-version' as const
export const CURRENT_LOCAL_DATA_SCHEMA_VERSION = 1 as const

const CANVAS_V1_KEY = 'flexikit-desktop-canvas-v1'
const CANVAS_V2_KEY = 'flexikit-desktop-canvas-v2'

export interface LocalDataMigrationResult {
  fromVersion: number
  toVersion: number
  appliedVersions: number[]
  changedKeys: string[]
}

export interface MigratedLocalDataSnapshot {
  version: number
  storage: Record<string, string>
  appliedVersions: number[]
}

type LocalStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type SnapshotMigration = (storage: Record<string, string>) => Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseStoredSchemaVersion(value: string | null): number {
  if (value === null) return 0
  if (!/^\d+$/.test(value)) {
    throw new Error('本地数据版本标记无效')
  }

  const version = Number(value)
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error('本地数据版本标记无效')
  }
  return version
}

function parseCanvasV1(value: string): unknown[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('旧版桌面 Canvas 数据已损坏，无法安全迁移')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('旧版桌面 Canvas 数据格式无效')
  }
  return parsed
}

function isCanvasV2(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return false
    return parsed.version === 2
      && Array.isArray(parsed.widgets)
      && Array.isArray(parsed.monitors)
  } catch {
    return false
  }
}

const migrate0To1: SnapshotMigration = (storage) => {
  const next = { ...storage }
  const legacyCanvas = next[CANVAS_V1_KEY]
  const currentCanvas = next[CANVAS_V2_KEY]

  if (currentCanvas !== undefined) {
    if (!isCanvasV2(currentCanvas)) {
      throw new Error('桌面 Canvas v2 数据格式无效，已停止自动迁移以避免覆盖')
    }
    delete next[CANVAS_V1_KEY]
    return next
  }

  if (legacyCanvas !== undefined) {
    const widgets = parseCanvasV1(legacyCanvas)
    next[CANVAS_V2_KEY] = JSON.stringify({
      version: 2,
      widgets,
      monitors: [],
    })
    delete next[CANVAS_V1_KEY]
  }

  return next
}

const MIGRATIONS = new Map<number, SnapshotMigration>([
  [0, migrate0To1],
])

export function migrateLocalDataSnapshot(
  storage: Record<string, string>,
  fromVersion: number,
): MigratedLocalDataSnapshot {
  if (!Number.isSafeInteger(fromVersion) || fromVersion < 0) {
    throw new Error('本地数据 schema 版本无效')
  }
  if (fromVersion > CURRENT_LOCAL_DATA_SCHEMA_VERSION) {
    throw new Error(
      `本地数据来自更新版本（v${fromVersion}），当前应用仅支持到 v${CURRENT_LOCAL_DATA_SCHEMA_VERSION}`,
    )
  }

  let version = fromVersion
  let current = { ...storage }
  const appliedVersions: number[] = []

  while (version < CURRENT_LOCAL_DATA_SCHEMA_VERSION) {
    const migrate = MIGRATIONS.get(version)
    if (!migrate) {
      throw new Error(`缺少本地数据 v${version} → v${version + 1} 的迁移步骤`)
    }
    current = migrate(current)
    version += 1
    appliedVersions.push(version)
  }

  return {
    version,
    storage: current,
    appliedVersions,
  }
}

export function runLocalDataMigrations(storage: LocalStorageAdapter): LocalDataMigrationResult {
  const fromVersion = parseStoredSchemaVersion(storage.getItem(LOCAL_DATA_SCHEMA_VERSION_KEY))
  if (fromVersion > CURRENT_LOCAL_DATA_SCHEMA_VERSION) {
    throw new Error(
      `本地数据来自更新版本（v${fromVersion}），当前应用仅支持到 v${CURRENT_LOCAL_DATA_SCHEMA_VERSION}`,
    )
  }

  const before = new Map<string, string | null>([
    [LOCAL_DATA_SCHEMA_VERSION_KEY, storage.getItem(LOCAL_DATA_SCHEMA_VERSION_KEY)],
    [CANVAS_V1_KEY, storage.getItem(CANVAS_V1_KEY)],
    [CANVAS_V2_KEY, storage.getItem(CANVAS_V2_KEY)],
  ])

  const source: Record<string, string> = {}
  const legacy = before.get(CANVAS_V1_KEY)
  const current = before.get(CANVAS_V2_KEY)
  if (legacy !== null && legacy !== undefined) source[CANVAS_V1_KEY] = legacy
  if (current !== null && current !== undefined) source[CANVAS_V2_KEY] = current

  const migrated = migrateLocalDataSnapshot(source, fromVersion)
  const changedKeys: string[] = []

  try {
    for (const key of [CANVAS_V1_KEY, CANVAS_V2_KEY]) {
      const previous = before.get(key)
      const next = migrated.storage[key]

      if (next === undefined) {
        if (previous !== null && previous !== undefined) {
          storage.removeItem(key)
          changedKeys.push(key)
        }
        continue
      }

      if (previous !== next) {
        storage.setItem(key, next)
        changedKeys.push(key)
      }
    }

    const nextVersion = String(migrated.version)
    if (before.get(LOCAL_DATA_SCHEMA_VERSION_KEY) !== nextVersion) {
      storage.setItem(LOCAL_DATA_SCHEMA_VERSION_KEY, nextVersion)
      changedKeys.push(LOCAL_DATA_SCHEMA_VERSION_KEY)
    }
  } catch {
    for (const [key, previous] of before) {
      try {
        if (previous === null) storage.removeItem(key)
        else storage.setItem(key, previous)
      } catch {
        // Best-effort rollback; the original migration write failure remains authoritative.
      }
    }
    throw new Error('本地数据迁移写入失败，已尝试回滚原有数据')
  }

  return {
    fromVersion,
    toVersion: migrated.version,
    appliedVersions: migrated.appliedVersions,
    changedKeys,
  }
}
