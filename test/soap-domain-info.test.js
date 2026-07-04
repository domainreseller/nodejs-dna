'use strict';
/**
 * test/soap-domain-info.test.js
 *
 * Unit tests for the 5 SOAP methods whose boolean-envelope returns were replaced
 * with the unified php-dna envelope in Phase 3 Task 4:
 *   GetDetails, SyncFromRegistry, GetContacts, GetResellerDetails, GetCurrentBalance
 *
 * Network is never touched — callApiFunction is stubbed per test.
 * Canned responses reflect what callApiFunction returns AFTER extracting
 * ${op}Result and adding result:bool (its normal side-effect).
 */

const assert = require('node:assert');
const { test } = require('node:test');
const DNASoap = require('../src/DNASoap');

// ---------------------------------------------------------------------------
// Canned SOAP callApiFunction responses (PascalCase, already unwrapped)
// ---------------------------------------------------------------------------

const CANNED = {
  // ----- GetDetails / SyncFromRegistry success -----
  DETAILS_OK: {
    DomainInfo: {
      Id                     : 12345,
      Status                 : 'Active',
      DomainName             : 'example.com',
      Auth                   : 'epp-code-abc',
      LockStatus             : true,
      PrivacyProtectionStatus: false,
      IsChildNameServer      : false,
      AdministrativeContactId: 100,
      BillingContactId       : 101,
      TechnicalContactId     : 102,
      RegistrantContactId    : 103,
      StartDate              : '2020-01-01T00:00:00',
      ExpirationDate         : '2030-01-01T00:00:00',
      RemainingDay           : 365,
      NameServerList         : { NameServer: ['ns1.example.com', 'ns2.example.com'] },
    },
    OperationResult: 'SUCCESS',
    result         : true,   // added by callApiFunction
  },

  // ----- GetDetails / SyncFromRegistry failure -----
  DETAILS_FAIL: {
    result : false,
    level  : 'error',
    message: 'Domain not found',
    OperationResult: 'ERROR',
  },

  // ----- GetContacts success -----
  CONTACTS_OK: {
    AdministrativeContact: {
      Id              : 100,
      Status          : 'Active',
      FirstName       : 'Admin',
      LastName        : 'User',
      Company         : 'ACME',
      EMail           : 'admin@example.com',
      Type            : 'Administrative',
      AddressLine1    : '123 Admin St',
      State           : 'CA',
      City            : 'Los Angeles',
      Country         : 'US',
      ZipCode         : '90001',
      Phone           : '5551234567',
      PhoneCountryCode: '1',
      Auth            : 'auth-a',
    },
    BillingContact: {
      Id              : 101,
      Status          : 'Active',
      FirstName       : 'Billing',
      LastName        : 'User',
      Company         : 'ACME',
      EMail           : 'billing@example.com',
      Type            : 'Billing',
      AddressLine1    : '124 Billing St',
      City            : 'Los Angeles',
      Country         : 'US',
      ZipCode         : '90001',
      Phone           : '5551234568',
      PhoneCountryCode: '1',
      Auth            : 'auth-b',
    },
    TechnicalContact: {
      Id              : 102,
      Status          : 'Active',
      FirstName       : 'Tech',
      LastName        : 'User',
      Company         : 'ACME',
      EMail           : 'tech@example.com',
      Type            : 'Technical',
      AddressLine1    : '125 Tech St',
      City            : 'Los Angeles',
      Country         : 'US',
      ZipCode         : '90001',
      Phone           : '5551234569',
      PhoneCountryCode: '1',
      Auth            : 'auth-t',
    },
    RegistrantContact: {
      Id              : 103,
      Status          : 'Active',
      FirstName       : 'Reg',
      LastName        : 'User',
      Company         : 'ACME',
      EMail           : 'reg@example.com',
      Type            : 'Registrant',
      AddressLine1    : '126 Reg St',
      City            : 'Los Angeles',
      Country         : 'US',
      ZipCode         : '90001',
      Phone           : '5551234570',
      PhoneCountryCode: '1',
      Auth            : 'auth-r',
    },
    OperationResult: 'SUCCESS',
    result         : true,
  },

  // ----- GetContacts failure -----
  CONTACTS_FAIL: {
    result : false,
    level  : 'error',
    message: 'Contact fetch failed',
    OperationResult: 'ERROR',
  },

  // ----- GetResellerDetails success -----
  RESELLER_OK: {
    ResellerInfo: {
      Id          : 999,
      Status      : 'Active',
      Name        : 'Test Reseller',
      CurrencyInfo: { Code: 'USD' },
      BalanceInfoList: {
        BalanceInfo: [
          { Balance: '100.00', CurrencyName: 'USD', CurrencySymbol: '$'  },
          { Balance: '200.00', CurrencyName: 'TL',  CurrencySymbol: 'TL' },
        ],
      },
    },
    OperationResult: 'SUCCESS',
    result         : true,
  },

  // ----- GetResellerDetails failure -----
  RESELLER_FAIL: {
    result : false,
    level  : 'error',
    message: 'Invalid credentials',
    OperationResult: 'ERROR',
  },

  // ----- GetCurrentBalance success -----
  BALANCE_OK: {
    ErrorCode       : 0,
    OperationMessage: 'Command completed successfully.',
    OperationResult : 'SUCCESS',
    Balance         : '100.00',
    CurrencyId      : 2,
    CurrencyInfo    : null,
    CurrencyName    : 'USD',
    CurrencySymbol  : '$',
    result          : true,   // added by callApiFunction
  },

  // ----- GetCurrentBalance failure (fatal — no SOAP data available) -----
  BALANCE_FAIL: {
    result : false,
    level  : 'fatal',
    message: 'No data returned',
  },
};

// ---------------------------------------------------------------------------
// Helper: create a DNASoap instance with callApiFunction stubbed.
// ---------------------------------------------------------------------------
function makeSoap(stub) {
  const c = new DNASoap('testuser', 'testpass');
  c.callApiFunction = async (_op, _params) => stub;
  return c;
}

// ===========================================================================
// GetDetails
// ===========================================================================

test('SOAP GetDetails success → {result:"OK", data:{...}} envelope', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const out = await c.GetDetails('example.com');
  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data && typeof out.data === 'object', 'data must be an object');
});

test('SOAP GetDetails success → data.DomainName matches SOAP input', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const out = await c.GetDetails('example.com');
  assert.strictEqual(out.data.DomainName, 'example.com');
});

test('SOAP GetDetails success → data.ID is numeric', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const out = await c.GetDetails('example.com');
  assert.strictEqual(out.data.ID, 12345);
});

test('SOAP GetDetails success → data.LockStatus is string "true"', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const out = await c.GetDetails('example.com');
  assert.strictEqual(out.data.LockStatus, 'true');
});

test('SOAP GetDetails success → data.Contacts has all four types', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const { Contacts } = (await c.GetDetails('example.com')).data;
  assert.strictEqual(Contacts.Administrative.ID, 100);
  assert.strictEqual(Contacts.Billing.ID,        101);
  assert.strictEqual(Contacts.Technical.ID,      102);
  assert.strictEqual(Contacts.Registrant.ID,     103);
});

test('SOAP GetDetails success → data.NameServers is an array', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const { NameServers } = (await c.GetDetails('example.com')).data;
  assert.deepStrictEqual(NameServers, ['ns1.example.com', 'ns2.example.com']);
});

test('SOAP GetDetails success data keys match REST GetDetails data keys', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const soapOut = await c.GetDetails('example.com');
  const { parseDomainInfo } = require('../src/rest-normalize');
  const restOut = parseDomainInfo({
    id: 1, status: 0, domainName: 'x.com', nameservers: [], contacts: [],
  });
  assert.deepStrictEqual(
    Object.keys(soapOut.data).sort(),
    Object.keys(restOut.data).sort(),
    'SOAP and REST GetDetails data must expose the same top-level keys',
  );
});

test('SOAP GetDetails failure → {result:"ERROR", error:{Code:"DOMAIN_DETAILS",...}}', async () => {
  const c = makeSoap(CANNED.DETAILS_FAIL);
  const out = await c.GetDetails('example.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error && typeof out.error === 'object');
  assert.strictEqual(out.error.Code, 'DOMAIN_DETAILS');
});

// ===========================================================================
// SyncFromRegistry
// ===========================================================================

test('SOAP SyncFromRegistry success → {result:"OK", data:{...}} envelope', async () => {
  const c = makeSoap(CANNED.DETAILS_OK);
  const out = await c.SyncFromRegistry('example.com');
  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data && typeof out.data === 'object');
});

test('SOAP SyncFromRegistry success → data shape matches GetDetails shape', async () => {
  const detailsClient = makeSoap(CANNED.DETAILS_OK);
  const syncClient    = makeSoap(CANNED.DETAILS_OK);
  const detailsOut = await detailsClient.GetDetails('example.com');
  const syncOut    = await syncClient.SyncFromRegistry('example.com');
  assert.deepStrictEqual(
    Object.keys(detailsOut.data).sort(),
    Object.keys(syncOut.data).sort(),
    'SyncFromRegistry and GetDetails must produce the same data key set',
  );
});

test('SOAP SyncFromRegistry failure → {result:"ERROR", error:{Code:"DOMAIN_SYNC",...}}', async () => {
  const c = makeSoap(CANNED.DETAILS_FAIL);
  const out = await c.SyncFromRegistry('example.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_SYNC');
});

// ===========================================================================
// GetContacts
// ===========================================================================

test('SOAP GetContacts success → {result:"OK", data:{contacts:{...}}} envelope', async () => {
  const c = makeSoap(CANNED.CONTACTS_OK);
  const out = await c.GetContacts('example.com');
  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data && out.data.contacts && typeof out.data.contacts === 'object');
});

test('SOAP GetContacts success → contacts has Administrative, Billing, Registrant, Technical', async () => {
  const c = makeSoap(CANNED.CONTACTS_OK);
  const { contacts } = (await c.GetContacts('example.com')).data;
  for (const key of ['Administrative', 'Billing', 'Registrant', 'Technical']) {
    assert.ok(contacts[key] && typeof contacts[key] === 'object', `contacts.${key} must be present`);
  }
});

test('SOAP GetContacts success → each contact has unified contact keys', async () => {
  const c = makeSoap(CANNED.CONTACTS_OK);
  const { contacts } = (await c.GetContacts('example.com')).data;
  const EXPECTED_KEYS = ['ID', 'Status', 'AuthCode', 'FirstName', 'LastName', 'Company',
    'EMail', 'Type', 'Address', 'Phone', 'Additional'].sort();
  for (const [role, contact] of Object.entries(contacts)) {
    assert.deepStrictEqual(
      Object.keys(contact).sort(),
      EXPECTED_KEYS,
      `contacts.${role} must have standard contact keys`,
    );
  }
});

test('SOAP GetContacts success → contact ID mapped from SOAP Id', async () => {
  const c = makeSoap(CANNED.CONTACTS_OK);
  const { contacts } = (await c.GetContacts('example.com')).data;
  assert.strictEqual(contacts.Administrative.ID, 100);
  assert.strictEqual(contacts.Billing.ID,        101);
  assert.strictEqual(contacts.Technical.ID,      102);
  assert.strictEqual(contacts.Registrant.ID,     103);
});

test('SOAP GetContacts success data shape matches REST GetContacts data shape', async () => {
  // REST GetContacts also returns {result:'OK', data:{contacts:{Administrative,...}}}
  const c = makeSoap(CANNED.CONTACTS_OK);
  const out = await c.GetContacts('example.com');
  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data);
  assert.ok(out.data.contacts);
  // REST also has all 4 contact keys at this level
  for (const key of ['Administrative', 'Billing', 'Registrant', 'Technical']) {
    assert.ok(out.data.contacts[key] !== undefined, `REST shape requires contacts.${key}`);
  }
});

test('SOAP GetContacts failure → {result:"ERROR", error:{Code:"CONTACT_INFO",...}}', async () => {
  const c = makeSoap(CANNED.CONTACTS_FAIL);
  const out = await c.GetContacts('example.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'CONTACT_INFO');
});

// ===========================================================================
// GetResellerDetails
// ===========================================================================

test('SOAP GetResellerDetails success → result:"OK" at top level (FLAT — no data wrapper)', async () => {
  const c = makeSoap(CANNED.RESELLER_OK);
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data, undefined, 'GetResellerDetails must NOT have a data wrapper');
});

test('SOAP GetResellerDetails success → id, active, name, balance, currency, symbol', async () => {
  const c = makeSoap(CANNED.RESELLER_OK);
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.id,       999);
  assert.strictEqual(out.active,   true);
  assert.strictEqual(out.name,     'Test Reseller');
  assert.strictEqual(out.balance,  '100.00');
  assert.strictEqual(out.currency, 'USD');
  assert.strictEqual(out.symbol,   '$');
});

test('SOAP GetResellerDetails success → balances is array with all currencies', async () => {
  const c = makeSoap(CANNED.RESELLER_OK);
  const { balances } = await c.GetResellerDetails();
  assert.ok(Array.isArray(balances));
  assert.strictEqual(balances.length, 2);
  assert.ok(balances.every((b) => 'balance' in b && 'currency' in b && 'symbol' in b));
});

test('SOAP GetResellerDetails success → active==false when Status!="Active"', async () => {
  const c = new DNASoap('u', 'p');
  const inactiveStub = {
    ...CANNED.RESELLER_OK,
    ResellerInfo: { ...CANNED.RESELLER_OK.ResellerInfo, Status: 'Inactive' },
  };
  c.callApiFunction = async () => inactiveStub;
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.active, false);
});

test('SOAP GetResellerDetails success top-level keys match REST GetResellerDetails keys', async () => {
  const c = makeSoap(CANNED.RESELLER_OK);
  const out = await c.GetResellerDetails();
  // REST shape: {result, id, active, name, balance, currency, symbol, balances}
  for (const key of ['result', 'id', 'active', 'name', 'balance', 'currency', 'symbol', 'balances']) {
    assert.ok(key in out, `SOAP GetResellerDetails must have top-level key: ${key}`);
  }
});

test('SOAP GetResellerDetails failure → {result:"ERROR", error:{Code:"CREDENTIALS",...}}', async () => {
  const c = makeSoap(CANNED.RESELLER_FAIL);
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'CREDENTIALS');
});

// ===========================================================================
// GetCurrentBalance
// ===========================================================================

test('SOAP GetCurrentBalance success → flat shape (no result:"OK" wrapper)', async () => {
  const c = makeSoap(CANNED.BALANCE_OK);
  const out = await c.GetCurrentBalance('USD');
  // The result key from callApiFunction is stripped; top-level should NOT have result:'OK'
  assert.notStrictEqual(out.result, 'OK', 'GetCurrentBalance must NOT use result:"OK" wrapper');
  assert.strictEqual(out.OperationResult, 'SUCCESS');
});

test('SOAP GetCurrentBalance success → all REST-parity keys present', async () => {
  const c = makeSoap(CANNED.BALANCE_OK);
  const out = await c.GetCurrentBalance(2);
  for (const key of ['ErrorCode', 'OperationMessage', 'OperationResult',
    'Balance', 'CurrencyId', 'CurrencyInfo', 'CurrencyName', 'CurrencySymbol']) {
    assert.ok(key in out, `SOAP GetCurrentBalance must have key: ${key}`);
  }
});

test('SOAP GetCurrentBalance success → Balance and CurrencyName match canned response', async () => {
  const c = makeSoap(CANNED.BALANCE_OK);
  const out = await c.GetCurrentBalance(2);
  assert.strictEqual(out.Balance,      '100.00');
  assert.strictEqual(out.CurrencyName, 'USD');
  assert.strictEqual(out.CurrencyId,   2);
  assert.strictEqual(out.CurrencySymbol, '$');
});

test('SOAP GetCurrentBalance success → shape keys match REST GetCurrentBalance shape keys', async () => {
  const c = makeSoap(CANNED.BALANCE_OK);
  const out = await c.GetCurrentBalance(2);
  // REST GetCurrentBalance success returns exactly these top-level keys
  const REST_KEYS = ['ErrorCode', 'OperationMessage', 'OperationResult',
    'Balance', 'CurrencyId', 'CurrencyInfo', 'CurrencyName', 'CurrencySymbol'].sort();
  assert.deepStrictEqual(Object.keys(out).sort(), REST_KEYS);
});

test('SOAP GetCurrentBalance fatal failure → returns flat shape with empty/null fields', async () => {
  const c = makeSoap(CANNED.BALANCE_FAIL);
  const out = await c.GetCurrentBalance(2);
  // On fatal failure (no SOAP data), the flat shape is preserved with fallbacks
  assert.ok('ErrorCode' in out);
  assert.ok('OperationResult' in out);
  assert.ok('Balance' in out);
});
