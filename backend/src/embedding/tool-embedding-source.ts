import { createHash } from 'crypto';

export const TOOL_EMBEDDING_PROVIDER = 'openai';
export const TOOL_EMBEDDING_MODEL = 'text-embedding-3-small';
export const TOOL_EMBEDDING_DIMENSIONS = 1536;
export const TOOL_EMBEDDING_SOURCE_VERSION = 1;
export const TOOL_EMBEDDING_MAX_SOURCE_BYTES = 8_000;
export const TOOL_EMBEDDING_MAX_BATCH_SIZE = 32;

export interface ToolEmbeddingSourceInput {
  name: string;
  description?: string | null;
  tags?: readonly string[] | null;
  category?: string | null;
  url?: string | null;
  isLocal: boolean;
}

export interface CanonicalToolEmbeddingSource {
  text: string;
  hash: string;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeHostname(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function canonicalTags(tags: readonly string[] | null | undefined): string[] {
  const unique = new Map<string, string>();
  for (const rawTag of tags ?? []) {
    const normalized = normalizeText(rawTag);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase('en-US');
    if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([, value]) => value);
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return value;
  let bytes = 0;
  let output = '';
  for (const character of value) {
    const size = Buffer.byteLength(character, 'utf8');
    if (bytes + size > maxBytes) break;
    output += character;
    bytes += size;
  }
  return output.trimEnd();
}

export function buildCanonicalToolEmbeddingSource(
  tool: Readonly<ToolEmbeddingSourceInput>,
): CanonicalToolEmbeddingSource {
  const name = normalizeText(tool.name);
  const category = normalizeText(tool.category);
  const description = normalizeText(tool.description);
  const tags = canonicalTags(tool.tags);
  const hostname = tool.isLocal ? '' : safeHostname(tool.url);

  const text = truncateUtf8([
    `schema:tool-v${TOOL_EMBEDDING_SOURCE_VERSION}`,
    `name:${name}`,
    `kind:${tool.isLocal ? 'local' : 'web'}`,
    category ? `category:${category}` : '',
    tags.length > 0 ? `tags:${tags.join(' | ')}` : '',
    hostname ? `host:${hostname}` : '',
    description ? `description:${description}` : '',
  ].filter(Boolean).join('\n'), TOOL_EMBEDDING_MAX_SOURCE_BYTES);

  return {
    text,
    hash: createHash('sha256').update(text, 'utf8').digest('hex'),
  };
}
