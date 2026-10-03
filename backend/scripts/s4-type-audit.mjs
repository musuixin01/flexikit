import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../src/', import.meta.url);

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directoryUrl);
    if (entry.isDirectory()) {
      files.push(...await walk(child));
    } else if (
      extname(entry.name) === '.ts'
      && (entry.name.endsWith('.controller.ts') || entry.name.endsWith('.service.ts'))
    ) {
      files.push(child);
    }
  }
  return files;
}

const checks = [
  { label: 'explicit any', pattern: /\bany\b/ },
  { label: 'untyped @Request() req', pattern: /@Request\(\)\s+req(?:\)|,)/ },
  { label: 'untyped @Query() query', pattern: /@Query\(\)\s+query(?:\)|,)/ },
];

const findings = [];
for (const fileUrl of await walk(root)) {
  const source = await readFile(fileUrl, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.pattern.test(line)) {
        findings.push({
          file: fileUrl.pathname.replace(root.pathname, ''),
          line: index + 1,
          label: check.label,
          text: line.trim(),
        });
      }
    }
  });
}

if (findings.length) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.label}] ${finding.text}`);
  }
  process.exitCode = 1;
} else {
  console.log('S4.1 controller/service type audit: PASS');
  console.log('explicit_any=0');
  console.log('untyped_request=0');
  console.log('untyped_whole_query=0');
}
