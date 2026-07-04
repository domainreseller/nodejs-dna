'use strict';
/**
 * test/soap-search.test.js
 *
 * TDD tests for the 3 SOAP methods aligned to the unified php-dna envelope
 * in Phase 3 Task 5: CheckAvailability, GetList, GetTldList.
 *
 * Network-free — callApiFunction is stubbed per test.
 * Canned responses reflect what callApiFunction returns AFTER extracting
 * ${op}Result and adding result:bool (its normal side-effect).
 */

const assert = require('node:assert');
const { test } = require('node:test');
const DNASoap = require('../src/DNASoap');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(canned) {
  const c = new DNASoap('user', 'pass');
  c.callApiFunction = async () => canned;
  return c;
}

// ---------------------------------------------------------------------------
// Canned SOAP callApiFunction responses (PascalCase, already unwrapped)
// ---------------------------------------------------------------------------

const AVAIL_SUCCESS = {
  DomainAvailabilityInfoList: {
    DomainAvailabilityInfo: [
      {
        Tld: 'com', DomainName: 'example', Status: 'available',
        Command: 'create', Period: 1, IsFee: false, Price: null,
        Currency: null, Reason: null,
      },
      {
        Tld: 'net', DomainName: 'example', Status: 'notAvailable',
        Command: 'create', Period: 1, IsFee: false, Price: null,
        Currency: null, Reason: null,
      },
    ],
  },
  OperationResult: 'SUCCESS',
  result: true,
};

// Single-result SOAP collapse: DomainAvailabilityInfo is a plain object (not array)
const AVAIL_SINGLE = {
  DomainAvailabilityInfoList: {
    DomainAvailabilityInfo: {
      Tld: 'com', DomainName: 'single', Status: 'available',
      Command: 'create', Period: 1, IsFee: false, Price: null,
      Currency: null, Reason: null,
    },
  },
  OperationResult: 'SUCCESS',
  result: true,
};

const AVAIL_PREMIUM = {
  DomainAvailabilityInfoList: {
    DomainAvailabilityInfo: [
      {
        Tld: 'io', DomainName: 'premium', Status: 'available',
        Command: 'create', Period: 1, IsFee: true, Price: 12.5,
        Currency: 'USD', Reason: null,
      },
    ],
  },
  OperationResult: 'SUCCESS',
  result: true,
};

const AVAIL_ERROR = {
  result: false,
  level: 'error',
  message: 'Invalid credentials',
  OperationResult: 'FAILED',
};

// -----------

const LIST_SUCCESS = {
  TotalCount: 2,
  DomainInfoList: {
    DomainInfo: [
      {
        Id: 101, Status: 'Active', DomainName: 'example.com', Auth: 'auth1',
        LockStatus: true, PrivacyProtectionStatus: false, IsChildNameServer: false,
        StartDate: '2020-01-15T00:00:00', ExpirationDate: '2025-01-15T00:00:00',
        RemainingDay: 365,
        NameServerList: { NameServer: ['ns1.example.com', 'ns2.example.com'] },
        AdministrativeContactId: 100, BillingContactId: 101,
        TechnicalContactId: 102, RegistrantContactId: 103,
      },
      {
        Id: 202, Status: 0, DomainName: 'test.net', Auth: '',
        LockStatus: false, PrivacyProtectionStatus: true, IsChildNameServer: true,
        StartDate: null, ExpirationDate: null, RemainingDay: 0,
        NameServerList: { NameServer: [] },
      },
    ],
  },
  OperationResult: 'SUCCESS',
  result: true,
};

// Single-domain collapse: DomainInfo is an object, not array
const LIST_SINGLE = {
  TotalCount: 1,
  DomainInfoList: {
    DomainInfo: {
      Id: 55, Status: 'Active', DomainName: 'solo.com', Auth: 'x',
      LockStatus: false, PrivacyProtectionStatus: false, IsChildNameServer: false,
      StartDate: '2022-01-01T00:00:00', ExpirationDate: '2023-01-01T00:00:00',
      RemainingDay: 100,
      NameServerList: { NameServer: 'ns1.solo.com' }, // single NS (string, not array)
    },
  },
  OperationResult: 'SUCCESS',
  result: true,
};

const LIST_EMPTY = {
  TotalCount: 0,
  OperationResult: 'SUCCESS',
  result: true,
  // No DomainInfoList present
};

const LIST_ERROR = {
  result: false,
  level: 'fatal',
  message: 'No data returned',
};

// -----------

const TLD_SUCCESS = {
  TldInfoList: {
    TldInfo: [
      {
        Id: 99, Status: 'Active', MaxCharacterCount: 63, MinCharacterCount: 2,
        MaxRegistrationPeriod: 10, MinRegistrationPeriod: 1, Name: 'com',
        PriceInfoList: {
          TldPriceInfo: [
            { TradeType: 'Register', Period: 2, Price: 20.0,  CurrencyName: 'USD' },
            { TradeType: 'Register', Period: 1, Price: 10.5,  CurrencyName: 'USD' },
            { TradeType: 'Renew',    Period: 1, Price: 11.0,  CurrencyName: 'USD' },
            { TradeType: 'Transfer', Period: 0, Price: 9.0,   CurrencyName: 'USD' }, // period 0 → 1
          ],
        },
      },
      {
        Id: 100, Status: 'Active', MaxCharacterCount: 63, MinCharacterCount: 2,
        MaxRegistrationPeriod: 5, MinRegistrationPeriod: 1, Name: 'net',
        PriceInfoList: {
          TldPriceInfo: [
            { TradeType: 'Register', Period: 1, Price: 8.0, CurrencyName: 'USD' },
          ],
        },
      },
    ],
  },
  OperationResult: 'SUCCESS',
  result: true,
};

// Single-TLD collapse: TldInfo is a plain object (not array)
const TLD_SINGLE = {
  TldInfoList: {
    TldInfo: {
      Id: 1, Status: 'Active', MaxCharacterCount: 63, MinCharacterCount: 2,
      MaxRegistrationPeriod: 10, MinRegistrationPeriod: 1, Name: 'org',
      PriceInfoList: {
        // Single price entry as plain object (not array)
        TldPriceInfo: { TradeType: 'Register', Period: 1, Price: 5.0, CurrencyName: 'USD' },
      },
    },
  },
  OperationResult: 'SUCCESS',
  result: true,
};

const TLD_ERROR = {
  result: false,
  level: 'error',
  message: 'TLD list failed',
  OperationResult: 'FAILED',
};

// ===========================================================================
// CheckAvailability
// ===========================================================================

test('CheckAvailability: returns a direct array on success', async () => {
  const c = makeClient(AVAIL_SUCCESS);
  const result = await c.CheckAvailability(['example'], ['com', 'net'], 1);
  assert.ok(Array.isArray(result), 'result must be a direct array');
  assert.strictEqual(result.length, 2);
});

test('CheckAvailability: item shape matches REST output', async () => {
  const c = makeClient(AVAIL_SUCCESS);
  const result = await c.CheckAvailability(['example'], ['com', 'net'], 1);
  const first = result[0];
  assert.strictEqual(first.TLD, 'com');
  assert.strictEqual(first.DomainName, 'example');
  assert.strictEqual(first.Status, 'available');
  assert.strictEqual(first.Command, 'create');
  assert.strictEqual(first.Period, 1);
  assert.strictEqual(first.IsFee, false);
  assert.strictEqual(first.Price, null);
  assert.strictEqual(first.Currency, null);
  assert.strictEqual(first.Reason, null);
});

test('CheckAvailability: Status "notAvailable" normalizes to "notavailable"', async () => {
  const c = makeClient(AVAIL_SUCCESS);
  const result = await c.CheckAvailability(['example'], ['com', 'net'], 1);
  assert.strictEqual(result[1].Status, 'notavailable');
});

test('CheckAvailability: single-result SOAP collapse handled correctly', async () => {
  const c = makeClient(AVAIL_SINGLE);
  const result = await c.CheckAvailability(['single'], ['com'], 1);
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].DomainName, 'single');
  assert.strictEqual(result[0].Status, 'available');
});

test('CheckAvailability: Price formatted to 4 decimal places when non-null', async () => {
  const c = makeClient(AVAIL_PREMIUM);
  const result = await c.CheckAvailability(['premium'], ['io'], 1);
  assert.strictEqual(result[0].IsFee, true);
  assert.strictEqual(result[0].Price, '12.5000');
  assert.strictEqual(result[0].Currency, 'USD');
});

test('CheckAvailability: error path returns error envelope (does not throw)', async () => {
  const c = makeClient(AVAIL_ERROR);
  const result = await c.CheckAvailability(['x'], ['com'], 1);
  assert.strictEqual(result.result, 'ERROR');
  assert.ok(result.error && result.error.Code, 'must have error.Code');
});

test('CheckAvailability: missing DomainAvailabilityInfoList returns error envelope', async () => {
  const c = makeClient({ result: true, OperationResult: 'SUCCESS' });
  const result = await c.CheckAvailability(['x'], ['com'], 1);
  assert.strictEqual(result.result, 'ERROR');
  assert.ok(result.error && result.error.Code);
});

// ===========================================================================
// GetList
// ===========================================================================

test('GetList: returns {result:OK, TotalCount, data:{Domains:[]}} envelope', async () => {
  const c = makeClient(LIST_SUCCESS);
  const out = await c.GetList();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.TotalCount, 2);
  assert.ok(out.data && Array.isArray(out.data.Domains));
  assert.strictEqual(out.data.Domains.length, 2);
});

test('GetList: domain fields mapped from SOAP PascalCase to REST shape', async () => {
  const c = makeClient(LIST_SUCCESS);
  const out = await c.GetList();
  const first = out.data.Domains[0];
  assert.strictEqual(first.ID, 101);
  assert.strictEqual(first.Status, 'Active');
  assert.strictEqual(first.DomainName, 'example.com');
  assert.strictEqual(first.AuthCode, 'auth1');
  assert.strictEqual(first.LockStatus, 'true');
  assert.strictEqual(first.PrivacyProtectionStatus, 'false');
  assert.strictEqual(first.IsChildNameServer, 'false');
  assert.deepStrictEqual(first.NameServers, ['ns1.example.com', 'ns2.example.com']);
  assert.deepStrictEqual(first.Additional, []);
  assert.deepStrictEqual(first.ChildNameServers, []);
});

test('GetList: Contacts have empty-string IDs (matching REST shape)', async () => {
  const c = makeClient(LIST_SUCCESS);
  const out = await c.GetList();
  const contacts = out.data.Domains[0].Contacts;
  assert.strictEqual(contacts.Billing.ID, '');
  assert.strictEqual(contacts.Technical.ID, '');
  assert.strictEqual(contacts.Administrative.ID, '');
  assert.strictEqual(contacts.Registrant.ID, '');
});

test('GetList: Dates fields present and RemainingDays is numeric', async () => {
  const c = makeClient(LIST_SUCCESS);
  const out = await c.GetList();
  const dates = out.data.Domains[0].Dates;
  assert.ok(typeof dates.Start === 'string');
  assert.ok(typeof dates.Expiration === 'string');
  assert.strictEqual(dates.RemainingDays, 365);
});

test('GetList: numeric Status 0 normalized to "Active"', async () => {
  const c = makeClient(LIST_SUCCESS);
  const out = await c.GetList();
  assert.strictEqual(out.data.Domains[1].Status, 'Active');
});

test('GetList: single DomainInfo object (SOAP collapse) handled correctly', async () => {
  const c = makeClient(LIST_SINGLE);
  const out = await c.GetList();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.TotalCount, 1);
  assert.strictEqual(out.data.Domains.length, 1);
  assert.strictEqual(out.data.Domains[0].DomainName, 'solo.com');
  assert.deepStrictEqual(out.data.Domains[0].NameServers, ['ns1.solo.com']);
});

test('GetList: empty account (TotalCount=0, no DomainInfoList) returns OK with empty Domains', async () => {
  const c = makeClient(LIST_EMPTY);
  const out = await c.GetList();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.TotalCount, 0);
  assert.deepStrictEqual(out.data.Domains, []);
});

test('GetList: error path returns error envelope (does not throw)', async () => {
  const c = makeClient(LIST_ERROR);
  const out = await c.GetList();
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error && out.error.Code);
});

// ===========================================================================
// GetTldList
// ===========================================================================

test('GetTldList: returns {result:OK, data:[...]} envelope', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'OK');
  assert.ok(Array.isArray(out.data));
  assert.strictEqual(out.data.length, 2);
});

test('GetTldList: sequential id starting from 1 (overrides SOAP Id)', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  assert.strictEqual(out.data[0].id, 1);
  assert.strictEqual(out.data[1].id, 2);
});

test('GetTldList: basic fields mapped correctly from SOAP keys', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  const com = out.data[0];
  assert.strictEqual(com.tld, 'com');
  assert.strictEqual(com.status, 'Active');
  assert.strictEqual(com.maxchar, 63);
  assert.strictEqual(com.minchar, 2);
  assert.strictEqual(com.maxperiod, 10);
  assert.strictEqual(com.minperiod, 1);
});

test('GetTldList: TradeType "Register" → pricing key "registration"', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  assert.ok(out.data[0].pricing.registration, 'must have pricing.registration key');
  assert.strictEqual(out.data[0].pricing.registration[1], '10.5000');
  assert.strictEqual(out.data[0].pricing.registration[2], '20.0000');
});

test('GetTldList: period 0 normalized to period 1', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  // Transfer period 0 → key 1
  assert.ok(out.data[0].pricing.transfer, 'must have transfer pricing');
  assert.ok(
    Object.prototype.hasOwnProperty.call(out.data[0].pricing.transfer, 1),
    'period 0 must become key 1',
  );
  assert.strictEqual(out.data[0].pricing.transfer[1], '9.0000');
});

test('GetTldList: pricing periods sorted numerically ascending', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  // com Register has periods 2 (first in canned) and 1; sorted result must be [1, 2]
  const keys = Object.keys(out.data[0].pricing.registration).map(Number);
  assert.deepStrictEqual(keys, [1, 2]);
});

test('GetTldList: currencies captured per trade type', async () => {
  const c = makeClient(TLD_SUCCESS);
  const out = await c.GetTldList();
  assert.strictEqual(out.data[0].currencies.registration, 'USD');
  assert.strictEqual(out.data[0].currencies.renew, 'USD');
  assert.strictEqual(out.data[0].currencies.transfer, 'USD');
});

test('GetTldList: single TldInfo (SOAP collapse) handled correctly', async () => {
  const c = makeClient(TLD_SINGLE);
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.length, 1);
  assert.strictEqual(out.data[0].tld, 'org');
  assert.strictEqual(out.data[0].id, 1);
  assert.strictEqual(out.data[0].pricing.registration[1], '5.0000');
});

test('GetTldList: error path returns error envelope (does not throw)', async () => {
  const c = makeClient(TLD_ERROR);
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error && out.error.Code);
});

test('GetTldList: missing TldInfoList returns error envelope (does not throw)', async () => {
  const c = makeClient({ result: true, OperationResult: 'SUCCESS' });
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error && out.error.Code);
});
