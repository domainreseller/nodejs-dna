// Network-free smoke test used by CI (`npm test`).
// Verifies the package loads and exposes the expected public surface
// WITHOUT hitting the SOAP endpoint (constructing the client would fetch the WSDL).

const assert = require('assert');
const DomainNameAPI = require('../index');

assert.strictEqual(typeof DomainNameAPI, 'function', 'index.js should export the DomainNameAPI class');
assert.strictEqual(typeof DomainNameAPI.VERSION, 'string', 'DomainNameAPI.VERSION should be a string');

// A few representative methods must exist on the prototype.
const expectedMethods = [
  'GetResellerDetails',
  'GetList',
  'GetDetails',
  'CheckAvailability',
  'RegisterWithContactInfo',
  'Transfer',
  'Renew',
  'SyncFromRegistry',
  'ModifyPrivacyProtectionStatus',
];

for (const method of expectedMethods) {
  assert.strictEqual(
    typeof DomainNameAPI.prototype[method],
    'function',
    `DomainNameAPI should expose ${method}()`,
  );
}

console.log(`✓ nodejs-dna smoke test passed (v${DomainNameAPI.VERSION}, ${expectedMethods.length} methods checked)`);
