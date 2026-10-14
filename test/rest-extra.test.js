'use strict';
/**
 * test/rest-extra.test.js
 *
 * Network-free unit tests for Phase 3 Task 8 — REST implementations of:
 *   ModifyNameServer, EnableTheftProtectionLock, DisableTheftProtectionLock, CheckTransfer
 *
 * this.request is stubbed per-test; no network traffic.
 */

const assert   = require('node:assert');
const { test } = require('node:test');
const DNARest  = require('../src/DNARest');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a DNARest instance with request stubbed to return a canned response. */
function makeRest(cannedResponse) {
  const c    = new DNARest('reseller', 'token');
  c.request  = async () => cannedResponse;
  return c;
}

/** Build a DNARest instance whose request throws an HTTP error. */
function makeRestError(statusCode) {
  const c    = new DNARest('reseller', 'token');
  c.request  = async () => {
    const err      = new Error(`HTTP ${statusCode}`);
    err.statusCode = statusCode;
    throw err;
  };
  return c;
}

// ---------------------------------------------------------------------------
// ModifyNameServer
// ---------------------------------------------------------------------------

test('ModifyNameServer: method exists on DNARest prototype', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.ModifyNameServer, 'function');
});

test('ModifyNameServer: sends PUT to domains/dns/name-server with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.ModifyNameServer('example.com', ['ns1.example.com', 'ns2.example.com']);

  assert.strictEqual(capturedVerb, 'PUT');
  assert.strictEqual(capturedEp,   'domains/dns/name-server');
  assert.strictEqual(capturedData.domainName, 'example.com');
  assert.deepStrictEqual(capturedData.nameServers, ['ns1.example.com', 'ns2.example.com']);
});

test('ModifyNameServer: uses response.nameServers when present', async () => {
  const c   = makeRest({ nameServers: ['ns3.example.com', 'ns4.example.com'] });
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com', 'ns2.example.com']);

  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data.NameServers, ['ns3.example.com', 'ns4.example.com']);
});

test('ModifyNameServer: falls back to input nameServers when response.nameServers absent', async () => {
  const c   = makeRest({});
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com', 'ns2.example.com']);

  assert.strictEqual(out.result, 'OK');
  assert.deepStrictEqual(out.data.NameServers, ['ns1.example.com', 'ns2.example.com']);
});

test('ModifyNameServer: success envelope has data.NameServers', async () => {
  const c   = makeRest({});
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com']);
  assert.ok('result' in out);
  assert.ok('data' in out);
  assert.ok('NameServers' in out.data);
  assert.ok(Array.isArray(out.data.NameServers));
});

test('ModifyNameServer: HTTP error returns setError envelope, does not throw', async () => {
  const c   = makeRestError(422);
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com']);

  assert.strictEqual(out.result,     'ERROR');
  assert.ok(out.error,               'error key must be present');
  assert.strictEqual(out.error.Code, 'API_422');
  assert.ok(out.error.Message);
});

test('ModifyNameServer: network error returns MODIFY_NS code, does not throw', async () => {
  const c    = new DNARest('r', 't');
  c.request  = async () => { throw new Error('network failure'); };
  const out  = await c.ModifyNameServer('example.com', ['ns1.example.com']);

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'MODIFY_NS');
});

// ---------------------------------------------------------------------------
// EnableTheftProtectionLock
// ---------------------------------------------------------------------------

test('EnableTheftProtectionLock: method exists on DNARest prototype', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.EnableTheftProtectionLock, 'function');
});

test('EnableTheftProtectionLock: sends POST to domains/lock with lockStatus:true', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(capturedVerb,             'POST');
  assert.strictEqual(capturedEp,               'domains/lock');
  assert.strictEqual(capturedData.domainName,  'example.com');
  assert.strictEqual(capturedData.lockStatus,  true);
});

test('EnableTheftProtectionLock: success envelope has LockStatus:true (hard-coded, ignores response)', async () => {
  // Even if response body says LockStatus:false, we must return true.
  const c   = makeRest({ lockStatus: false });
  const out = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,           'OK');
  assert.strictEqual(out.data.LockStatus,  true);
  assert.ok(!('error' in out), 'no error key on success');
});

test('EnableTheftProtectionLock: success envelope has data.LockStatus=true', async () => {
  const c   = makeRest({});
  const out = await c.EnableTheftProtectionLock('example.com');
  assert.ok('result' in out);
  assert.ok('data'   in out);
  assert.ok('LockStatus' in out.data);
  assert.strictEqual(out.data.LockStatus, true);
});

test('EnableTheftProtectionLock: HTTP error returns setError envelope, does not throw', async () => {
  const c   = makeRestError(403);
  const out = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.ok(out.error);
  assert.strictEqual(out.error.Code, 'API_403');
});

test('EnableTheftProtectionLock: network error returns ENABLE_LOCK code, does not throw', async () => {
  const c    = new DNARest('r', 't');
  c.request  = async () => { throw new Error('network failure'); };
  const out  = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'ENABLE_LOCK');
});

// ---------------------------------------------------------------------------
// DisableTheftProtectionLock
// ---------------------------------------------------------------------------

test('DisableTheftProtectionLock: method exists on DNARest prototype', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.DisableTheftProtectionLock, 'function');
});

test('DisableTheftProtectionLock: sends POST to domains/lock with lockStatus:false', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(capturedVerb,            'POST');
  assert.strictEqual(capturedEp,              'domains/lock');
  assert.strictEqual(capturedData.domainName, 'example.com');
  assert.strictEqual(capturedData.lockStatus, false);
});

test('DisableTheftProtectionLock: success envelope has LockStatus:false (hard-coded, ignores response)', async () => {
  const c   = makeRest({ lockStatus: true });
  const out = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,           'OK');
  assert.strictEqual(out.data.LockStatus,  false);
  assert.ok(!('error' in out), 'no error key on success');
});

test('DisableTheftProtectionLock: success envelope has data.LockStatus=false', async () => {
  const c   = makeRest({});
  const out = await c.DisableTheftProtectionLock('example.com');
  assert.ok('result' in out);
  assert.ok('data'   in out);
  assert.ok('LockStatus' in out.data);
  assert.strictEqual(out.data.LockStatus, false);
});

test('DisableTheftProtectionLock: HTTP error returns setError envelope, does not throw', async () => {
  const c   = makeRestError(500);
  const out = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.ok(out.error);
  assert.strictEqual(out.error.Code, 'API_500');
});

test('DisableTheftProtectionLock: network error returns DISABLE_LOCK code, does not throw', async () => {
  const c    = new DNARest('r', 't');
  c.request  = async () => { throw new Error('network failure'); };
  const out  = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'DISABLE_LOCK');
});

// ---------------------------------------------------------------------------
// CheckTransfer
// ---------------------------------------------------------------------------

test('CheckTransfer: method exists on DNARest prototype', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.CheckTransfer, 'function');
});

test('CheckTransfer: sends POST to domains/transfers/check with correct payload', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return { transferAvailabilityStatus: true };
  };

  await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(capturedVerb,             'POST');
  assert.strictEqual(capturedEp,               'domains/transfers/check');
  assert.strictEqual(capturedData.domainName,  'example.com');
  assert.strictEqual(capturedData.authCode,    'epp123');
});

test('CheckTransfer: success envelope when transferAvailabilityStatus is truthy', async () => {
  const c   = makeRest({
    transferAvailabilityStatus: true,
    authCodeIsRequired        : false,
    authCodeIsValid           : true,
    userTransferRequired      : false,
    transferLock              : false,
    message                   : 'OK',
    messageKey                : 'TRANSFER_OK',
    additionalAttributes      : { foo: 'bar' },
  });
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result, 'OK');
  assert.ok('data' in out);
  assert.strictEqual(out.data.TransferAvailabilityStatus, true);
  assert.strictEqual(out.data.AuthCodeIsRequired,         false);
  assert.strictEqual(out.data.AuthCodeIsValid,            true);
  assert.strictEqual(out.data.UserTransferRequired,       false);
  assert.strictEqual(out.data.TransferLock,               false);
  assert.strictEqual(out.data.Message,                    'OK');
  assert.strictEqual(out.data.MessageKey,                 'TRANSFER_OK');
  assert.deepStrictEqual(out.data.Additional,             { foo: 'bar' });
  assert.ok(!('error' in out), 'no error key on success');
});

test('CheckTransfer: result:ERROR and error key when transferAvailabilityStatus is falsy', async () => {
  const c   = makeRest({
    transferAvailabilityStatus: false,
    message   : 'Domain is not transferable',
    messageKey: 'NOT_AVAILABLE',
  });
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result,       'ERROR');
  assert.ok('data'  in out,            'data key must be present even on failure');
  assert.ok('error' in out,            'error key must be present on failure');
  assert.strictEqual(out.error.Code,   'TRANSFER_NOT_AVAILABLE');
  assert.strictEqual(out.data.TransferAvailabilityStatus, false);
});

test('CheckTransfer: Additional defaults to [] when additionalAttributes absent', async () => {
  const c   = makeRest({ transferAvailabilityStatus: true });
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.deepStrictEqual(out.data.Additional, []);
});

test('CheckTransfer: HTTP error returns setError envelope, does not throw', async () => {
  const c   = makeRestError(400);
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result,     'ERROR');
  assert.ok(out.error);
  assert.strictEqual(out.error.Code, 'API_400');
});

test('CheckTransfer: network error returns CHECK_TRANSFER code, does not throw', async () => {
  const c    = new DNARest('r', 't');
  c.request  = async () => { throw new Error('network failure'); };
  const out  = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result,     'ERROR');
  assert.strictEqual(out.error.Code, 'CHECK_TRANSFER');
});
