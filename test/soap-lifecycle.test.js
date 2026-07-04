'use strict';
/**
 * test/soap-lifecycle.test.js
 *
 * Network-free unit tests for Phase 3 Task 6 — the 7 SOAP methods whose
 * boolean-envelope returns were replaced with the unified php-dna envelope:
 *   AddChildNameServer, DeleteChildNameServer, ModifyChildNameServer,
 *   ModifyPrivacyProtectionStatus, Renew, SaveContacts, RegisterWithContactInfo
 *
 * callApiFunction is stubbed per-test so the network is never touched.
 * Canned responses reflect what callApiFunction returns AFTER it extracts
 * ${op}Result and adds result:bool (its normal side-effect).
 */

const assert  = require('node:assert');
const { test } = require('node:test');
const DNASoap = require('../src/DNASoap');
const { formatApiDate } = require('../src/rest-normalize');

// ---------------------------------------------------------------------------
// Canned SOAP callApiFunction responses (already unwrapped by callApiFunction)
// ---------------------------------------------------------------------------

const CANNED = {

  // Generic success (no domain data — used by child NS + privacy + saveContacts)
  SUCCESS: { result: true, OperationResult: 'SUCCESS' },

  // Generic failure
  FAILURE: { result: false, level: 'error', message: 'API error', OperationResult: 'ERROR' },

  // Renew — success with ExpirationDate
  RENEW_OK: {
    result         : true,
    OperationResult: 'SUCCESS',
    ExpirationDate : '2027-06-15T00:00:00',
  },

  // Renew — SUCCESS but missing ExpirationDate
  RENEW_NO_DATE: {
    result         : true,
    OperationResult: 'SUCCESS',
    // ExpirationDate intentionally absent
  },

  // RegisterWithContactInfo — success with DomainInfo
  REGISTER_OK: {
    result         : true,
    OperationResult: 'SUCCESS',
    DomainInfo: {
      Id                     : 55555,
      Status                 : 'Active',
      DomainName             : 'example.com',
      Auth                   : 'eppcode',
      LockStatus             : true,
      PrivacyProtectionStatus: false,
      IsChildNameServer      : false,
      AdministrativeContactId: 10,
      BillingContactId       : 11,
      TechnicalContactId     : 12,
      RegistrantContactId    : 13,
      StartDate              : '2024-01-01T00:00:00',
      ExpirationDate         : '2025-01-01T00:00:00',
      RemainingDay           : 200,
      NameServerList         : { NameServer: ['ns1.domainnameapi.com', 'ns2.domainnameapi.com'] },
    },
  },

  // RegisterWithContactInfo — failure (no DomainInfo)
  REGISTER_NO_DOMAIN: {
    result         : true,
    OperationResult: 'SUCCESS',
    // DomainInfo intentionally absent
  },
};

// Minimal contact fixture for RegisterWithContactInfo tests
const CONTACT = {
  FirstName: 'John', LastName: 'Doe', Company: 'Acme',
  EMail: 'john@example.com', AddressLine1: '123 Main St',
  City: 'Istanbul', Country: 'TR', ZipCode: '34000',
  Phone: '5551234567', PhoneCountryCode: '90', Fax: '', FaxCountryCode: '',
};
const ALL_CONTACTS = {
  Administrative: Object.assign({}, CONTACT),
  Billing       : Object.assign({}, CONTACT),
  Technical     : Object.assign({}, CONTACT),
  Registrant    : Object.assign({}, CONTACT),
};

// ---------------------------------------------------------------------------
// Helper: build a stubbed DNASoap instance that returns a canned value
// ---------------------------------------------------------------------------
function makeSoap(cannedResponse) {
  const c = new DNASoap('user', 'pass');
  c.callApiFunction = async (_op, _params) => cannedResponse;
  return c;
}

// ---------------------------------------------------------------------------
// AddChildNameServer
// ---------------------------------------------------------------------------

test('AddChildNameServer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.AddChildNameServer, 'function');
});

test('AddChildNameServer success → {result:"OK", data:{NameServer, IPAdresses:[ip]}}', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');

  assert.strictEqual(out.result,           'OK',             'result must be "OK"');
  assert.strictEqual(out.data.NameServer,  'ns1.example.com','NameServer must echo input');
  assert.deepStrictEqual(out.data.IPAdresses, ['1.2.3.4'],   'IPAdresses must be array with ip');
  assert.ok(!('error' in out),                               'no error key on success');
});

test('AddChildNameServer preserves one-d IPAdresses typo', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.ok('IPAdresses' in out.data,      'key must be IPAdresses (one-d typo)');
  assert.ok(!('IPAddresses' in out.data),  'IPAddresses (two-d) must NOT exist');
});

test('AddChildNameServer failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4'); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});

// ---------------------------------------------------------------------------
// DeleteChildNameServer
// ---------------------------------------------------------------------------

test('DeleteChildNameServer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.DeleteChildNameServer, 'function');
});

test('DeleteChildNameServer success → {result:"OK", data:{NameServer}}', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.DeleteChildNameServer('example.com', 'ns1.example.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.NameServer, 'ns1.example.com');
  assert.ok(!('IPAdresses' in (out.data || {})), 'DeleteChildNameServer must not have IPAdresses');
});

test('DeleteChildNameServer failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.DeleteChildNameServer('example.com', 'ns1.example.com'); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// ModifyChildNameServer
// ---------------------------------------------------------------------------

test('ModifyChildNameServer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.ModifyChildNameServer, 'function');
});

test('ModifyChildNameServer success → {result:"OK", data:{NameServer, IPAdresses:[ip]}}', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '9.8.7.6');

  assert.strictEqual(out.result,             'OK');
  assert.strictEqual(out.data.NameServer,    'ns1.example.com');
  assert.deepStrictEqual(out.data.IPAdresses, ['9.8.7.6']);
});

test('ModifyChildNameServer failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.ModifyChildNameServer('example.com', 'ns1.example.com', '1.1.1.1'); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// ModifyPrivacyProtectionStatus
// ---------------------------------------------------------------------------

test('ModifyPrivacyProtectionStatus is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.ModifyPrivacyProtectionStatus, 'function');
});

test('ModifyPrivacyProtectionStatus success (true) → {result:"OK", data:{PrivacyProtectionStatus:true}}', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.ModifyPrivacyProtectionStatus('example.com', true);

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.PrivacyProtectionStatus, true, 'echoes back input status=true');
});

test('ModifyPrivacyProtectionStatus success (false) → PrivacyProtectionStatus:false', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const out = await c.ModifyPrivacyProtectionStatus('example.com', false);

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.PrivacyProtectionStatus, false, 'echoes back input status=false');
});

test('ModifyPrivacyProtectionStatus failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.ModifyPrivacyProtectionStatus('example.com', true); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// Renew
// ---------------------------------------------------------------------------

test('Renew is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.Renew, 'function');
});

test('Renew success → {result:"OK", data:{ExpirationDate:<formatted>}}', async () => {
  const c = makeSoap(CANNED.RENEW_OK);
  const out = await c.Renew('example.com', 1);

  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data.ExpirationDate, 'ExpirationDate must be a non-empty string');
  // formatApiDate returns 'YYYY-MM-DDTHH:mm:ss'
  assert.match(out.data.ExpirationDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  // Ensure it matches what formatApiDate would produce
  assert.strictEqual(out.data.ExpirationDate, formatApiDate('2027-06-15T00:00:00'));
});

test('Renew missing ExpirationDate → DOMAIN_RENEW error, no throw', async () => {
  const c = makeSoap(CANNED.RENEW_NO_DATE);
  let out;
  assert.doesNotThrow(() => { out = c.Renew('example.com', 1); });
  out = await out;
  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_RENEW');
});

test('Renew API failure → error envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.Renew('example.com', 1); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// SaveContacts — SOAP transport difference vs REST
// ---------------------------------------------------------------------------

test('SaveContacts is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.SaveContacts, 'function');
});

test('SaveContacts success → {result:"OK"} with NO data key (SOAP transport)', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  const contacts = {
    Administrative: Object.assign({}, CONTACT),
    Billing       : Object.assign({}, CONTACT),
    Technical     : Object.assign({}, CONTACT),
    Registrant    : Object.assign({}, CONTACT),
  };
  const out = await c.SaveContacts('example.com', contacts);

  assert.strictEqual(out.result, 'OK');
  // CRITICAL: SOAP SaveContacts returns NO data key — differs from REST
  assert.ok(!('data' in out), 'SOAP SaveContacts must NOT have a data key (php-dna transport difference)');
});

test('SaveContacts failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.SaveContacts('example.com', {}); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

test('SaveContacts null contacts → no throw', async () => {
  const c = makeSoap(CANNED.SUCCESS);
  let out;
  assert.doesNotThrow(() => { out = c.SaveContacts('example.com', null); });
  out = await out;
  // Graceful — either OK or ERROR but never a throw
  assert.ok(out.result === 'OK' || out.result === 'ERROR', 'must return OK or ERROR, not throw');
});

// ---------------------------------------------------------------------------
// RegisterWithContactInfo
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.RegisterWithContactInfo, 'function');
});

test('RegisterWithContactInfo success → parseSoapDomainInfo shape', async () => {
  const c = makeSoap(CANNED.REGISTER_OK);
  const out = await c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS);

  assert.strictEqual(out.result, 'OK');
  // parseSoapDomainInfo shape
  const d = out.data;
  assert.ok(d,                        'data must be present');
  assert.strictEqual(d.DomainName,    'example.com');
  assert.strictEqual(d.ID,            55555);
  assert.strictEqual(d.Status,        'Active');
  assert.ok(typeof d.LockStatus === 'string', 'LockStatus must be a string ("true"/"false")');
  assert.ok(d.Contacts,               'Contacts must be present');
  assert.ok(d.Dates,                  'Dates must be present');
  assert.ok(Array.isArray(d.NameServers), 'NameServers must be an array');
});

test('RegisterWithContactInfo REST parity: same keys as REST parseDomainInfo output', async () => {
  const c = makeSoap(CANNED.REGISTER_OK);
  const out = await c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS);

  const d = out.data;
  const expectedKeys = [
    'ID', 'Status', 'DomainName', 'AuthCode', 'LockStatus',
    'PrivacyProtectionStatus', 'IsChildNameServer', 'Contacts',
    'Dates', 'NameServers', 'Additional', 'ChildNameServers',
  ];
  for (const key of expectedKeys) {
    assert.ok(key in d, `data.${key} must exist`);
  }
});

test('RegisterWithContactInfo empty nameServers falls back to DEFAULT_NAMESERVERS', async () => {
  const c = new DNASoap('u', 'p');
  let capturedParams;
  c.callApiFunction = async (_op, params) => {
    capturedParams = params;
    return CANNED.REGISTER_OK;
  };

  await c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS, []);

  const finalNS = capturedParams.request.NameServerList.string;
  assert.ok(Array.isArray(finalNS) && finalNS.length > 0, 'must fall back to DEFAULT_NAMESERVERS');
  // DEFAULT_NAMESERVERS are known values
  assert.ok(finalNS[0].includes('domainnameapi'), 'fallback nameserver must come from DEFAULT_NAMESERVERS');
});

test('RegisterWithContactInfo blank nameservers are filtered and fall back', async () => {
  const c = new DNASoap('u', 'p');
  let capturedParams;
  c.callApiFunction = async (_op, params) => {
    capturedParams = params;
    return CANNED.REGISTER_OK;
  };

  await c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS, ['', '  ', null]);

  const finalNS = capturedParams.request.NameServerList.string;
  assert.ok(finalNS.length > 0, 'blank NS filtered → must fall back to DEFAULT_NAMESERVERS');
});

test('RegisterWithContactInfo validates contacts via validateContact', async () => {
  const c = new DNASoap('u', 'p');
  let capturedParams;
  c.callApiFunction = async (_op, params) => {
    capturedParams = params;
    return CANNED.REGISTER_OK;
  };

  // Pass contacts with empty FirstName — validateContact must fill it in
  const sparse = { FirstName: '', LastName: '', Phone: '', PhoneCountryCode: '' };
  const sparseAll = {
    Administrative: Object.assign({}, sparse),
    Billing       : Object.assign({}, sparse),
    Technical     : Object.assign({}, sparse),
    Registrant    : Object.assign({}, sparse),
  };
  await c.RegisterWithContactInfo('example.com', 1, sparseAll);

  const admin = capturedParams.request.AdministrativeContact;
  assert.ok(admin.FirstName.length > 0, 'validateContact must fill in empty FirstName');
  assert.ok(admin.Phone.length > 0,     'validateContact must fill in empty Phone');
});

test('RegisterWithContactInfo no DomainInfo in response → DOMAIN_REGISTER error, no throw', async () => {
  const c = makeSoap(CANNED.REGISTER_NO_DOMAIN);
  let out;
  assert.doesNotThrow(() => { out = c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS); });
  out = await out;
  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_REGISTER');
});

test('RegisterWithContactInfo API failure → error envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  let out;
  assert.doesNotThrow(() => { out = c.RegisterWithContactInfo('example.com', 1, ALL_CONTACTS); });
  out = await out;
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code);
});

test('RegisterWithContactInfo null contacts → no throw', async () => {
  const c = makeSoap(CANNED.REGISTER_OK);
  let out;
  assert.doesNotThrow(() => { out = c.RegisterWithContactInfo('example.com', 1, null); });
  out = await out;
  // Must complete without throw — result may be OK (defaults) or ERROR
  assert.ok(out.result === 'OK' || out.result === 'ERROR');
});

test('RegisterWithContactInfo .tr domain injects TRABIS attributes', async () => {
  const c = new DNASoap('u', 'p');
  let capturedParams;
  c.callApiFunction = async (_op, params) => {
    capturedParams = params;
    return CANNED.REGISTER_OK;
  };

  await c.RegisterWithContactInfo('test.com.tr', 1, ALL_CONTACTS, [], true, false, []);

  const kvList = capturedParams.request.AdditionalAttributes &&
    capturedParams.request.AdditionalAttributes.KeyValueOfstringstring;
  assert.ok(Array.isArray(kvList), 'AdditionalAttributes.KeyValueOfstringstring must be an array for .tr');
  const keys = kvList.map((kv) => kv.Key);
  assert.ok(keys.includes('TRABISDOMAINCATEGORY'), 'TRABISDOMAINCATEGORY must be injected for .tr');
  assert.ok(keys.includes('TRABISCOUNTRYID'),      'TRABISCOUNTRYID must be injected for .tr');
});
