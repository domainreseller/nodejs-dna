'use strict';
// test/rest-search.test.js
// TDD tests for CheckAvailability, GetList, GetTldList (Task 6).
// PHP source: DNARest.php lines 613–665, 672–725, 732–812.
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

// ---------------------------------------------------------------------------
// CheckAvailability
// ---------------------------------------------------------------------------

test('CheckAvailability: methods are real functions (not skeletons)', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.CheckAvailability, 'function');
  assert.strictEqual(typeof c.GetList, 'function');
  assert.strictEqual(typeof c.GetTldList, 'function');
});

test('CheckAvailability builds cartesian product payload', async () => {
  const c = new DNARest('r', 't');
  let capturedPayload;
  c.request = async (verb, ep, data) => {
    capturedPayload = data;
    assert.strictEqual(verb, 'POST');
    assert.strictEqual(ep, 'domains/bulk-search');
    return [];
  };

  await c.CheckAvailability(['example', 'test'], ['com', '.net'], 1);
  assert.deepStrictEqual(capturedPayload, [
    { domainName: 'example.com' },
    { domainName: 'example.net' },
    { domainName: 'test.com' },
    { domainName: 'test.net' },
  ]);
});

test('CheckAvailability strips leading dot from extension', async () => {
  const c = new DNARest('r', 't');
  let capturedPayload;
  c.request = async (verb, ep, data) => {
    capturedPayload = data;
    return [];
  };
  await c.CheckAvailability(['foo'], ['.io'], 1);
  assert.deepStrictEqual(capturedPayload, [{ domainName: 'foo.io' }]);
});

test('CheckAvailability: status "available" → Status=available', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [
    { domainName: 'example.com', tld: 'com', status: 'available', period: 1, isPremium: false, price: null, currency: null, reason: null },
  ];
  const result = await c.CheckAvailability(['example'], ['com'], 1);
  assert.ok(Array.isArray(result), 'result must be an array');
  assert.strictEqual(result[0].Status, 'available');
  assert.strictEqual(result[0].TLD, 'com');
  assert.strictEqual(result[0].DomainName, 'example');
  assert.strictEqual(result[0].Command, 'create');
  assert.strictEqual(result[0].Period, 1);
  assert.strictEqual(result[0].IsFee, false);
  assert.strictEqual(result[0].Price, null);
  assert.strictEqual(result[0].Currency, null);
  assert.strictEqual(result[0].Reason, null);
});

test('CheckAvailability: status "1" → Status=available', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'foo.net', tld: 'net', status: '1' }];
  const result = await c.CheckAvailability(['foo'], ['net'], 2);
  assert.strictEqual(result[0].Status, 'available');
});

test('CheckAvailability: status "true" → Status=available', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'bar.io', tld: 'io', status: 'true' }];
  const result = await c.CheckAvailability(['bar'], ['io'], 1);
  assert.strictEqual(result[0].Status, 'available');
});

test('CheckAvailability: status "notAvailable" → Status=notavailable', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'taken.com', tld: 'com', status: 'notAvailable' }];
  const result = await c.CheckAvailability(['taken'], ['com'], 1);
  assert.strictEqual(result[0].Status, 'notavailable');
});

test('CheckAvailability: sources items from response.infos when present', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    infos: [{ domainName: 'wrap.com', tld: 'com', status: 'available' }],
  });
  const result = await c.CheckAvailability(['wrap'], ['com'], 1);
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].Status, 'available');
});

test('CheckAvailability: Price formatted to 4 decimal places', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'premium.com', tld: 'com', status: 'available', isPremium: true, price: 12.5, currency: 'USD' }];
  const result = await c.CheckAvailability(['premium'], ['com'], 1);
  assert.strictEqual(result[0].IsFee, true);
  assert.strictEqual(result[0].Price, '12.5000');
  assert.strictEqual(result[0].Currency, 'USD');
});

test('CheckAvailability: uses period param when item.period absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'x.org', tld: 'org', status: 'available' }];
  const result = await c.CheckAvailability(['x'], ['org'], 3);
  assert.strictEqual(result[0].Period, 3);
});

test('CheckAvailability: custom command propagated', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'y.biz', tld: 'biz', status: 'available' }];
  const result = await c.CheckAvailability(['y'], ['biz'], 1, 'transfer');
  assert.strictEqual(result[0].Command, 'transfer');
});

test('CheckAvailability: derives TLD from domainName when tld field absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => [{ domainName: 'hello.world', status: 'notavailable' }];
  const result = await c.CheckAvailability(['hello'], ['world'], 1);
  assert.strictEqual(result[0].TLD, 'world');
  assert.strictEqual(result[0].DomainName, 'hello');
});

test('CheckAvailability: returns error envelope when queries array is empty', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('should not be called'); };
  const result = await c.CheckAvailability([], [], 1);
  assert.strictEqual(result.result, 'ERROR');
  assert.ok(result.error && result.error.Code);
});

test('CheckAvailability: returns error envelope on HTTP exception', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };
  const result = await c.CheckAvailability(['x'], ['com'], 1);
  assert.strictEqual(result.result, 'ERROR');
  assert.strictEqual(result.error.Code, 'API_500');
});

// ---------------------------------------------------------------------------
// GetList
// ---------------------------------------------------------------------------

const CANNED_DOMAINS_RESPONSE = {
  totalCount: 2,
  items: [
    {
      id: 101,
      statusCode: 'Active',
      domainName: 'example.com',
      authCode: 'auth1',
      lockStatus: true,
      privacyProtectionStatus: false,
      hosts: [],
      startDate: '2020-01-15T00:00:00',
      expirationDate: '2025-01-15T00:00:00',
      remainingDay: 365,
      nameServers: ['ns1.example.com', 'ns2.example.com'],
    },
    {
      id: 202,
      statusCode: '',
      statusText: '',
      status: 0,
      domainName: 'test.net',
      authCode: '',
      lockStatus: false,
      privacyProtectionStatus: true,
      hosts: [{ name: 'ns.test.net', ipAddresses: [] }],
      startDate: null,
      expirationDate: null,
      remainingDay: 0,
      nameServers: [],
    },
  ],
};

test('GetList returns result:OK envelope with TotalCount and data.Domains', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'domains');
    assert.strictEqual(params.MaxResultCount, 200);
    assert.strictEqual(params.SkipCount, 0);
    return CANNED_DOMAINS_RESPONSE;
  };
  const out = await c.GetList();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.TotalCount, 2);
  assert.ok(out.data && Array.isArray(out.data.Domains));
  assert.strictEqual(out.data.Domains.length, 2);
});

test('GetList: extra_parameters merged into query', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.strictEqual(params.MaxResultCount, 50);
    assert.strictEqual(params.SkipCount, 10);
    return { totalCount: 0, items: [] };
  };
  await c.GetList({ MaxResultCount: 50, SkipCount: 10 });
});

test('GetList: domain fields mapped correctly', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAINS_RESPONSE;
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

test('GetList: Contacts structure has empty ID strings', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAINS_RESPONSE;
  const out = await c.GetList();
  const contacts = out.data.Domains[0].Contacts;
  assert.strictEqual(contacts.Billing.ID, '');
  assert.strictEqual(contacts.Technical.ID, '');
  assert.strictEqual(contacts.Administrative.ID, '');
  assert.strictEqual(contacts.Registrant.ID, '');
});

test('GetList: Dates fields present with formatApiDate', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAINS_RESPONSE;
  const out = await c.GetList();
  const dates = out.data.Domains[0].Dates;
  assert.ok(typeof dates.Start === 'string');
  assert.ok(typeof dates.Expiration === 'string');
  assert.strictEqual(dates.RemainingDays, 365);
});

test('GetList: prefers statusCode label over statusText over numeric', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAINS_RESPONSE;
  const out = await c.GetList();
  // Second domain: statusCode='', statusText='', status=0 → normalizeDomainStatus(0)='Active'
  assert.strictEqual(out.data.Domains[1].Status, 'Active');
});

test('GetList: IsChildNameServer true when hosts array non-empty', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAINS_RESPONSE;
  const out = await c.GetList();
  assert.strictEqual(out.data.Domains[1].IsChildNameServer, 'true');
});

test('GetList: returns error envelope on HTTP exception', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 403');
    err.statusCode = 403;
    throw err;
  };
  const out = await c.GetList();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_403');
});

test('GetList: DOMAIN_LIST error for no-statusCode generic exception', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };
  const out = await c.GetList();
  assert.strictEqual(out.result, 'ERROR');
  // Either DOMAIN_LIST (known) or fallback code — just ensure result=ERROR
  assert.ok(out.error && out.error.Code);
});

// ---------------------------------------------------------------------------
// GetTldList
// ---------------------------------------------------------------------------

const CANNED_TLD_RESPONSE = {
  items: [
    {
      name: 'com',
      status: 'Active',
      constraints: { maxLenght: 63, minLength: 2 },
      maxRegistrationPeriod: 10,
      minRegistrationPeriod: 1,
      prices: [
        {
          register: [
            { period: 1, price: 10.5, currency: 'USD' },
            { period: 2, price: 20.0, currency: 'USD' },
          ],
          renew: [
            { period: 1, price: 11.0, currency: 'USD' },
          ],
          transfer:  { period: 1, price: 9.0, currency: 'USD' },
          restore:   [],
          refund:    [],
          backorder: [],
        },
      ],
    },
    {
      name: 'net',
      status: 'Active',
      constraints: { maxLenght: 63, minLength: 2 },
      maxRegistrationPeriod: 5,
      minRegistrationPeriod: 1,
      prices: [
        {
          register: [
            { period: 0, price: 8.0, currency: 'USD' }, // period 0 → 1
            { period: 3, price: 22.0, currency: 'USD' },
          ],
        },
      ],
    },
  ],
};

test('GetTldList: calls GET products/tlds with correct query', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'products/tlds');
    assert.strictEqual(params.MaxResultCount, 20);
    assert.strictEqual(params.SkipCount, 0);
    return { items: [] };
  };
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data, []);
});

test('GetTldList: custom count passed', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.strictEqual(params.MaxResultCount, 50);
    return { items: [] };
  };
  await c.GetTldList(50);
});

test('GetTldList: sequential id from 1', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  assert.strictEqual(out.data[0].id, 1);
  assert.strictEqual(out.data[1].id, 2);
});

test('GetTldList: basic fields mapped correctly', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  const com = out.data[0];
  assert.strictEqual(com.tld, 'com');
  assert.strictEqual(com.status, 'Active');
  assert.strictEqual(com.maxchar, 63);
  assert.strictEqual(com.minchar, 2);
  assert.strictEqual(com.maxperiod, 10);
  assert.strictEqual(com.minperiod, 1);
});

test('GetTldList: pricing array from array of price objects', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  const regPricing = out.data[0].pricing.registration;
  assert.strictEqual(regPricing[1], '10.5000');
  assert.strictEqual(regPricing[2], '20.0000');
});

test('GetTldList: pricing from single price object (non-array)', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  const transferPricing = out.data[0].pricing.transfer;
  assert.strictEqual(transferPricing[1], '9.0000');
});

test('GetTldList: period 0 normalized to 1', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  const netReg = out.data[1].pricing.registration;
  // period 0 → key 1; period 3 → key 3
  assert.ok(Object.prototype.hasOwnProperty.call(netReg, 1), 'should have period 1 (normalized from 0)');
  assert.strictEqual(netReg[1], '8.0000');
  assert.strictEqual(netReg[3], '22.0000');
});

test('GetTldList: pricing periods sorted numerically ascending', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    items: [{
      name: 'org',
      status: 'Active',
      constraints: { maxLenght: 63, minLength: 2 },
      maxRegistrationPeriod: 10,
      minRegistrationPeriod: 1,
      prices: [{
        register: [
          { period: 3, price: 30, currency: 'USD' },
          { period: 1, price: 10, currency: 'USD' },
          { period: 2, price: 20, currency: 'USD' },
        ],
      }],
    }],
  });
  const out = await c.GetTldList();
  const keys = Object.keys(out.data[0].pricing.registration).map(Number);
  assert.deepStrictEqual(keys, [1, 2, 3]);
});

test('GetTldList: currencies captured per price type', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_TLD_RESPONSE;
  const out = await c.GetTldList();
  assert.strictEqual(out.data[0].currencies.registration, 'USD');
  assert.strictEqual(out.data[0].currencies.renew, 'USD');
  assert.strictEqual(out.data[0].currencies.transfer, 'USD');
});

test('GetTldList: returns error envelope on HTTP exception', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 401');
    err.statusCode = 401;
    throw err;
  };
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_401');
});

// ---------------------------------------------------------------------------
// Non-HTTP error fallback (regression: Code must not be 'undefined')
// ---------------------------------------------------------------------------

test('CheckAvailability: non-HTTP error yields Code AVAILABILITY not "undefined"', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('boom'); };
  const out = await c.CheckAvailability(['x'], ['com'], 1);
  assert.strictEqual(out.result, 'ERROR');
  assert.notStrictEqual(out.error.Code, 'undefined');
  assert.notStrictEqual(out.error.Code, 'API_undefined');
  assert.strictEqual(out.error.Code, 'AVAILABILITY');
});

test('GetList: non-HTTP error yields Code DOMAIN_LIST not "undefined"', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('boom'); };
  const out = await c.GetList();
  assert.strictEqual(out.result, 'ERROR');
  assert.notStrictEqual(out.error.Code, 'undefined');
  assert.notStrictEqual(out.error.Code, 'API_undefined');
  assert.strictEqual(out.error.Code, 'DOMAIN_LIST');
});

test('GetTldList: non-HTTP error yields Code TLD_LIST not "undefined"', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('boom'); };
  const out = await c.GetTldList();
  assert.strictEqual(out.result, 'ERROR');
  assert.notStrictEqual(out.error.Code, 'undefined');
  assert.notStrictEqual(out.error.Code, 'API_undefined');
  assert.strictEqual(out.error.Code, 'TLD_LIST');
});
