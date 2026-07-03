const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');
const { REST_URL_OTE, REST_URL_PROD } = require('../src/shared');

test('DNARest selects OTE base URL in test mode', () => {
  assert.strictEqual(new DNARest('id', 'tok', true).serviceUrl, REST_URL_OTE);
  assert.strictEqual(new DNARest('id', 'tok', false).serviceUrl, REST_URL_PROD);
});

test('DNARest exposes the same method surface as DNASoap', () => {
  const c = new DNARest('id', 'tok');
  // GetResellerDetails is now implemented (Task 5) — must return a Promise, not throw.
  assert.strictEqual(typeof c.GetResellerDetails, 'function');
  assert.ok(c.GetResellerDetails() instanceof Promise,
    'GetResellerDetails must return a Promise (real implementation, not a skeleton)');
});
