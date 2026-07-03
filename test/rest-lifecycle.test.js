'use strict';
// test/rest-lifecycle.test.js
// TDD tests for Renew, ModifyPrivacyProtectionStatus, SaveContacts (Task 9).
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test }  = require('node:test');
const DNARest   = require('../src/DNARest');

// ---------------------------------------------------------------------------
// Existence checks (synchronous — no stub, no unhandled rejections)
// ---------------------------------------------------------------------------

test('Renew, ModifyPrivacyProtectionStatus, SaveContacts are real functions', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.Renew,                          'function', 'Renew must be a function');
  assert.strictEqual(typeof c.ModifyPrivacyProtectionStatus,  'function', 'ModifyPrivacyProtectionStatus must be a function');
  assert.strictEqual(typeof c.SaveContacts,                   'function', 'SaveContacts must be a function');
});

// ---------------------------------------------------------------------------
// Renew — endpoint + payload
// ---------------------------------------------------------------------------

test('Renew sends POST to domains/renew with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return { expirationDate: '2027-01-15T00:00:00' };
  };

  await c.Renew('example.com', 1);

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/renew');
  assert.strictEqual(capturedData.domainName, 'example.com');
  assert.strictEqual(capturedData.period,     1);
});

// ---------------------------------------------------------------------------
// Renew — success path maps ExpirationDate
// ---------------------------------------------------------------------------

test('Renew success maps ExpirationDate via formatApiDate', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ expirationDate: '2027-01-15T00:00:00' });

  const out = await c.Renew('example.com', 1);

  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data.ExpirationDate, 'ExpirationDate must be a non-empty string');
  assert.match(out.data.ExpirationDate, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
});

// ---------------------------------------------------------------------------
// Renew — falsy expirationDate → DOMAIN_RENEW error
// ---------------------------------------------------------------------------

test('Renew returns DOMAIN_RENEW error when expirationDate is missing', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // no expirationDate key

  const out = await c.Renew('example.com', 1);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_RENEW');
});

test('Renew returns DOMAIN_RENEW error when expirationDate is null', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ expirationDate: null });

  const out = await c.Renew('example.com', 1);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'DOMAIN_RENEW');
});

// ---------------------------------------------------------------------------
// Renew — HTTP error path
// ---------------------------------------------------------------------------

test('Renew returns API_XXX error code on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 422');
    err.statusCode = 422;
    throw err;
  };

  const out = await c.Renew('example.com', 1);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_422');
  assert.ok(out.error.Message);
});

// ---------------------------------------------------------------------------
// ModifyPrivacyProtectionStatus — endpoint + payload
// ---------------------------------------------------------------------------

test('ModifyPrivacyProtectionStatus sends POST to domains/privacy with privacyStatus boolean', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.ModifyPrivacyProtectionStatus('example.com', true);

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/privacy');
  assert.strictEqual(capturedData.domainName,    'example.com');
  assert.strictEqual(capturedData.privacyStatus, true);
  assert.strictEqual(typeof capturedData.privacyStatus, 'boolean', 'privacyStatus must be a boolean');
});

// ---------------------------------------------------------------------------
// ModifyPrivacyProtectionStatus — reason ignored (not forwarded to API)
// ---------------------------------------------------------------------------

test('ModifyPrivacyProtectionStatus does not send reason to API', async () => {
  const c = new DNARest('r', 't');
  let capturedData;
  c.request = async (_v, _e, data) => { capturedData = data; return {}; };

  await c.ModifyPrivacyProtectionStatus('example.com', false, 'Some custom reason');

  assert.ok(!('reason' in capturedData), 'reason must NOT be forwarded to the API');
});

// ---------------------------------------------------------------------------
// ModifyPrivacyProtectionStatus — success returns PrivacyProtectionStatus from input
// ---------------------------------------------------------------------------

test('ModifyPrivacyProtectionStatus success returns PrivacyProtectionStatus: true when status is true', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // response contents irrelevant

  const out = await c.ModifyPrivacyProtectionStatus('example.com', true);

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.PrivacyProtectionStatus, true);
});

test('ModifyPrivacyProtectionStatus success returns PrivacyProtectionStatus: false when status is false', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});

  const out = await c.ModifyPrivacyProtectionStatus('example.com', false);

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.PrivacyProtectionStatus, false);
});

// ---------------------------------------------------------------------------
// ModifyPrivacyProtectionStatus — HTTP error path
// ---------------------------------------------------------------------------

test('ModifyPrivacyProtectionStatus returns API_XXX error on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };

  const out = await c.ModifyPrivacyProtectionStatus('example.com', true);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_500');
  assert.ok(out.error.Message);
});

// ---------------------------------------------------------------------------
// SaveContacts — endpoint + payload
// ---------------------------------------------------------------------------

test('SaveContacts sends PUT to domains/contacts/update with correct payload shape', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return { contacts: [] };
  };

  const contacts = {
    Administrative: {
      FirstName: 'John', LastName: 'Doe', EMail: 'j@e.com', Company: '',
      AddressLine1: '123 Main', City: 'New York', State: 'NY', Country: 'US',
      ZipCode: '10001', Phone: '5551234567', PhoneCountryCode: '1', Fax: '', FaxCountryCode: '',
    },
  };
  await c.SaveContacts('example.com', contacts);

  assert.strictEqual(capturedVerb, 'PUT');
  assert.strictEqual(capturedEp,   'domains/contacts/update');
  assert.strictEqual(capturedData.domainName, 'example.com');
  assert.ok(Array.isArray(capturedData.contacts), 'contacts must be an array');
  assert.strictEqual(capturedData.contacts.length, 1);
});

// ---------------------------------------------------------------------------
// SaveContacts — input mapped via parseContact (Administrative → contactType 'Admin')
// ---------------------------------------------------------------------------

test('SaveContacts maps input contacts via parseContact', async () => {
  const c = new DNARest('r', 't');
  let sentContacts;
  c.request = async (_v, _e, data) => { sentContacts = data.contacts; return { contacts: [] }; };

  const contacts = {
    Administrative: {
      FirstName: 'John', LastName: 'Doe', EMail: 'j@e.com', Company: 'Acme',
      AddressLine1: '123 Main', City: 'New York', State: 'NY', Country: 'US',
      ZipCode: '10001', Phone: '5551234567', PhoneCountryCode: '1', Fax: '', FaxCountryCode: '',
    },
  };
  await c.SaveContacts('example.com', contacts);

  // parseContact maps 'Administrative' → contactType 'Admin'
  assert.strictEqual(sentContacts[0].contactType, 'Admin');
  assert.strictEqual(sentContacts[0].firstName,   'John');
  assert.strictEqual(sentContacts[0].lastName,    'Doe');
  assert.strictEqual(sentContacts[0].eMail,       'j@e.com');
  assert.strictEqual(sentContacts[0].country,     'US');
  assert.ok('isHidden' in sentContacts[0], 'isHidden must be present in mapped contact');
});

test('SaveContacts maps Technical contact to contactType Tech', async () => {
  const c = new DNARest('r', 't');
  let sentContacts;
  c.request = async (_v, _e, data) => { sentContacts = data.contacts; return { contacts: [] }; };

  const contacts = {
    Technical: {
      FirstName: 'Tech', LastName: 'User', EMail: 't@t.com', Company: '',
      AddressLine1: '', City: '', State: '', Country: 'US',
      ZipCode: '', Phone: '', PhoneCountryCode: '', Fax: '', FaxCountryCode: '',
    },
  };
  await c.SaveContacts('example.com', contacts);

  assert.strictEqual(sentContacts[0].contactType, 'Tech');
});

// ---------------------------------------------------------------------------
// SaveContacts — response mapped via parseContactInfo
// ---------------------------------------------------------------------------

test('SaveContacts maps response contacts via parseContactInfo keyed by ucfirst(type)', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    contacts: [
      {
        type:        'Admin',
        handle:      100,
        firstName:   'John',
        lastName:    'Doe',
        eMail:       'j@e.com',
        companyName: 'Acme',
        address:     '123 Main',
        city:        'New York',
        state:       'NY',
        country:     'US',
        postalCode:  '10001',
      },
    ],
  });

  const contacts = {
    Administrative: {
      FirstName: 'John', LastName: 'Doe', EMail: 'j@e.com', Company: 'Acme',
      AddressLine1: '123 Main', City: 'New York', State: 'NY', Country: 'US',
      ZipCode: '10001', Phone: '', PhoneCountryCode: '', Fax: '', FaxCountryCode: '',
    },
  };
  const out = await c.SaveContacts('example.com', contacts);

  assert.strictEqual(out.result, 'OK');
  // PHP: ucfirst(strtolower('Admin')) → 'Admin'
  assert.ok(out.data.contacts['Admin'], 'Key "Admin" must exist (ucfirst(strtolower("Admin")))');
  assert.strictEqual(out.data.contacts['Admin'].ID,        100);
  assert.strictEqual(out.data.contacts['Admin'].FirstName, 'John');
  assert.strictEqual(out.data.contacts['Admin'].LastName,  'Doe');
});

test('SaveContacts returns OK with empty contacts object when response has no contacts', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});  // no contacts key in response

  const out = await c.SaveContacts('example.com', {});

  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data.contacts, {});
});

// ---------------------------------------------------------------------------
// SaveContacts — HTTP error path
// ---------------------------------------------------------------------------

test('SaveContacts returns API_XXX error on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 400');
    err.statusCode = 400;
    throw err;
  };

  const out = await c.SaveContacts('example.com', {});

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_400');
  assert.ok(out.error.Message);
});
