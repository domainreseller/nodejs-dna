// test/shared-errors.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const s = require('../src/shared');

test('constants match php-dna', () => {
  assert.strictEqual(s.RESULT_OK, 'OK');
  assert.strictEqual(s.RESULT_ERROR, 'ERROR');
  assert.strictEqual(s.RESULT_SUCCESS, 'SUCCESS');
  assert.strictEqual(s.DEFAULT_TIMEOUT, 30);
  assert.deepStrictEqual(s.DEFAULT_NAMESERVERS, ['ns1.domainnameapi.com', 'ns2.domainnameapi.com']);
  assert.strictEqual(s.DEFAULT_REASON, 'Owner request');
  assert.strictEqual(s.DOMAIN_STATUS_MAP[7], 'PendingDelete');
});

test('formatErrorCode: numeric → API_, non-numeric passthrough', () => {
  assert.strictEqual(s.formatErrorCode(404), 'API_404');
  assert.strictEqual(s.formatErrorCode('CREDENTIALS'), 'CREDENTIALS');
});

test('setError with unknown code uses args verbatim', () => {
  assert.deepStrictEqual(
    s.setError(404, 'Not found', 'the domain'),
    { result: 'ERROR', error: { Code: 'API_404', Message: 'Not found', Details: 'the domain' } },
  );
});

test('setError with known code uses the DEFAULT_ERRORS entry', () => {
  const out = s.setError('CREDENTIALS');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'CREDENTIALS');
  assert.ok(out.error.Message.length > 0);
});
