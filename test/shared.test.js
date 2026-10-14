const assert = require('node:assert');
const { test } = require('node:test');
const shared = require('../src/shared');

test('shared exposes config constants', () => {
  assert.match(shared.REST_URL_PROD, /domainresellerapi\.com\/api\/v1$/);
  assert.match(shared.REST_URL_OTE, /^https:\/\/ote\./);
  assert.strictEqual(typeof shared.VERSION, 'string');
});
