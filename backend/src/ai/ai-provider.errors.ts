export type AiProviderRegistrationErrorCode =
  | 'INVALID_PROVIDER_ID'
  | 'INVALID_PROVIDER_DEFINITION'
  | 'DUPLICATE_PROVIDER';

export class AiProviderRegistrationError extends Error {
  constructor(
    readonly code: AiProviderRegistrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderRegistrationError';
  }
}

export type AiRoutingErrorCode =
  | 'NO_PROVIDER_AVAILABLE'
  | 'PROVIDER_NOT_FOUND'
  | 'MODEL_NOT_FOUND';

export class AiRoutingError extends Error {
  constructor(
    readonly code: AiRoutingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiRoutingError';
  }
}

export type AiProviderExecutionErrorCode =
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_PARAMETER'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_REJECTED'
  | 'INVALID_RESPONSE';

export class AiProviderExecutionError extends Error {
  constructor(
    readonly code: AiProviderExecutionErrorCode,
    message: string,
    readonly providerId: string,
    readonly statusCode?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'AiProviderExecutionError';
  }
}
