// test/facade.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DomainNameApi = require('../src/DomainNameApi');

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
  assert.throws(() => api.GetResellerDetails(), /not implemented yet \(Phase 2\)/); // delegated to DNARest skeleton
});

test('VERSION is exposed', () => {
  assert.strictEqual(typeof DomainNameApi.VERSION, 'string');
});
