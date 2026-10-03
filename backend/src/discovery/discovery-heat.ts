export const DISCOVERY_HEAT_ENGAGEMENT_POINTS = 55;
export const DISCOVERY_HEAT_FRESHNESS_POINTS = 45;
export const DISCOVERY_HEAT_COMMENT_WEIGHT = 4;
export const DISCOVERY_HEAT_ENGAGEMENT_SCALE = 5_000;
export const DISCOVERY_HEAT_HALF_LIFE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1_000;

export interface DiscoveryHeatInput {
  upvotes?: number | null;
  comments?: number | null;
  discoveredAt?: Date | string | null;
  createdAt?: Date | string | null;
}

function nonNegativeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function validDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function calculateDiscoveryHeatScore(
  input: Readonly<DiscoveryHeatInput>,
  now = new Date(),
): number {
  const upvotes = nonNegativeCount(input.upvotes);
  const comments = nonNegativeCount(input.comments);
  const engagement = upvotes + comments * DISCOVERY_HEAT_COMMENT_WEIGHT;
  const engagementScore = DISCOVERY_HEAT_ENGAGEMENT_POINTS * (
    1 - Math.exp(-engagement / DISCOVERY_HEAT_ENGAGEMENT_SCALE)
  );

  const discoveredAt = validDate(input.discoveredAt) ?? validDate(input.createdAt);
  const freshnessScore = discoveredAt
    ? DISCOVERY_HEAT_FRESHNESS_POINTS * Math.exp(
        -Math.LN2
        * Math.max(0, now.getTime() - discoveredAt.getTime())
        / DAY_MS
        / DISCOVERY_HEAT_HALF_LIFE_DAYS,
      )
    : 0;

  return Math.round(
    Math.min(100, Math.max(0, engagementScore + freshnessScore)) * 10,
  ) / 10;
}

export function discoveryHeatSql(
  alias = 'tool',
  nowParameter = 'heatNow',
): string {
  return `(
    ${DISCOVERY_HEAT_ENGAGEMENT_POINTS}.0 * (
      1.0 - EXP(
        -(
          GREATEST(COALESCE(${alias}.upvotes, 0), 0)
          + GREATEST(COALESCE(${alias}.comments, 0), 0)
            * ${DISCOVERY_HEAT_COMMENT_WEIGHT}
        )::double precision
        / ${DISCOVERY_HEAT_ENGAGEMENT_SCALE}.0
      )
    )
    + ${DISCOVERY_HEAT_FRESHNESS_POINTS}.0 * EXP(
      -LN(2.0)
      * GREATEST(
          EXTRACT(
            EPOCH FROM (
              CAST(:${nowParameter} AS timestamp)
              - COALESCE(${alias}.discovered_at, ${alias}.created_at)
            )
          ) / 86400.0,
          0.0
        )
      / ${DISCOVERY_HEAT_HALF_LIFE_DAYS}.0
    )
  )`;
}
