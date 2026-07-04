// test/facade.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DomainNameApi = require('../src/DomainNameApi');
const { BUSINESS_METHODS } = require('../src/shared');

test('UUID username routes to REST', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  assert.strictEqual(api.getActiveTransport(), 'REST');
});

test('normal username routes to SOAP (no network on construct)', () => {
  const api = new DomainNameApi('ownername', 'ownerpass');
  assert.strictEqual(api.getActiveTransport(), 'SOAP');
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

test('SOAP-routed facade exposes all 25 BUSINESS_METHODS as functions', () => {
  const api = new DomainNameApi('ownername', 'ownerpass');
  for (const name of BUSINESS_METHODS) {
    assert.strictEqual(typeof api[name], 'function',
      `SOAP facade is missing method: ${name}`);
  }
});

test('IsTrTLD is a pure sync function that returns correct boolean via REST facade', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  assert.strictEqual(api.IsTrTLD('example.com.tr'), true);
  assert.strictEqual(api.IsTrTLD('example.com'), false);
  assert.strictEqual(api.IsTrTLD('test.tr'), true);
});

test('IsTrTLD is a pure sync function that returns correct boolean via SOAP facade', () => {
  const api = new DomainNameApi('ownername', 'ownerpass');
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

test('ValidateContact fills defaults through SOAP facade (network-free)', () => {
  const api = new DomainNameApi('ownername', 'ownerpass');
  const contact = { FirstName: '', LastName: '' };
  const result = api.ValidateContact(Object.assign({}, contact));
  assert.strictEqual(result.FirstName, 'Isimyok');
  assert.strictEqual(result.Country, 'TR');
});

test('4 new API methods exist and throw Phase-3-Task-8 error on REST facade', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
  const methods = [
    'ModifyNameServer', 'EnableTheftProtectionLock',
    'DisableTheftProtectionLock', 'CheckTransfer',
  ];
  for (const method of methods) {
    assert.throws(
      () => api[method](),
      (err) => {
        assert.ok(err.message.includes('Phase 3 Task 8'),
          `${method}: expected "Phase 3 Task 8" in message, got: ${err.message}`);
        return true;
      },
      `REST facade.${method}() should throw`,
    );
  }
});

test('4 new API methods exist and throw Phase-3-Task-8 error on SOAP facade', () => {
  const api = new DomainNameApi('ownername', 'ownerpass');
  const methods = [
    'ModifyNameServer', 'EnableTheftProtectionLock',
    'DisableTheftProtectionLock', 'CheckTransfer',
  ];
  for (const method of methods) {
    assert.throws(
      () => api[method](),
      (err) => {
        assert.ok(err.message.includes('Phase 3 Task 8'),
          `${method}: expected "Phase 3 Task 8" in message, got: ${err.message}`);
        return true;
      },
      `SOAP facade.${method}() should throw`,
    );
  }
});
