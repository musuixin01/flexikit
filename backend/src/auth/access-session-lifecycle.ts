export const DEFAULT_ACCESS_TOKEN_TTL = '30m' as const;
export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
export const MIN_ACCESS_TOKEN_TTL_SECONDS = 60;
export const MAX_ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const ACCESS_TOKEN_TTL_PATTERN = /^(\d+)(s|m|h|d)$/i;

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

export function parseAccessTokenTtlSeconds(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
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
      const match = normalized.match(ACCESS_TOKEN_TTL_PATTERN);
      if (!match) {
        throw new Error(
          'ACCESS_TOKEN_TTL must be an integer number of seconds or use s/m/h/d suffix, for example 30m',
        );
      }
      seconds = Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
    }
  } else {
    throw new Error('ACCESS_TOKEN_TTL must be a number or duration string');
  }

  if (
    !Number.isSafeInteger(seconds)
    || seconds < MIN_ACCESS_TOKEN_TTL_SECONDS
    || seconds > MAX_ACCESS_TOKEN_TTL_SECONDS
  ) {
    throw new Error(
      `ACCESS_TOKEN_TTL must resolve to ${MIN_ACCESS_TOKEN_TTL_SECONDS}-${MAX_ACCESS_TOKEN_TTL_SECONDS} seconds`,
    );
  }

  return seconds;
}
