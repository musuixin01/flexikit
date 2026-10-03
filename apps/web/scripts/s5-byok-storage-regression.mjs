import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const store = readFileSync(
  path.join(projectRoot, 'src', 'ai', 'byokCredentialStore.ts'),
  'utf8',
);
const desktopMain = readFileSync(
  path.join(projectRoot, '..', 'desktop', 'src-tauri', 'src', 'main.rs'),
  'utf8',
);
const desktopVault = readFileSync(
  path.join(projectRoot, '..', 'desktop', 'src-tauri', 'src', 'ai_provider_vault_windows.rs'),
  'utf8',
);
const panel = readFileSync(
  path.join(projectRoot, 'src', 'components', 'ai', 'ByokCredentialPanel.vue'),
  'utf8',
);

assert.match(store, /\['openai', 'gemini', 'anthropic'\]/);
assert.match(store, /new Map<ByokProviderId, string>/);
assert.equal(store.includes('localStorage'), false);
assert.equal(store.includes('sessionStorage'), false);
assert.match(store, /store_ai_provider_credential/);
assert.match(store, /load_ai_provider_credential/);
assert.match(store, /clear_ai_provider_credential/);

for (const command of [
  'store_ai_provider_credential',
  'load_ai_provider_credential',
  'clear_ai_provider_credential',
]) {
  assert.match(desktopMain, new RegExp(command));
}

assert.match(desktopVault, /CryptProtectData/);
assert.match(desktopVault, /CryptUnprotectData/);
assert.match(desktopVault, /"openai"/);
assert.match(desktopVault, /"gemini"/);
assert.match(desktopVault, /"anthropic"/);
assert.match(desktopVault, /ai-provider-vault/);
assert.match(panel, /type="password"/);
assert.match(panel, /hasByokCredential/);
assert.match(panel, /storeByokCredential/);
assert.match(panel, /clearByokCredential/);
assert.equal(panel.includes('loadByokCredential'), false);

console.log('Browser BYOK persistence is runtime-memory only: PASS');
console.log('Desktop BYOK storage is routed through native commands: PASS');
console.log('Desktop BYOK vault uses Windows DPAPI and fixed Provider slots: PASS');
console.log('BYOK settings UI never reloads or displays the saved raw credential: PASS');
console.log('S5.1 BYOK storage regression: PASS');
