import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function constraintMessages(error: ValidationError): string[] {
  const messages = Object.values(error.constraints ?? {}).filter(
    (message): message is string => typeof message === 'string' && message.trim().length > 0,
  );

  for (const child of error.children ?? []) {
    messages.push(...constraintMessages(child));
  }

  return messages;
}

export function flattenValidationErrors(errors: ValidationError[]): string[] {
  const unique = new Set<string>();

  for (const error of errors) {
    for (const message of constraintMessages(error)) {
      unique.add(message);
    }
  }

  return Array.from(unique);
}

export function createValidationException(errors: ValidationError[]): BadRequestException {
  const details = flattenValidationErrors(errors);

  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: '请求参数校验失败',
    error: 'Bad Request',
    ...(details.length ? { details } : {}),
  });
}
