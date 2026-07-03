'use strict';
// test/rest-transfer.test.js
// TDD tests for Transfer, CancelTransfer, ApproveTransfer, RejectTransfer (Task 8).
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

// ---------------------------------------------------------------------------
// Existence checks (synchronous — no stub, no unhandled rejections)
// ---------------------------------------------------------------------------

test('Transfer, CancelTransfer, ApproveTransfer, RejectTransfer are real functions', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.Transfer,        'function', 'Transfer must be a function');
  assert.strictEqual(typeof c.CancelTransfer,  'function', 'CancelTransfer must be a function');
  assert.strictEqual(typeof c.ApproveTransfer, 'function', 'ApproveTransfer must be a function');
  assert.strictEqual(typeof c.RejectTransfer,  'function', 'RejectTransfer must be a function');
});

// ---------------------------------------------------------------------------
// Transfer — without contacts
// ---------------------------------------------------------------------------

test('Transfer sends POST to domains/transfer with empty contacts array when no contacts provided', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return { id: 1, domainName: 'example.com' };
  };

  await c.Transfer('example.com', 'EPP123', 1);

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/transfer');
  assert.strictEqual(capturedData.domainName, 'example.com');
  assert.strictEqual(capturedData.authCode,   'EPP123');
  assert.strictEqual(capturedData.period,     1);
  assert.deepStrictEqual(capturedData.contacts, []);
});

test('Transfer returns parseDomainInfo mapping on success', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    id:                      42,
    domainName:              'example.com',
    status:                  0,
    lockStatus:              true,
    privacyProtectionStatus: false,
    nameservers:             ['ns1.example.com', 'ns2.example.com'],
    contacts:                [],
    hosts:                   [],
  });

  const out = await c.Transfer('example.com', 'EPP123', 1);

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.ID,         42);
  assert.strictEqual(out.data.DomainName, 'example.com');
  assert.strictEqual(out.data.Status,     'Active');       // numeric 0 → 'Active'
  assert.strictEqual(out.data.LockStatus, 'true');
  assert.deepStrictEqual(out.data.NameServers, ['ns1.example.com', 'ns2.example.com']);
});

// ---------------------------------------------------------------------------
// Transfer — with contacts
// ---------------------------------------------------------------------------

test('Transfer maps contacts via parseContact and sends correct payload', async () => {
  const c = new DNARest('r', 't');
  let sentContacts;
  c.request = async (_verb, _ep, data) => {
    sentContacts = data.contacts;
    return { id: 1, domainName: 'test.com' };
  };

  const inputContacts = {
    Administrative: {
      FirstName:        'John',
      LastName:         'Doe',
      EMail:            'john@example.com',
      Company:          'Acme',
      AddressLine1:     '123 Main St',
      City:             'New York',
      State:            'NY',
      Country:          'US',
      ZipCode:          '10001',
      Phone:            '5551234567',
      PhoneCountryCode: '1',
      Fax:              '',
      FaxCountryCode:   '',
    },
  };

  await c.Transfer('test.com', 'EPP999', 2, inputContacts);

  assert.strictEqual(sentContacts.length, 1);
  const contact = sentContacts[0];
  // Administrative → ucfirst(strtolower) → 'Administrative' → typeMap → 'Admin'
  assert.strictEqual(contact.contactType, 'Admin');
  assert.strictEqual(contact.firstName,   'John');
  assert.strictEqual(contact.lastName,    'Doe');
  assert.strictEqual(contact.eMail,       'john@example.com');
  assert.strictEqual(contact.country,     'US');
  assert.strictEqual(contact.city,        'New York');
  assert.ok('isHidden' in contact, 'isHidden must be present');
});

test('Transfer with multiple contacts sends all mapped contacts', async () => {
  const c = new DNARest('r', 't');
  let sentContacts;
  c.request = async (_verb, _ep, data) => {
    sentContacts = data.contacts;
    return { id: 1, domainName: 'test.com' };
  };

  const inputContacts = {
    Administrative: { FirstName: 'Admin', LastName: 'User', EMail: 'a@a.com', Company: '', AddressLine1: '', City: '', State: '', Country: 'US', ZipCode: '', Phone: '', PhoneCountryCode: '', Fax: '', FaxCountryCode: '' },
    Technical:      { FirstName: 'Tech',  LastName: 'User', EMail: 't@t.com', Company: '', AddressLine1: '', City: '', State: '', Country: 'US', ZipCode: '', Phone: '', PhoneCountryCode: '', Fax: '', FaxCountryCode: '' },
  };

  await c.Transfer('test.com', 'EPP999', 1, inputContacts);

  assert.strictEqual(sentContacts.length, 2);
  const types = sentContacts.map((ct) => ct.contactType);
  assert.ok(types.includes('Admin'), 'should include Admin');
  assert.ok(types.includes('Tech'),  'should include Tech');
});

test('Transfer error returns API_XXX code on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 422');
    err.statusCode = 422;
    throw err;
  };

  const out = await c.Transfer('example.com', 'EPP123', 1);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_422');
  assert.ok(out.error.Message);
});

test('Transfer error falls back to TRANSFER_DOMAIN when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };

  const out = await c.Transfer('example.com', 'EPP123', 1);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'TRANSFER_DOMAIN');
});

// ---------------------------------------------------------------------------
// CancelTransfer
// ---------------------------------------------------------------------------

test('CancelTransfer sends POST to domains/transfers/cancel with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.CancelTransfer('example.com');

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/transfers/cancel');
  assert.deepStrictEqual(capturedData, { domainName: 'example.com' });
});

test('CancelTransfer returns default Status "Cancelled" when response.status absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // no status key in response

  const out = await c.CancelTransfer('example.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'example.com');
  assert.strictEqual(out.data.Status,     'Cancelled');
});

test('CancelTransfer returns response.status when present', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ status: 'PendingCancellation' });

  const out = await c.CancelTransfer('example.com');

  assert.strictEqual(out.result,      'OK');
  assert.strictEqual(out.data.Status, 'PendingCancellation');
});

test('CancelTransfer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 404');
    err.statusCode = 404;
    throw err;
  };

  const out = await c.CancelTransfer('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_404');
  assert.ok(out.error.Message);
});

// ---------------------------------------------------------------------------
// ApproveTransfer
// ---------------------------------------------------------------------------

test('ApproveTransfer sends POST to domains/transfers/approve with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.ApproveTransfer('example.com');

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/transfers/approve');
  assert.deepStrictEqual(capturedData, { domainName: 'example.com' });
});

test('ApproveTransfer returns default Status "Approved" when response.status absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // no status key in response

  const out = await c.ApproveTransfer('example.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'example.com');
  assert.strictEqual(out.data.Status,     'Approved');
});

test('ApproveTransfer returns response.status when present', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ status: 'TransferApproved' });

  const out = await c.ApproveTransfer('example.com');

  assert.strictEqual(out.result,      'OK');
  assert.strictEqual(out.data.Status, 'TransferApproved');
});

test('ApproveTransfer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };

  const out = await c.ApproveTransfer('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_500');
  assert.ok(out.error.Message);
});

// ---------------------------------------------------------------------------
// RejectTransfer
// ---------------------------------------------------------------------------

test('RejectTransfer sends POST to domains/transfers/reject with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.RejectTransfer('example.com');

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/transfers/reject');
  assert.deepStrictEqual(capturedData, { domainName: 'example.com' });
});

test('RejectTransfer returns default Status "Rejected" when response.status absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // no status key in response

  const out = await c.RejectTransfer('example.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'example.com');
  assert.strictEqual(out.data.Status,     'Rejected');
});

test('RejectTransfer returns response.status when present', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ status: 'TransferRejected' });

  const out = await c.RejectTransfer('example.com');

  assert.strictEqual(out.result,      'OK');
  assert.strictEqual(out.data.Status, 'TransferRejected');
});

test('RejectTransfer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 403');
    err.statusCode = 403;
    throw err;
  };

  const out = await c.RejectTransfer('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'API_403');
  assert.ok(out.error.Message);
});
