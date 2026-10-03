import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  wrapApiSuccessResponse,
} = require('../dist/common/responses/api-response.js');

function expect(label, actual, expected) {
  assert.deepEqual(actual, expected);
  console.log(`${label}: PASS`);
}

expect(
  'object response is wrapped',
  wrapApiSuccessResponse({ id: 7, name: 'FlexiKit' }),
  {
    code: 0,
    message: 'success',
    data: { id: 7, name: 'FlexiKit' },
  },
);

expect(
  'array response is wrapped',
  wrapApiSuccessResponse([1, 2, 3]),
  {
    code: 0,
    message: 'success',
    data: [1, 2, 3],
  },
);

expect(
  'string response is wrapped',
  wrapApiSuccessResponse('Hello FlexiKit!'),
  {
    code: 0,
    message: 'success',
    data: 'Hello FlexiKit!',
  },
);

expect(
  'null response remains explicit data',
  wrapApiSuccessResponse(null),
  {
    code: 0,
    message: 'success',
    data: null,
  },
);

console.log('S4.1 response envelope regression: PASS');
