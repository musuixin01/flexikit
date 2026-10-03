import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} = require('@nestjs/common');
const {
  normalizeHttpException,
} = require('../dist/common/filters/http-exception.filter.js');
const {
  buildInternalErrorResponse,
} = require('../dist/common/errors/api-error.js');
const {
  createValidationException,
  flattenValidationErrors,
} = require('../dist/common/errors/validation-error.js');

function expect(label, actual, expected) {
  assert.deepEqual(actual, expected);
  console.log(`${label}: PASS`);
}

expect(
  '400 uses stable BAD_REQUEST code',
  normalizeHttpException(new BadRequestException('invalid input')),
  {
    statusCode: 400,
    code: 'BAD_REQUEST',
    message: 'invalid input',
    error: 'Bad Request',
  },
);

expect(
  '401 uses stable UNAUTHORIZED code',
  normalizeHttpException(new UnauthorizedException('login required')),
  {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    message: 'login required',
    error: 'Unauthorized',
  },
);

expect(
  '403 uses stable FORBIDDEN code',
  normalizeHttpException(new ForbiddenException('blocked')),
  {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'blocked',
    error: 'Forbidden',
  },
);

expect(
  '404 uses stable NOT_FOUND code',
  normalizeHttpException(new NotFoundException('missing')),
  {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'missing',
    error: 'Not Found',
  },
);

const validationErrors = [
  {
    property: 'email',
    constraints: {
      isEmail: 'email must be an email',
      isNotEmpty: 'email should not be empty',
    },
    children: [],
  },
  {
    property: 'profile',
    constraints: {},
    children: [
      {
        property: 'displayName',
        constraints: {
          maxLength: 'displayName must be shorter than or equal to 40 characters',
        },
        children: [],
      },
    ],
  },
];

expect(
  'validation messages flatten deterministically',
  flattenValidationErrors(validationErrors),
  [
    'email must be an email',
    'email should not be empty',
    'displayName must be shorter than or equal to 40 characters',
  ],
);

expect(
  'validation error contract is stable',
  normalizeHttpException(createValidationException(validationErrors)),
  {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: '请求参数校验失败',
    error: 'Bad Request',
    details: [
      'email must be an email',
      'email should not be empty',
      'displayName must be shorter than or equal to 40 characters',
    ],
  },
);

expect(
  'invalid custom error code is ignored',
  normalizeHttpException(new BadRequestException({
    code: 'bad-code',
    message: 'bad request',
  })),
  {
    statusCode: 400,
    code: 'BAD_REQUEST',
    message: 'bad request',
    error: 'Bad Request',
  },
);

expect(
  'unknown exception response does not expose internals',
  buildInternalErrorResponse(),
  {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误，请稍后再试',
    error: 'Internal Server Error',
  },
);

console.log('S4.1 error handling regression: PASS');
