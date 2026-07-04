// Network-free smoke test used by CI (`npm test`).
// Verifies the facade loads, routes by username, exposes the full method
// surface, and that REST methods are wired to real implementations —
// WITHOUT hitting the SOAP/REST endpoints.

const assert = require('node:assert');
const DomainNameApi = require('../index');
const { BUSINESS_METHODS } = require('../src/shared');

assert.strictEqual(typeof DomainNameApi, 'function', 'index.js should export the DomainNameApi class');
assert.strictEqual(typeof DomainNameApi.VERSION, 'string', 'DomainNameApi.VERSION should be a string');

const soapApi = new DomainNameApi('ownername', 'ownerpass');
const restApi = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token');
assert.strictEqual(soapApi.getActiveTransport(), 'SOAP', 'normal username should route to SOAP');
assert.strictEqual(restApi.getActiveTransport(), 'REST', 'UUID username should route to REST');

// Legacy subset — kept for backward compatibility.
const expectedMethods = [
  'GetResellerDetails','GetList','GetDetails','CheckAvailability','RegisterWithContactInfo',
  'Transfer','Renew','SyncFromRegistry','ModifyPrivacyProtectionStatus',
];
for (const method of expectedMethods) {
  assert.strictEqual(typeof soapApi[method], 'function', `facade should expose ${method}()`);
}

// Full 25-method surface must exist on BOTH transports.
assert.strictEqual(BUSINESS_METHODS.length, 25, `BUSINESS_METHODS should list exactly 25 methods (got ${BUSINESS_METHODS.length})`);
for (const method of BUSINESS_METHODS) {
  assert.strictEqual(typeof soapApi[method], 'function', `SOAP facade should expose ${method}()`);
  assert.strictEqual(typeof restApi[method], 'function', `REST facade should expose ${method}()`);
}

// Async assertions: prove REST methods are real implementations (not skeletons)
// by stubbing the HTTP core and verifying the full envelope mapping works.
// Also prove SOAP/REST produce the SAME envelope shape (transport transparency).
(async () => {
  // --- Canned REST response: camelCase keys that parseDomainInfo expects ---
  restApi.client.request = async () => ({
    id: 1,
    status: 0,
    domainName: 'example.com',
    nameservers: ['a'],
  });

  // --- Canned SOAP response: callApiFunction returns PascalCase DomainInfo ---
  // parseSoapDomainInfo receives response.DomainInfo and maps Id/Status/DomainName/
  // NameServerList.NameServer → the same output shape as parseDomainInfo.
  soapApi.client.callApiFunction = async () => ({
    result: true,
    DomainInfo: {
      Id            : 1,
      Status        : 0,
      DomainName    : 'example.com',
      NameServerList: { NameServer: ['a'] },
    },
  });

  const restDetails = await restApi.GetDetails('example.com');
  assert.strictEqual(restDetails.result, 'OK', 'REST GetDetails should return result OK');
  assert.strictEqual(restDetails.data.DomainName, 'example.com', 'REST GetDetails should return correct DomainName');

  const soapDetails = await soapApi.GetDetails('example.com');
  assert.strictEqual(soapDetails.result, 'OK', 'SOAP GetDetails should return result OK');
  assert.strictEqual(soapDetails.data.DomainName, 'example.com', 'SOAP GetDetails should return correct DomainName');

  // Envelope parity: both transports must expose identical top-level data keys.
  assert.deepStrictEqual(
    Object.keys(soapDetails.data).sort(),
    Object.keys(restDetails.data).sort(),
    'SOAP and REST GetDetails must return the same set of top-level data keys',
  );

  console.log(
    `✓ nodejs-dna smoke test passed` +
    ` (v${DomainNameApi.VERSION},` +
    ` SOAP+REST routing OK,` +
    ` SOAP/REST envelope parity verified,` +
    ` full ${BUSINESS_METHODS.length}-method surface on both transports)`,
  );
})().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message);
  process.exit(1);
});
