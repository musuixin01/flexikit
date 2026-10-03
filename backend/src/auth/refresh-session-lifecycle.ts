import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

export const DEFAULT_REFRESH_TOKEN_TTL = '30d' as const;
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const MIN_REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;
export const MAX_REFRESH_TOKEN_TTL_SECONDS = 180 * 24 * 60 * 60;

const REFRESH_TOKEN_TTL_PATTERN = /^(\d+)(s|m|h|d)$/i;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export interface RefreshTokenMaterial {
  sessionId: string;
  secret: string;
  token: string;
  tokenHash: string;
}

export interface ParsedRefreshToken {
  sessionId: string;
  secret: string;
}

export function parseRefreshTokenTtlSeconds(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
  }

  let seconds: number;

  if (typeof value === 'number') {
    seconds = value;
  } else if (typeof value === 'string') {
    const normalized = value.trim();
    const numeric = /^\d+$/.test(normalized)
      ? Number(normalized)
      : undefined;

    if (numeric !== undefined) {
      seconds = numeric;
    } else {
      const match = normalized.match(REFRESH_TOKEN_TTL_PATTERN);
      if (!match) {
        throw new Error(
          'REFRESH_TOKEN_TTL must be an integer number of seconds or use s/m/h/d suffix, for example 30d',
        );
      }
      seconds = Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
    }
  } else {
    throw new Error('REFRESH_TOKEN_TTL must be a number or duration string');
  }

  if (
    !Number.isSafeInteger(seconds)
    || seconds < MIN_REFRESH_TOKEN_TTL_SECONDS
    || seconds > MAX_REFRESH_TOKEN_TTL_SECONDS
  ) {
    throw new Error(
      `REFRESH_TOKEN_TTL must resolve to ${MIN_REFRESH_TOKEN_TTL_SECONDS}-${MAX_REFRESH_TOKEN_TTL_SECONDS} seconds`,
    );
  }

  return seconds;
}

export function hashRefreshTokenSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function createRefreshTokenMaterial(
  sessionId: string = randomUUID(),
): RefreshTokenMaterial {
  const secret = randomBytes(32).toString('base64url');
  return {
    sessionId,
    secret,
    token: `${sessionId}.${secret}`,
    tokenHash: hashRefreshTokenSecret(secret),
  };
}

export function parseRefreshToken(token: string): ParsedRefreshToken | null {
  const separator = token.indexOf('.');
  if (separator <= 0 || separator !== token.lastIndexOf('.')) return null;

  const sessionId = token.slice(0, separator);
  const secret = token.slice(separator + 1);

  if (!SESSION_ID_PATTERN.test(sessionId)) return null;
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(secret)) return null;

  return { sessionId, secret };
}

export function matchesRefreshTokenSecret(
  secret: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashRefreshTokenSecret(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
