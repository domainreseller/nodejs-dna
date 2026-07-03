'use strict';
// test/rest-register.test.js
// TDD tests for RegisterWithContactInfo (Task 10).
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');
const { DEFAULT_NAMESERVERS } = require('../src/shared');

// ---------------------------------------------------------------------------
// Canned response data for success path
// ---------------------------------------------------------------------------
const CANNED_DOMAIN = {
  id: 99,
  domainName: 'example.com',
  status: 0,
  lockStatus: true,
  privacyProtectionStatus: false,
  authCode: 'AUTH123',
  nameservers: ['ns1.example.com', 'ns2.example.com'],
  contacts: [],
  hosts: [],
  startDate: null,
  expirationDate: null,
};

// Minimal contact object for test payloads
const CONTACT = {
  FirstName: 'John',
  LastName: 'Doe',
  EMail: 'john@example.com',
  Company: 'Acme',
  AddressLine1: '123 Main St',
  City: 'New York',
  State: 'NY',
  Country: 'US',
  ZipCode: '10001',
  Phone: '5551234567',
  PhoneCountryCode: '1',
  Fax: '',
  FaxCountryCode: '',
};

// ---------------------------------------------------------------------------
// Existence check (synchronous — no stub, no unhandled rejections)
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo is a real function', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.RegisterWithContactInfo, 'function',
    'RegisterWithContactInfo must be a function');
});

// ---------------------------------------------------------------------------
// Payload structure: correct keys mapping
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo sends POST to domains/register-with-contacts', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp;
  c.request = async (verb, ep, _data) => {
    capturedVerb = verb;
    capturedEp = ep;
    return CANNED_DOMAIN;
  };

  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT });

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp, 'domains/register-with-contacts');
});

test('RegisterWithContactInfo payload has correct keys including isLocked/privacyEnabled', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com', 2,
    { Registrant: CONTACT },
    ['ns1.test.com', 'ns2.test.com'],
    true,
    false,
  );

  assert.ok('domainName'     in sent, 'must have domainName');
  assert.ok('period'         in sent, 'must have period');
  assert.ok('nameServers'    in sent, 'must have nameServers');
  assert.ok('isLocked'       in sent, 'must have isLocked (not eppLock)');
  assert.ok('privacyEnabled' in sent, 'must have privacyEnabled (not privacyLock)');
  assert.ok('contacts'       in sent, 'must have contacts');
  assert.ok('tldAttributes'  in sent, 'must have tldAttributes');

  assert.strictEqual(sent.domainName, 'example.com');
  assert.strictEqual(sent.period, 2);
  assert.strictEqual(sent.isLocked, true);
  assert.strictEqual(sent.privacyEnabled, false);
});

test('RegisterWithContactInfo maps eppLock=false and privacyLock=true correctly', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com', 1,
    { Registrant: CONTACT },
    ['ns1.test.com'],
    false,  // eppLock
    true,   // privacyLock
  );

  assert.strictEqual(sent.isLocked, false);
  assert.strictEqual(sent.privacyEnabled, true);
});

// ---------------------------------------------------------------------------
// Nameserver fallback rules
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo: empty [] nameServers → DEFAULT_NAMESERVERS used', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT }, []);

  assert.deepStrictEqual(sent.nameServers, DEFAULT_NAMESERVERS,
    'empty array must fall back to DEFAULT_NAMESERVERS');
});

test('RegisterWithContactInfo: ["", "  "] nameServers → DEFAULT_NAMESERVERS used', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT }, ['', '  ']);

  assert.deepStrictEqual(sent.nameServers, DEFAULT_NAMESERVERS,
    'all-blank entries must fall back to DEFAULT_NAMESERVERS');
});

test('RegisterWithContactInfo: non-empty nameServers → used verbatim (no fallback)', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  const realNS = ['ns1.myprovider.com', 'ns2.myprovider.com'];
  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT }, realNS);

  assert.deepStrictEqual(sent.nameServers, realNS,
    'provided name-servers must be sent verbatim');
});

test('RegisterWithContactInfo: mixed valid+blank nameServers → blanks stripped, valid ones used', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT }, ['ns1.good.com', '', 'ns2.good.com']);

  assert.deepStrictEqual(sent.nameServers, ['ns1.good.com', 'ns2.good.com'],
    'blank entries stripped; remaining valid entries used');
});

// ---------------------------------------------------------------------------
// tldAttributes: empty → {} (object), NOT []
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo: empty additionalAttributes → tldAttributes sent as {} object', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  // Pass default empty array
  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT });

  assert.ok(!Array.isArray(sent.tldAttributes),
    'tldAttributes must NOT be an array when empty');
  assert.strictEqual(typeof sent.tldAttributes, 'object',
    'tldAttributes must be a plain object when empty');
  assert.strictEqual(Object.keys(sent.tldAttributes).length, 0,
    'tldAttributes must have 0 keys when no attributes provided');
});

test('RegisterWithContactInfo: explicit empty {} additionalAttributes → tldAttributes is {}', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT }, [], true, false, {});

  assert.ok(!Array.isArray(sent.tldAttributes));
  assert.strictEqual(Object.keys(sent.tldAttributes).length, 0);
});

// ---------------------------------------------------------------------------
// tldAttributes: values stringified via stringifyAttributes
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo: numeric attribute values are coerced to strings', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com', 1, { Registrant: CONTACT }, [], true, false,
    { MYATTR: 215, BOOLATTR: true },
  );

  assert.strictEqual(typeof sent.tldAttributes.MYATTR, 'string',
    'numeric attribute must be stringified');
  assert.strictEqual(sent.tldAttributes.MYATTR, '215');
  assert.strictEqual(sent.tldAttributes.BOOLATTR, 'true',
    'boolean attribute must be stringified');
});

// ---------------------------------------------------------------------------
// .tr domain: normalizeTrAttributes applied + values stringified
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo: .tr domain applies normalizeTrAttributes (typo fix)', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  // TRABISCITIZIENID typo should be remapped to TRABISCITIZENID
  await c.RegisterWithContactInfo(
    'test.com.tr', 1, { Registrant: CONTACT }, [], true, false,
    { TRABISCITIZIENID: '12345678901', TRABISDOMAINCATEGORY: 'Owner' },
  );

  assert.ok('TRABISCITIZENID' in sent.tldAttributes,
    'typo TRABISCITIZIENID must be normalized to TRABISCITIZENID');
  assert.ok(!('TRABISCITIZIENID' in sent.tldAttributes),
    'original typo key must be dropped');
  assert.strictEqual(sent.tldAttributes.TRABISCITIZENID, '12345678901');
});

test('RegisterWithContactInfo: .tr domain normalizes TRABISDOMAINCATEGORY numeric 0→Corporate', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com.tr', 1, { Registrant: CONTACT }, [], true, false,
    { TRABISDOMAINCATEGORY: '0', TRABISTAXNUMBER: '12345' },
  );

  assert.strictEqual(sent.tldAttributes.TRABISDOMAINCATEGORY, 'Corporate',
    'numeric 0 must map to Corporate');
});

test('RegisterWithContactInfo: .tr domain normalizes TRABISDOMAINCATEGORY numeric 1→Owner', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com.tr', 1, { Registrant: CONTACT }, [], true, false,
    { TRABISDOMAINCATEGORY: 1, TRABISCITIZENID: '99887766554' },
  );

  assert.strictEqual(sent.tldAttributes.TRABISDOMAINCATEGORY, 'Owner',
    'numeric 1 must map to Owner');
});

test('RegisterWithContactInfo: .tr domain drops unsupported legacy keys', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'domain.web.tr', 1, { Registrant: CONTACT }, [], true, false,
    {
      TRABISDOMAINCATEGORY: 'Owner',
      TRABISCITIZENID: '11223344556',
      TRABISCOUNTRYID: '215',   // legacy — must be dropped
      TRABISCITYID: '34',       // legacy — must be dropped
    },
  );

  assert.ok(!('TRABISCOUNTRYID' in sent.tldAttributes),
    'TRABISCOUNTRYID is a legacy key and must be dropped');
  assert.ok(!('TRABISCITYID' in sent.tldAttributes),
    'TRABISCITYID is a legacy key and must be dropped');
  assert.ok('TRABISCITIZENID' in sent.tldAttributes,
    'valid TRABISCITIZENID must survive');
});

test('RegisterWithContactInfo: .tr domain values are all strings after normalization', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'firm.av.tr', 1, { Registrant: CONTACT }, [], true, false,
    { TRABISDOMAINCATEGORY: 'Corporate', TRABISTAXOFFICE: 'Ankara', TRABISTAXNUMBER: 9876543 },
  );

  for (const [k, v] of Object.entries(sent.tldAttributes)) {
    assert.strictEqual(typeof v, 'string', `tldAttributes.${k} must be a string, got ${typeof v}`);
  }
});

// ---------------------------------------------------------------------------
// Contacts mapping
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo maps contacts via parseContact (Administrative → Admin)', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo(
    'example.com', 1,
    { Administrative: CONTACT },
  );

  assert.strictEqual(sent.contacts.length, 1);
  // Administrative ucfirst(strtolower) → Administrative → typeMap → Admin
  assert.strictEqual(sent.contacts[0].contactType, 'Admin',
    'Administrative must map to contactType Admin');
  assert.strictEqual(sent.contacts[0].firstName, 'John');
  assert.ok('isHidden' in sent.contacts[0], 'contact must have isHidden');
});

test('RegisterWithContactInfo maps Technical → Tech', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  await c.RegisterWithContactInfo('example.com', 1, { Technical: CONTACT });

  assert.strictEqual(sent.contacts[0].contactType, 'Tech');
});

test('RegisterWithContactInfo sends all four contact types when provided', async () => {
  const c = new DNARest('r', 't');
  let sent;
  c.request = async (_v, _e, data) => { sent = data; return CANNED_DOMAIN; };

  const contacts = {
    Administrative: CONTACT,
    Technical:      CONTACT,
    Billing:        CONTACT,
    Registrant:     CONTACT,
  };

  await c.RegisterWithContactInfo('example.com', 1, contacts);

  assert.strictEqual(sent.contacts.length, 4);
  const types = sent.contacts.map((ct) => ct.contactType);
  assert.ok(types.includes('Admin'),      'must include Admin');
  assert.ok(types.includes('Tech'),       'must include Tech');
  assert.ok(types.includes('Billing'),    'must include Billing');
  assert.ok(types.includes('Registrant'), 'must include Registrant');
});

// ---------------------------------------------------------------------------
// Success path: parseDomainInfo mapping
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo success returns parseDomainInfo output', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_DOMAIN;

  const out = await c.RegisterWithContactInfo(
    'example.com', 1, { Registrant: CONTACT },
  );

  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data, 'result must have data');
  assert.strictEqual(out.data.ID, 99);
  assert.strictEqual(out.data.DomainName, 'example.com');
  assert.strictEqual(out.data.Status, 'Active');        // numeric 0 → 'Active'
  assert.strictEqual(out.data.LockStatus, 'true');
  assert.strictEqual(out.data.PrivacyProtectionStatus, 'false');
  assert.deepStrictEqual(out.data.NameServers, ['ns1.example.com', 'ns2.example.com']);
});

// ---------------------------------------------------------------------------
// Error path
// ---------------------------------------------------------------------------

test('RegisterWithContactInfo returns API_XXX error code on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 422');
    err.statusCode = 422;
    throw err;
  };

  const out = await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT });

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_422');
  assert.ok(out.error.Message);
});

test('RegisterWithContactInfo falls back to REGISTER_DOMAIN code when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };

  const out = await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT });

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'REGISTER_DOMAIN');
});

test('RegisterWithContactInfo returns error when request returns empty response', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // empty object → parseDomainInfo returns ERROR

  const out = await c.RegisterWithContactInfo('example.com', 1, { Registrant: CONTACT });

  // parseDomainInfo({}) → {result: 'ERROR', error: {Code: 'RESPONSE', ...}}
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error.Code, 'error must have a Code');
});
