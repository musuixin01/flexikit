import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  buildInternalErrorResponse,
  normalizeApiErrorCode,
  statusCodeToErrorCode,
  statusLabel,
  type ApiErrorResponse,
} from '../errors/api-error';
import {
  buildHttpErrorLogEntry,
  serializeLogEntry,
  type RequestWithLogContext,
} from '../logging/http-log-context';

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
  return result.length ? result : undefined;
}

export function normalizeHttpException(exception: HttpException): ApiErrorResponse {
  const statusCode = exception.getStatus();
  const payload = exception.getResponse();
  const fallbackCode = statusCodeToErrorCode(statusCode);
  let code: ApiErrorResponse['code'] = fallbackCode;
  let message = exception.message || statusLabel(statusCode);
  let error = statusLabel(statusCode);
  let details: string[] | undefined;

  if (typeof payload === 'string') {
    message = payload;
  } else if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    const payloadMessages = stringArray(body.message);
    const payloadDetails = stringArray(body.details);

    if (typeof body.message === 'string' && body.message.trim()) {
      message = body.message;
    } else if (payloadMessages) {
      message = '请求参数校验失败';
      details = payloadMessages;
      code = 'VALIDATION_ERROR';
    }

    if (typeof body.error === 'string' && body.error.trim()) {
      error = body.error;
    }

    code = normalizeApiErrorCode(body.code, code);
    details = payloadDetails ?? details;
  }

  return {
    statusCode,
    code,
    message,
    error,
    ...(details ? { details } : {}),
  };
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithLogContext>();
    const response = http.getResponse<Response>();

    if (exception instanceof HttpException) {
      const body = normalizeHttpException(exception);
      const logEntry = buildHttpErrorLogEntry(
        request,
        body.statusCode,
        String(body.code),
      );

      if (body.statusCode >= 500) {
        this.logger.error(
          serializeLogEntry(logEntry),
          exception.stack,
        );
      } else {
        this.logger.warn(serializeLogEntry(logEntry));
      }

      response.status(body.statusCode).json(body);
      return;
    }

    const body = buildInternalErrorResponse();
    const logEntry = buildHttpErrorLogEntry(
      request,
      body.statusCode,
      String(body.code),
    );

    this.logger.error(
      serializeLogEntry(logEntry),
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(body.statusCode).json(body);
  }
}
