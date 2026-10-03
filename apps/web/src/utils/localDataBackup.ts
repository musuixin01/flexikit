import {
  CURRENT_LOCAL_DATA_SCHEMA_VERSION,
  migrateLocalDataSnapshot,
} from '../migrations/localDataMigrations.js'

export const LOCAL_BACKUP_FORMAT = 'flexikit-local-backup' as const
export const LOCAL_BACKUP_VERSION = 1 as const

const PBKDF2_ITERATIONS = 250_000
const MAX_BACKUP_FILE_BYTES = 8 * 1024 * 1024
const MAX_STORAGE_VALUE_BYTES = 2 * 1024 * 1024
const MIN_BACKUP_PASSWORD_LENGTH = 8

export const BACKUP_STORAGE_KEYS = [
  'gtb-theme',
  'flexikit-layout',
  'flexikit-theme-settings',
  'flexikit-sidebar-collapsed',
  'gtb-custom',
  'gtb-order',
  'gtb-favorites',
  'gtb-cat-order',
  'flexikit-desktop-canvas-v1',
  'flexikit-desktop-canvas-v2',
  'flexikit-global-search-recents-v1',
  'flexikit-installed-app-usage-v1',
  'flexikit-tool-usage-v1',
] as const

export type BackupStorageKey = typeof BACKUP_STORAGE_KEYS[number]

const ARRAY_JSON_KEYS = new Set<BackupStorageKey>([
  'gtb-custom',
  'gtb-order',
  'gtb-favorites',
  'gtb-cat-order',
  'flexikit-desktop-canvas-v1',
  'flexikit-global-search-recents-v1',
])

const OBJECT_JSON_KEYS = new Set<BackupStorageKey>([
  'flexikit-layout',
  'flexikit-theme-settings',
  'flexikit-desktop-canvas-v2',
  'flexikit-installed-app-usage-v1',
  'flexikit-tool-usage-v1',
])

export interface LocalBackupAccount {
  id: number
  username: string
}

export interface LocalBackupContext {
  runtime: 'browser' | 'desktop'
  account: LocalBackupAccount | null
}

export interface LocalBackupPayloadV1 {
  schemaVersion: 1
  localDataSchemaVersion: number
  createdAt: string
  runtime: 'browser' | 'desktop'
  account: LocalBackupAccount | null
  storage: Partial<Record<BackupStorageKey, string>>
}

export interface EncryptedLocalBackupV1 {
  format: typeof LOCAL_BACKUP_FORMAT
  version: typeof LOCAL_BACKUP_VERSION
  createdAt: string
  encryption: {
    algorithm: 'AES-GCM-256'
    kdf: 'PBKDF2-SHA-256'
    iterations: number
    salt: string
    iv: string
  }
  ciphertext: string
}

export interface RestoreLocalBackupResult {
  restoredKeys: number
  removedKeys: number
}

type LocalStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function ensurePassword(password: string): void {
  if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
    throw new Error(`备份密码至少需要 ${MIN_BACKUP_PASSWORD_LENGTH} 个字符`)
  }
}

function ensureIsoTimestamp(value: unknown, label: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label}无效`)
  }
  return value
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    throw new Error('备份文件的加密数据格式无效')
  }
}

function validateStoredValue(key: BackupStorageKey, value: string): void {
  if (byteLength(value) > MAX_STORAGE_VALUE_BYTES) {
    throw new Error(`备份项 ${key} 超出大小限制`)
  }

  if (key === 'gtb-theme') {
    if (!['light', 'dark', 'auto'].includes(value)) {
      throw new Error('备份中的主题设置无效')
    }
    return
  }

  if (key === 'flexikit-sidebar-collapsed') {
    if (value !== 'true' && value !== 'false') {
      throw new Error('备份中的侧边栏设置无效')
    }
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`备份项 ${key} 不是有效 JSON`)
  }

  if (ARRAY_JSON_KEYS.has(key) && !Array.isArray(parsed)) {
    throw new Error(`备份项 ${key} 应为数组`)
  }

  if (OBJECT_JSON_KEYS.has(key) && !isRecord(parsed)) {
    throw new Error(`备份项 ${key} 应为对象`)
  }
}

function validateAccount(value: unknown): LocalBackupAccount | null {
  if (value === null) return null
  if (!isRecord(value)) throw new Error('备份账户信息无效')

  const id = value.id
  const username = value.username
  if (!Number.isInteger(id) || Number(id) <= 0 || typeof username !== 'string' || !username.trim()) {
    throw new Error('备份账户信息无效')
  }

  return { id: Number(id), username: username.trim() }
}

function validatePayload(value: unknown): LocalBackupPayloadV1 {
  if (!isRecord(value) || value.schemaVersion !== LOCAL_BACKUP_VERSION) {
    throw new Error('不支持的备份数据版本')
  }

  const createdAt = ensureIsoTimestamp(value.createdAt, '备份创建时间')
  const runtime = value.runtime
  if (runtime !== 'browser' && runtime !== 'desktop') {
    throw new Error('备份运行环境无效')
  }

  const account = validateAccount(value.account)
  const sourceLocalDataSchemaVersion = value.localDataSchemaVersion === undefined
    ? 0
    : value.localDataSchemaVersion
  if (!Number.isSafeInteger(sourceLocalDataSchemaVersion) || Number(sourceLocalDataSchemaVersion) < 0) {
    throw new Error('备份中的本地数据 schema 版本无效')
  }

  if (!isRecord(value.storage)) {
    throw new Error('备份本地数据无效')
  }

  const allowed = new Set<string>(BACKUP_STORAGE_KEYS)
  const storage: Partial<Record<BackupStorageKey, string>> = {}
  let totalBytes = 0

  for (const [key, rawValue] of Object.entries(value.storage)) {
    if (!allowed.has(key)) {
      throw new Error(`备份包含不允许恢复的本地数据项：${key}`)
    }
    if (typeof rawValue !== 'string') {
      throw new Error(`备份项 ${key} 的值无效`)
    }

    const typedKey = key as BackupStorageKey
    validateStoredValue(typedKey, rawValue)
    totalBytes += byteLength(rawValue)
    if (totalBytes > MAX_BACKUP_FILE_BYTES) {
      throw new Error('备份本地数据总大小超出限制')
    }
    storage[typedKey] = rawValue
  }

  const migrated = migrateLocalDataSnapshot(
    storage as Record<string, string>,
    Number(sourceLocalDataSchemaVersion),
  )

  for (const [key, migratedValue] of Object.entries(migrated.storage)) {
    if (!allowed.has(key)) {
      throw new Error(`迁移后的备份包含不允许恢复的本地数据项：${key}`)
    }
    validateStoredValue(key as BackupStorageKey, migratedValue)
  }

  return {
    schemaVersion: LOCAL_BACKUP_VERSION,
    localDataSchemaVersion: migrated.version,
    createdAt,
    runtime,
    account,
    storage: migrated.storage as Partial<Record<BackupStorageKey, string>>,
  }
}

function validateEnvelope(value: unknown): EncryptedLocalBackupV1 {
  if (!isRecord(value) || value.format !== LOCAL_BACKUP_FORMAT || value.version !== LOCAL_BACKUP_VERSION) {
    throw new Error('不是受支持的 FlexiKit 本地备份文件')
  }

  const createdAt = ensureIsoTimestamp(value.createdAt, '备份创建时间')
  if (!isRecord(value.encryption)) throw new Error('备份加密参数无效')

  const encryption = value.encryption
  if (
    encryption.algorithm !== 'AES-GCM-256'
    || encryption.kdf !== 'PBKDF2-SHA-256'
    || encryption.iterations !== PBKDF2_ITERATIONS
    || typeof encryption.salt !== 'string'
    || typeof encryption.iv !== 'string'
    || typeof value.ciphertext !== 'string'
  ) {
    throw new Error('备份加密参数不受支持')
  }

  if (byteLength(value.ciphertext) > MAX_BACKUP_FILE_BYTES * 2) {
    throw new Error('备份文件超出大小限制')
  }

  return {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    createdAt,
    encryption: {
      algorithm: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: encryption.salt,
      iv: encryption.iv,
    },
    ciphertext: value.ciphertext,
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new Error('当前环境不支持安全备份所需的 Web Crypto')
  }
  return globalThis.crypto
}

function buildAdditionalData(createdAt: string): Uint8Array {
  return new TextEncoder().encode(
    `${LOCAL_BACKUP_FORMAT}:${LOCAL_BACKUP_VERSION}:${createdAt}:AES-GCM-256:PBKDF2-SHA-256:${PBKDF2_ITERATIONS}`,
  )
}

async function deriveBackupKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoApi = getCrypto()
  const material = await cryptoApi.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(password)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function collectLocalBackupPayload(
  storage: LocalStorageAdapter,
  context: LocalBackupContext,
  createdAt = new Date().toISOString(),
): LocalBackupPayloadV1 {
  ensureIsoTimestamp(createdAt, '备份创建时间')

  const data: Partial<Record<BackupStorageKey, string>> = {}
  for (const key of BACKUP_STORAGE_KEYS) {
    const value = storage.getItem(key)
    if (value === null) continue
    validateStoredValue(key, value)
    data[key] = value
  }

  return validatePayload({
    schemaVersion: LOCAL_BACKUP_VERSION,
    localDataSchemaVersion: CURRENT_LOCAL_DATA_SCHEMA_VERSION,
    createdAt,
    runtime: context.runtime,
    account: context.account,
    storage: data,
  })
}

export async function createEncryptedLocalBackup(
  storage: LocalStorageAdapter,
  password: string,
  context: LocalBackupContext,
): Promise<string> {
  ensurePassword(password)

  const createdAt = new Date().toISOString()
  const payload = collectLocalBackupPayload(storage, context, createdAt)
  const plaintext = new TextEncoder().encode(JSON.stringify(payload))
  if (plaintext.byteLength > MAX_BACKUP_FILE_BYTES) {
    throw new Error('备份内容超出大小限制')
  }

  const cryptoApi = getCrypto()
  const salt = cryptoApi.getRandomValues(new Uint8Array(16))
  const iv = cryptoApi.getRandomValues(new Uint8Array(12))
  const key = await deriveBackupKey(password, salt)
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(buildAdditionalData(createdAt)),
      tagLength: 128,
    },
    key,
    toArrayBuffer(plaintext),
  )

  const envelope: EncryptedLocalBackupV1 = {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    createdAt,
    encryption: {
      algorithm: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  }

  return JSON.stringify(envelope, null, 2)
}

export async function decryptLocalBackup(
  backupJson: string,
  password: string,
): Promise<LocalBackupPayloadV1> {
  ensurePassword(password)
  if (byteLength(backupJson) > MAX_BACKUP_FILE_BYTES * 2) {
    throw new Error('备份文件超出大小限制')
  }

  let rawEnvelope: unknown
  try {
    rawEnvelope = JSON.parse(backupJson)
  } catch {
    throw new Error('备份文件不是有效 JSON')
  }

  const envelope = validateEnvelope(rawEnvelope)
  const salt = base64ToBytes(envelope.encryption.salt)
  const iv = base64ToBytes(envelope.encryption.iv)
  if (salt.byteLength !== 16 || iv.byteLength !== 12) {
    throw new Error('备份加密参数无效')
  }

  const key = await deriveBackupKey(password, salt)
  let plaintext: ArrayBuffer
  try {
    plaintext = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(buildAdditionalData(envelope.createdAt)),
        tagLength: 128,
      },
      key,
      toArrayBuffer(base64ToBytes(envelope.ciphertext)),
    )
  } catch {
    throw new Error('备份密码错误或文件已损坏')
  }

  let rawPayload: unknown
  try {
    rawPayload = JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    throw new Error('备份内容已损坏')
  }

  const payload = validatePayload(rawPayload)
  if (payload.createdAt !== envelope.createdAt) {
    throw new Error('备份创建时间校验失败')
  }
  return payload
}

export function assertBackupAccountCompatible(
  payload: LocalBackupPayloadV1,
  currentAccount: LocalBackupAccount | null,
): void {
  if (!payload.account) return
  if (!currentAccount) {
    throw new Error('该备份绑定了登录账户，请先登录对应账户后再恢复')
  }
  if (payload.account.id !== currentAccount.id) {
    throw new Error('该备份属于其他 FlexiKit 账户，已阻止恢复')
  }
}

export function restoreLocalBackup(
  storage: LocalStorageAdapter,
  payload: LocalBackupPayloadV1,
): RestoreLocalBackupResult {
  const validated = validatePayload(payload)
  const before = new Map<BackupStorageKey, string | null>()
  for (const key of BACKUP_STORAGE_KEYS) {
    before.set(key, storage.getItem(key))
  }

  let restoredKeys = 0
  let removedKeys = 0

  try {
    for (const key of BACKUP_STORAGE_KEYS) {
      const next = validated.storage[key]
      if (typeof next === 'string') {
        storage.setItem(key, next)
        restoredKeys += 1
      } else {
        if (storage.getItem(key) !== null) removedKeys += 1
        storage.removeItem(key)
      }
    }
  } catch {
    for (const key of BACKUP_STORAGE_KEYS) {
      const previous = before.get(key)
      try {
        if (previous === null || previous === undefined) storage.removeItem(key)
        else storage.setItem(key, previous)
      } catch {
        // Best-effort rollback; the original write failure remains authoritative.
      }
    }
    throw new Error('恢复本地备份失败，已尝试回滚原有数据')
  }

  return { restoredKeys, removedKeys }
}

export function localBackupFileName(createdAt = new Date()): string {
  const stamp = createdAt.toISOString().slice(0, 19).replace(/:/g, '-')
  return `flexikit_local_backup_v${LOCAL_BACKUP_VERSION}_${stamp}.json`
}
