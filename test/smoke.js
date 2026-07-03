// Network-free smoke test used by CI (`npm test`).
// Verifies the facade loads, routes by username, exposes the full method
// surface, and that REST methods are wired to real implementations —
// WITHOUT hitting the SOAP/REST endpoints.

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

// Async assertions: prove REST methods are real implementations (not skeletons)
// by stubbing the HTTP core and verifying the full envelope mapping works.
(async () => {
  // Stub the underlying HTTP request so no network call is made.
  restApi.client.request = async () => ({
    id: 1,
    status: 0,
    domainName: 'example.com',
    nameservers: [],
  });

  const details = await restApi.GetDetails('example.com');
  assert.strictEqual(details.result, 'OK', 'GetDetails should return result OK');
  assert.strictEqual(details.data.DomainName, 'example.com', 'GetDetails should return correct DomainName');

  console.log(`✓ nodejs-dna smoke test passed (v${DomainNameApi.VERSION}, SOAP+REST routing OK, ${expectedMethods.length} methods checked, REST methods verified)`);
})().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message);
  process.exit(1);
});
