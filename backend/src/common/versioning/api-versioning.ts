import {
  VERSION_NEUTRAL,
  VersioningType,
  type VersioningOptions,
} from '@nestjs/common';

export const API_V1 = '1' as const;
export const API_V1_PATH = `/v${API_V1}` as const;

export const API_VERSIONING_OPTIONS = {
  type: VersioningType.URI,
  defaultVersion: [VERSION_NEUTRAL, API_V1],
} satisfies VersioningOptions;
