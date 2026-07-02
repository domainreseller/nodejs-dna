// test/soap.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DNASoap = require('../src/DNASoap');

const SOAP_METHODS = [
  'AddChildNameServer','DeleteChildNameServer','ModifyChildNameServer','GetContacts',
  'SaveContacts','Transfer','CancelTransfer','ApproveTransfer','RejectTransfer','Renew',
  'RegisterWithContactInfo','ModifyPrivacyProtectionStatus','SyncFromRegistry',
  'GetCurrentBalance','CheckAvailability','GetList','GetTldList','GetDetails','GetResellerDetails',
];

test('DNASoap exposes all existing SOAP methods', () => {
  for (const m of SOAP_METHODS) {
    assert.strictEqual(typeof DNASoap.prototype[m], 'function', `missing ${m}`);
  }
});

test('DNASoap constructor does no network I/O (lazy client)', () => {
  const c = new DNASoap('user', 'pass');           // must not throw / not connect
  assert.strictEqual(c.soapClientPromise, undefined, 'SOAP client must be created lazily');
  assert.strictEqual(c.serviceUsername, 'user');
});
