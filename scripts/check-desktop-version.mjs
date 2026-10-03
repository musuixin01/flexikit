import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

function readCargoTomlVersion(relativePath) {
  const lines = fs.readFileSync(path.join(root, relativePath), 'utf8').split(/\r?\n/)
  let inPackage = false
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '[package]') {
      inPackage = true
      continue
    }
    if (inPackage && line.startsWith('[')) break
    if (inPackage && line.startsWith('version = ')) {
      return line.slice('version = '.length).trim().replace(/^"|"$/g, '')
    }
  }
  throw new Error('Cargo.toml [package].version not found')
}

function readCargoLockVersion(relativePath, packageName) {
  const lines = fs.readFileSync(path.join(root, relativePath), 'utf8').split(/\r?\n/)
  let currentName = null
  let currentVersion = null

  function finishBlock() {
    if (currentName === packageName && currentVersion) return currentVersion
    currentName = null
    currentVersion = null
    return null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '[[package]]') {
      const found = finishBlock()
      if (found) return found
      continue
    }
    if (line.startsWith('name = ')) {
      currentName = line.slice('name = '.length).trim().replace(/^"|"$/g, '')
    } else if (line.startsWith('version = ')) {
      currentVersion = line.slice('version = '.length).trim().replace(/^"|"$/g, '')
    }
  }

  const found = finishBlock()
  if (found) return found
  throw new Error('Cargo.lock package not found: ' + packageName)
}

const desktopPackage = readJson('apps/desktop/package.json')
const desktopPackageLock = readJson('apps/desktop/package-lock.json')
const tauriConfig = readJson('apps/desktop/src-tauri/tauri.conf.json')
const cargoTomlVersion = readCargoTomlVersion('apps/desktop/src-tauri/Cargo.toml')
const cargoLockVersion = readCargoLockVersion(
  'apps/desktop/src-tauri/Cargo.lock',
  'flexikit-desktop',
)

const expected = desktopPackage.version
const versions = {
  'apps/desktop/package.json': expected,
  'apps/desktop/package-lock.json': desktopPackageLock.version,
  'apps/desktop/package-lock.json packages[""]': desktopPackageLock.packages?.['']?.version,
  'apps/desktop/src-tauri/tauri.conf.json': tauriConfig.version,
  'apps/desktop/src-tauri/Cargo.toml': cargoTomlVersion,
  'apps/desktop/src-tauri/Cargo.lock flexikit-desktop': cargoLockVersion,
}

const mismatches = Object.entries(versions).filter(([, version]) => version !== expected)

if (mismatches.length > 0) {
  console.error('Desktop release version mismatch. Expected ' + expected + ':')
  for (const [source, version] of Object.entries(versions)) {
    console.error('  ' + source + ': ' + (version ?? '<missing>'))
  }
  process.exit(1)
}

console.log('Desktop release version OK: ' + expected)
