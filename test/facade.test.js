// test/facade.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DomainNameApi = require('../src/DomainNameApi');
const DNARest = require('../src/DNARest');
const { BUSINESS_METHODS, REST_URL_OTE, REST_URL_PROD } = require('../src/shared');

test('UUID reseller ID uses the REST client', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  assert.strictEqual(api.getActiveTransport(), 'REST');
  assert.ok(api.client instanceof DNARest);
});

test('non-UUID reseller ID still uses the REST client (no network on construct)', () => {
  const api = new DomainNameApi('ownername', 'apikey');
  assert.strictEqual(api.getActiveTransport(), 'REST');
  assert.ok(api.client instanceof DNARest);
});

test('positional args map to resellerId / apiKey / testMode', () => {
  const api = new DomainNameApi('  550e8400-e29b-41d4-a716-446655440000 ', ' key ', true);
  assert.strictEqual(api.client.resellerId, '550e8400-e29b-41d4-a716-446655440000');
  assert.strictEqual(api.client.token, 'key');
  assert.strictEqual(api.client.serviceUrl, REST_URL_OTE);
});

test('options object testMode selects OTE; default is production', () => {
  assert.strictEqual(new DomainNameApi('id', 'key', { testMode: true }).client.serviceUrl, REST_URL_OTE);
  assert.strictEqual(new DomainNameApi('id', 'key').client.serviceUrl, REST_URL_PROD);
});

test('facade delegates a method to the active client', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  // GetResellerDetails is now implemented (Task 5) — delegation returns a Promise, not throws.
  assert.ok(api.GetResellerDetails() instanceof Promise,
    'facade must delegate GetResellerDetails and return a Promise');
});

test('VERSION is exposed', () => {
  assert.strictEqual(typeof DomainNameApi.VERSION, 'string');
});

// ---------------------------------------------------------------------------
// Phase 3 Task 3: 25-method parity assertions
// ---------------------------------------------------------------------------

test('BUSINESS_METHODS contains exactly 25 entries', () => {
  assert.strictEqual(BUSINESS_METHODS.length, 25,
    `Expected 25 methods but got ${BUSINESS_METHODS.length}: ${BUSINESS_METHODS.join(', ')}`);
});

test('REST-routed facade exposes all 25 BUSINESS_METHODS as functions', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  for (const name of BUSINESS_METHODS) {
    assert.strictEqual(typeof api[name], 'function',
      `REST facade is missing method: ${name}`);
  }
});

test('IsTrTLD is a pure sync function that returns correct boolean via REST facade', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  assert.strictEqual(api.IsTrTLD('example.com.tr'), true);
  assert.strictEqual(api.IsTrTLD('example.com'), false);
  assert.strictEqual(api.IsTrTLD('test.tr'), true);
});

test('ValidateContact fills defaults through REST facade (network-free)', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  const contact = { FirstName: 'John', LastName: 'Doe' };
  const result = api.ValidateContact(Object.assign({}, contact));
  assert.strictEqual(result.Country, 'TR');
  assert.strictEqual(result.City, 'ISTANBUL');
  assert.strictEqual(result.FirstName, 'John');
});

test('4 new API methods are implemented (return Promise, do not throw synchronously) on REST facade', () => {
  // Phase 3 Task 8: methods are now fully implemented — skeletons replaced.
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  const methods = [
    'ModifyNameServer', 'EnableTheftProtectionLock',
    'DisableTheftProtectionLock', 'CheckTransfer',
  ];
  for (const method of methods) {
    assert.strictEqual(typeof api[method], 'function',
      `${method} must be a function on REST facade`);
    // Must not throw synchronously (real implementation returns a Promise).
    const result = api[method]('example.com', 'arg2');
    assert.ok(result && typeof result.then === 'function',
      `${method} must return a Promise (REST facade)`);
  }
});
