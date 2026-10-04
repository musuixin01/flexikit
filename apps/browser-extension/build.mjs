import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'options.html',
  'options.js'
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(dist, file));
}

const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3 || !manifest.background?.service_worker) {
  throw new Error('Invalid Manifest V3 build output');
}

await writeFile(
  resolve(dist, 'BUILD_INFO.json'),
  JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    files,
    builtAt: new Date().toISOString()
  }, null, 2) + '\n'
);

console.log(`Built ${manifest.name} v${manifest.version} -> ${dist}`);
