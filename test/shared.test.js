const assert = require('node:assert');
const { test } = require('node:test');
const shared = require('../src/shared');

test('looksLikeUuid detects a UUID username (padded)', () => {
  assert.strictEqual(shared.looksLikeUuid('  550e8400-e29b-41d4-a716-446655440000  '), true);
});

test('looksLikeUuid rejects a normal username', () => {
  assert.strictEqual(shared.looksLikeUuid('ownername'), false);
});

test('shared exposes config constants', () => {
  assert.match(shared.REST_URL_PROD, /domainresellerapi\.com\/api\/v1$/);
  assert.match(shared.REST_URL_OTE, /^https:\/\/ote\./);
  assert.match(shared.SOAP_URL, /\.svc\?singlewsdl$/);
  assert.strictEqual(typeof shared.VERSION, 'string');
});
