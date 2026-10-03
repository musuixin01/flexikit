import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;
const MAX_USER_AGENT_LENGTH = 160;

export interface RequestWithLogContext extends Request {
  requestId?: string;
  user?: {
    userId?: unknown;
  };
}

export interface HttpRequestLogEntry {
  event: 'http_request';
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  outcome: 'completed' | 'aborted';
  userId?: number;
  clientIp?: string;
  userAgent?: string;
}

export interface HttpErrorLogEntry {
  event: 'http_error';
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  code: string;
  userId?: number;
  clientIp?: string;
}

export function ensureRequestId(request: RequestWithLogContext): string {
  if (request.requestId) return request.requestId;

  const supplied = request.header('x-request-id')?.trim();
  const requestId = supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();

  request.requestId = requestId;
  return requestId;
}

export function getRequestId(request: RequestWithLogContext): string {
  return request.requestId ?? 'unassigned';
}

export function getAuthenticatedUserId(
  request: RequestWithLogContext,
): number | undefined {
  const value = request.user?.userId;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

export function maskClientIp(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const ip = value.startsWith('::ffff:') ? value.slice(7) : value;
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.x`;
  }

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    if (!parts.length) return '::x';
    return `${parts.slice(0, 3).join(':')}::x`;
  }

  return 'masked';
}

export function sanitizeUserAgent(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalized) return undefined;
  return normalized.slice(0, MAX_USER_AGENT_LENGTH);
}

function commonRequestFields(request: RequestWithLogContext) {
  return {
    requestId: getRequestId(request),
    method: request.method,
    path: request.path,
    userId: getAuthenticatedUserId(request),
    clientIp: maskClientIp(request.ip),
  };
}

export function buildHttpRequestLogEntry(
  request: RequestWithLogContext,
  statusCode: number,
  durationMs: number,
  outcome: HttpRequestLogEntry['outcome'],
): HttpRequestLogEntry {
  return {
    event: 'http_request',
    timestamp: new Date().toISOString(),
    ...commonRequestFields(request),
    statusCode,
    durationMs: Math.max(0, Number(durationMs.toFixed(2))),
    outcome,
    userAgent: sanitizeUserAgent(request.header('user-agent')),
  };
}

export function buildHttpErrorLogEntry(
  request: RequestWithLogContext,
  statusCode: number,
  code: string,
): HttpErrorLogEntry {
  return {
    event: 'http_error',
    timestamp: new Date().toISOString(),
    ...commonRequestFields(request),
    statusCode,
    code,
  };
}

export function serializeLogEntry(entry: object): string {
  return JSON.stringify(entry);
}
