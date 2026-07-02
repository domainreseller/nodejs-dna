const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');
const { REST_URL_OTE, REST_URL_PROD } = require('../src/shared');

test('DNARest selects OTE base URL in test mode', () => {
  assert.strictEqual(new DNARest('id', 'tok', true).serviceUrl, REST_URL_OTE);
  assert.strictEqual(new DNARest('id', 'tok', false).serviceUrl, REST_URL_PROD);
});

test('DNARest exposes the same method surface as DNASoap (skeletons throw)', () => {
  const c = new DNARest('id', 'tok');
  assert.strictEqual(typeof c.GetResellerDetails, 'function');
  assert.throws(() => c.GetResellerDetails(), /not implemented yet \(Phase 2\)/);
});
