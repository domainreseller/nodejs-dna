// Network-free smoke test used by CI (`npm test`).
// Verifies the facade loads, always uses the REST client, exposes the full
// method surface, and that REST methods are wired to real implementations —
// WITHOUT hitting the REST endpoints.

const assert = require('node:assert');
const DomainNameApi = require('../index');
const { BUSINESS_METHODS } = require('../src/shared');

assert.strictEqual(typeof DomainNameApi, 'function', 'index.js should export the DomainNameApi class');
assert.strictEqual(typeof DomainNameApi.VERSION, 'string', 'DomainNameApi.VERSION should be a string');

const restApi = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
const nonUuidApi = new DomainNameApi('ownername', 'apikey');
assert.strictEqual(restApi.getActiveTransport(), 'REST', 'UUID reseller ID should use REST');
assert.strictEqual(nonUuidApi.getActiveTransport(), 'REST', 'non-UUID reseller ID should still use REST');

// Legacy subset — kept for backward compatibility.
const expectedMethods = [
  'GetResellerDetails','GetList','GetDetails','CheckAvailability','RegisterWithContactInfo',
  'Transfer','Renew','SyncFromRegistry','ModifyPrivacyProtectionStatus',
];
for (const method of expectedMethods) {
  assert.strictEqual(typeof restApi[method], 'function', `facade should expose ${method}()`);
}

// Full 25-method surface must exist on the facade.
assert.strictEqual(BUSINESS_METHODS.length, 25, `BUSINESS_METHODS should list exactly 25 methods (got ${BUSINESS_METHODS.length})`);
for (const method of BUSINESS_METHODS) {
  assert.strictEqual(typeof restApi[method], 'function', `REST facade should expose ${method}()`);
}

// Async assertions: prove REST methods are real implementations (not skeletons)
// by stubbing the HTTP core and verifying the full envelope mapping works.
(async () => {
  // --- Canned REST response: camelCase keys that parseDomainInfo expects ---
  restApi.client.request = async () => ({
    id: 1,
    status: 0,
    domainName: 'example.com',
    nameservers: ['a'],
  });

  const restDetails = await restApi.GetDetails('example.com');
  assert.strictEqual(restDetails.result, 'OK', 'REST GetDetails should return result OK');
  assert.strictEqual(restDetails.data.DomainName, 'example.com', 'REST GetDetails should return correct DomainName');

  console.log(
    `✓ nodejs-dna smoke test passed` +
    ` (v${DomainNameApi.VERSION},` +
    ` REST client OK,` +
    ` full ${BUSINESS_METHODS.length}-method surface)`,
  );
})().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message);
  process.exit(1);
});
