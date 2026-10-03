import { STATUS_CODES } from 'node:http';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'HTTP_ERROR'
  | 'VALIDATION_ERROR';

export interface ApiErrorResponse {
  statusCode: number;
  code: ApiErrorCode | string;
  message: string;
  error: string;
  details?: string[];
}

const STATUS_CODE_MAP: Partial<Record<number, ApiErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

export function statusLabel(statusCode: number): string {
  return STATUS_CODES[statusCode] || 'Error';
}

export function statusCodeToErrorCode(statusCode: number): ApiErrorCode {
  return STATUS_CODE_MAP[statusCode] ?? 'HTTP_ERROR';
}

export function normalizeApiErrorCode(
  value: unknown,
  fallback: ApiErrorCode | string,
): ApiErrorCode | string {
  return typeof value === 'string' && ERROR_CODE_PATTERN.test(value)
    ? value
    : fallback;
}

export function buildInternalErrorResponse(): ApiErrorResponse {
  const statusCode = 500;
  return {
    statusCode,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后再试',
    error: statusLabel(statusCode),
  };
}
