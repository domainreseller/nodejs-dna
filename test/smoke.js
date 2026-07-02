// Network-free smoke test used by CI (`npm test`).
// Verifies the facade loads, routes by username, and exposes the full method
// surface — WITHOUT hitting the SOAP/REST endpoints.

const assert = require('node:assert');
const DomainNameApi = require('../index');

assert.strictEqual(typeof DomainNameApi, 'function', 'index.js should export the DomainNameApi class');
assert.strictEqual(typeof DomainNameApi.VERSION, 'string', 'DomainNameApi.VERSION should be a string');

const soapApi = new DomainNameApi('ownername', 'ownerpass');
const restApi = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
assert.strictEqual(soapApi.getActiveTransport(), 'SOAP', 'normal username should route to SOAP');
assert.strictEqual(restApi.getActiveTransport(), 'REST', 'UUID username should route to REST');

const expectedMethods = [
  'GetResellerDetails','GetList','GetDetails','CheckAvailability','RegisterWithContactInfo',
  'Transfer','Renew','SyncFromRegistry','ModifyPrivacyProtectionStatus',
];
for (const method of expectedMethods) {
  assert.strictEqual(typeof soapApi[method], 'function', `facade should expose ${method}()`);
}

console.log(`✓ nodejs-dna smoke test passed (v${DomainNameApi.VERSION}, SOAP+REST routing OK, ${expectedMethods.length} methods checked)`);
