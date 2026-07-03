'use strict';
// test/rest-domain-info.test.js
// TDD tests for GetDetails, SyncFromRegistry, and GetContacts (Task 4).
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

// ---------------------------------------------------------------------------
// GetDetails
// ---------------------------------------------------------------------------

test('GetDetails maps domains/info response into the domain envelope', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, data) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'domains/info');
    assert.deepStrictEqual(data, { DomainName: 'x.com' });
    return { id: 9, status: 0, domainName: 'x.com', nameservers: [] };
  };
  const out = await c.GetDetails('x.com');
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.DomainName, 'x.com');
  assert.strictEqual(out.data.ID, 9);
  assert.strictEqual(out.data.Status, 'Active');
  assert.ok(Array.isArray(out.data.NameServers));
});

test('GetDetails returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 404');
    err.statusCode = 404;
    throw err;
  };
  const out = await c.GetDetails('missing.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_404');
  assert.ok(out.error.Message);
});

test('GetDetails error falls back to DOMAIN_DETAILS when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };
  const out = await c.GetDetails('bad.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_DETAILS');
});

// ---------------------------------------------------------------------------
// SyncFromRegistry
// ---------------------------------------------------------------------------

test('SyncFromRegistry is a pure passthrough to GetDetails', async () => {
  const c = new DNARest('r', 't');
  const calls = [];
  c.request = async (verb, ep, data) => {
    calls.push({ verb, ep, data });
    return { id: 7, status: 0, domainName: 'sync.com', nameservers: [] };
  };
  const out = await c.SyncFromRegistry('sync.com');
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.DomainName, 'sync.com');
  // Exactly one GET domains/info call
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].verb, 'GET');
  assert.strictEqual(calls[0].ep, 'domains/info');
  assert.deepStrictEqual(calls[0].data, { DomainName: 'sync.com' });
});

test('SyncFromRegistry propagates GetDetails error envelope', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };
  const out = await c.SyncFromRegistry('x.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_500');
});

// ---------------------------------------------------------------------------
// GetContacts
// ---------------------------------------------------------------------------

const CANNED_CONTACTS_RESPONSE = {
  id: 5,
  domainName: 'contacts.com',
  contacts: [
    {
      contactType: 'Admin',
      handle: 101,
      firstName: 'Alice',
      lastName: 'Smith',
      eMail: 'alice@contacts.com',
      address: '1 Main St',
      city: 'NY',
      state: 'NY',
      country: 'US',
      postalCode: '10001',
      phoneCountryCode: '1',
      phone: '5550001111',
      faxCountryCode: '',
      fax: '',
    },
    {
      contactType: 'Tech',
      handle: 102,
      firstName: 'Bob',
      lastName: 'Jones',
      eMail: 'bob@contacts.com',
    },
    {
      contactType: 'Billing',
      handle: 103,
      firstName: 'Carol',
      lastName: 'White',
      eMail: 'carol@contacts.com',
    },
    {
      contactType: 'Registrant',
      handle: 104,
      firstName: 'Dave',
      lastName: 'Brown',
      eMail: 'dave@contacts.com',
    },
  ],
};

test('GetContacts maps contacts with correct SOAP keys', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, data) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'domains/info');
    assert.deepStrictEqual(data, { DomainName: 'contacts.com' });
    return CANNED_CONTACTS_RESPONSE;
  };
  const out = await c.GetContacts('contacts.com');
  assert.strictEqual(out.result, 'OK');
  const { contacts } = out.data;
  // All four canonical keys present
  assert.ok(contacts.Administrative, 'Administrative contact missing');
  assert.ok(contacts.Technical, 'Technical contact missing');
  assert.ok(contacts.Billing, 'Billing contact missing');
  assert.ok(contacts.Registrant, 'Registrant contact missing');
  // Admin → Administrative
  assert.strictEqual(contacts.Administrative.FirstName, 'Alice');
  assert.strictEqual(contacts.Administrative.ID, 101);
  // Tech → Technical
  assert.strictEqual(contacts.Technical.FirstName, 'Bob');
  // EMail field is mapped
  assert.strictEqual(contacts.Administrative.EMail, 'alice@contacts.com');
});

test('GetContacts output is ordered Administrative, Billing, Registrant, Technical', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_CONTACTS_RESPONSE;
  const out = await c.GetContacts('contacts.com');
  const keys = Object.keys(out.data.contacts);
  assert.deepStrictEqual(keys, ['Administrative', 'Billing', 'Registrant', 'Technical']);
});

test('GetContacts returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 403');
    err.statusCode = 403;
    throw err;
  };
  const out = await c.GetContacts('denied.com');
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_403');
  assert.ok(out.error.Message);
});

test('GetContacts handles empty contacts array gracefully', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ id: 1, domainName: 'empty.com', contacts: [] });
  const out = await c.GetContacts('empty.com');
  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data.contacts, {});
});

test('GetContacts handles missing contacts field gracefully', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ id: 1, domainName: 'nocontacts.com' });
  const out = await c.GetContacts('nocontacts.com');
  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data.contacts, {});
});

// ---------------------------------------------------------------------------
// Skeleton guard — real methods must NOT be overwritten by the placeholder loop
// ---------------------------------------------------------------------------

test('GetDetails, SyncFromRegistry, GetContacts are real methods (not skeletons)', () => {
  const c = new DNARest('r', 't');
  // Real methods are async; skeletons throw synchronously
  for (const name of ['GetDetails', 'SyncFromRegistry', 'GetContacts']) {
    assert.ok(typeof c[name] === 'function', `${name} is not a function`);
    // Calling returns a Promise (not a thrown error)
    assert.ok(
      c[name]('x.com') instanceof Promise,
      `${name} did not return a Promise — may still be a skeleton`,
    );
  }
  // Clean up dangling promises to avoid unhandled rejections in test output
  // (they will reject because request is not stubbed, but that is expected here)
});
