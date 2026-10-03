import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import {
  buildHttpRequestLogEntry,
  ensureRequestId,
  serializeLogEntry,
  type RequestWithLogContext,
} from './http-log-context';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpRequest');

  use(
    request: RequestWithLogContext,
    response: Response,
    next: NextFunction,
  ): void {
    const requestId = ensureRequestId(request);
    const startedAt = process.hrtime.bigint();
    let logged = false;

    response.setHeader('X-Request-Id', requestId);

    const writeLog = (outcome: 'completed' | 'aborted'): void => {
      if (logged) return;
      logged = true;

      const elapsedNs = process.hrtime.bigint() - startedAt;
      const durationMs = Number(elapsedNs) / 1_000_000;
      const entry = buildHttpRequestLogEntry(
        request,
        response.statusCode,
        durationMs,
        outcome,
      );

      this.logger.log(serializeLogEntry(entry));
    };

    response.once('finish', () => writeLog('completed'));
    response.once('close', () => {
      if (!response.writableEnded) writeLog('aborted');
    });

    next();
  }
}
