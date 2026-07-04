'use strict';
/**
 * test/soap-extra.test.js
 *
 * Network-free unit tests for Phase 3 Task 8 — SOAP implementations of:
 *   ModifyNameServer, EnableTheftProtectionLock, DisableTheftProtectionLock, CheckTransfer
 *
 * callApiFunction is stubbed per-test; no network traffic.
 *
 * Canned responses reflect what callApiFunction returns AFTER it extracts
 * ${op}Result and adds result:bool (its normal side-effect).
 */

const assert   = require('node:assert');
const { test } = require('node:test');
const DNASoap  = require('../src/DNASoap');

// ---------------------------------------------------------------------------
// Canned callApiFunction responses
// ---------------------------------------------------------------------------

const CANNED = {
  OK     : { result: true,  OperationResult: 'SUCCESS' },
  FAILURE: { result: false, level: 'error', message: 'API error', OperationResult: 'ERROR' },
  FATAL  : { result: false, level: 'fatal', message: 'No data returned' },
};

/** Build a DNASoap instance with callApiFunction stubbed to return a canned value. */
function makeSoap(cannedResponse) {
  const c             = new DNASoap('user', 'pass');
  c.callApiFunction   = async () => cannedResponse;
  return c;
}

/** Capture-and-return stub — also exposes what op+params were passed. */
function makeSoapCapture(cannedResponse) {
  const c = new DNASoap('user', 'pass');
  let capturedOp, capturedParams;
  c.callApiFunction = async (op, params) => {
    capturedOp     = op;
    capturedParams = params;
    return cannedResponse;
  };
  return { c, getCaptured: () => ({ capturedOp, capturedParams }) };
}

// ---------------------------------------------------------------------------
// ModifyNameServer
// ---------------------------------------------------------------------------

test('ModifyNameServer: method exists on DNASoap prototype', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.ModifyNameServer, 'function');
});

test('ModifyNameServer: calls callApiFunction with op=ModifyNameServer and correct request', async () => {
  const { c, getCaptured } = makeSoapCapture(CANNED.OK);
  await c.ModifyNameServer('example.com', ['ns1.example.com', 'ns2.example.com']);

  const { capturedOp, capturedParams } = getCaptured();
  assert.strictEqual(capturedOp, 'ModifyNameServer');
  assert.strictEqual(capturedParams.request.DomainName, 'example.com');
  assert.deepStrictEqual(capturedParams.request.NameServerList, ['ns1.example.com', 'ns2.example.com']);
});

test('ModifyNameServer: success → {result:"OK", data:{NameServers:[...]}} matching REST shape', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com', 'ns2.example.com']);

  assert.strictEqual(out.result, 'OK');
  assert.ok('data' in out);
  assert.ok('NameServers' in out.data);
  assert.deepStrictEqual(out.data.NameServers, ['ns1.example.com', 'ns2.example.com']);
  assert.ok(!('error' in out));
});

test('ModifyNameServer: success envelope shape matches REST ModifyNameServer', async () => {
  // Both transports must share the same data.NameServers key.
  const c   = makeSoap(CANNED.OK);
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com']);
  assert.ok('result' in out);
  assert.ok('data'   in out);
  assert.ok(Array.isArray(out.data.NameServers));
});

test('ModifyNameServer: API failure → setError envelope, does not throw', async () => {
  const c   = makeSoap(CANNED.FAILURE);
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com']);

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error,           'error key must be present');
  assert.ok(out.error.Code,      'error.Code must be set');
});

test('ModifyNameServer: structural error (fatal) → setError envelope, does not throw', async () => {
  const c   = makeSoap(CANNED.FATAL);
  const out = await c.ModifyNameServer('example.com', ['ns1.example.com']);

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error);
});

// ---------------------------------------------------------------------------
// EnableTheftProtectionLock
// ---------------------------------------------------------------------------

test('EnableTheftProtectionLock: method exists on DNASoap prototype', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.EnableTheftProtectionLock, 'function');
});

test('EnableTheftProtectionLock: calls callApiFunction with op=EnableTheftProtectionLock', async () => {
  const { c, getCaptured } = makeSoapCapture(CANNED.OK);
  await c.EnableTheftProtectionLock('example.com');

  const { capturedOp, capturedParams } = getCaptured();
  assert.strictEqual(capturedOp, 'EnableTheftProtectionLock');
  assert.strictEqual(capturedParams.request.DomainName, 'example.com');
});

test('EnableTheftProtectionLock: success → {result:"OK", data:{LockStatus:true}} matching REST shape', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,          'OK');
  assert.ok('data' in out);
  assert.strictEqual(out.data.LockStatus, true);
  assert.ok(!('error' in out));
});

test('EnableTheftProtectionLock: LockStatus is hard-coded true regardless of SOAP response body', async () => {
  // Even if callApiFunction returns LockStatus:false, we must return true
  const c = makeSoap({ result: true, OperationResult: 'SUCCESS', LockStatus: false });
  const out = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.data.LockStatus, true);
});

test('EnableTheftProtectionLock: success envelope shape matches REST EnableTheftProtectionLock', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.EnableTheftProtectionLock('example.com');
  assert.ok('result' in out);
  assert.ok('data'   in out);
  assert.ok('LockStatus' in out.data);
  assert.strictEqual(out.data.LockStatus, true);
});

test('EnableTheftProtectionLock: API failure → setError envelope, does not throw', async () => {
  const c   = makeSoap(CANNED.FAILURE);
  const out = await c.EnableTheftProtectionLock('example.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error);
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// DisableTheftProtectionLock
// ---------------------------------------------------------------------------

test('DisableTheftProtectionLock: method exists on DNASoap prototype', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.DisableTheftProtectionLock, 'function');
});

test('DisableTheftProtectionLock: calls callApiFunction with op=DisableTheftProtectionLock', async () => {
  const { c, getCaptured } = makeSoapCapture(CANNED.OK);
  await c.DisableTheftProtectionLock('example.com');

  const { capturedOp, capturedParams } = getCaptured();
  assert.strictEqual(capturedOp, 'DisableTheftProtectionLock');
  assert.strictEqual(capturedParams.request.DomainName, 'example.com');
});

test('DisableTheftProtectionLock: success → {result:"OK", data:{LockStatus:false}} matching REST shape', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.result,          'OK');
  assert.ok('data' in out);
  assert.strictEqual(out.data.LockStatus, false);
  assert.ok(!('error' in out));
});

test('DisableTheftProtectionLock: LockStatus is hard-coded false regardless of SOAP response body', async () => {
  const c   = makeSoap({ result: true, OperationResult: 'SUCCESS', LockStatus: true });
  const out = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.data.LockStatus, false);
});

test('DisableTheftProtectionLock: success envelope shape matches REST DisableTheftProtectionLock', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.DisableTheftProtectionLock('example.com');
  assert.ok('result' in out);
  assert.ok('data'   in out);
  assert.ok('LockStatus' in out.data);
  assert.strictEqual(out.data.LockStatus, false);
});

test('DisableTheftProtectionLock: API failure → setError envelope, does not throw', async () => {
  const c   = makeSoap(CANNED.FAILURE);
  const out = await c.DisableTheftProtectionLock('example.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error);
  assert.ok(out.error.Code);
});

// ---------------------------------------------------------------------------
// CheckTransfer
// ---------------------------------------------------------------------------

test('CheckTransfer: method exists on DNASoap prototype', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.CheckTransfer, 'function');
});

test('CheckTransfer: calls callApiFunction with op=CheckTransfer and correct request', async () => {
  const { c, getCaptured } = makeSoapCapture(CANNED.OK);
  await c.CheckTransfer('example.com', 'epp123');

  const { capturedOp, capturedParams } = getCaptured();
  assert.strictEqual(capturedOp, 'CheckTransfer');
  assert.strictEqual(capturedParams.request.DomainName, 'example.com');
  assert.strictEqual(capturedParams.request.AuthCode,   'epp123');
});

test('CheckTransfer: success → BARE {result:"OK"} — no data key (SOAP contract)', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result, 'OK');
  assert.ok(!('data'  in out), 'SOAP CheckTransfer must NOT have a data key');
  assert.ok(!('error' in out), 'no error key on success');
});

test('CheckTransfer: OperationResult failure → BARE {result:"ERROR"} — no error key (SOAP contract)', async () => {
  const c   = makeSoap(CANNED.FAILURE);
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result, 'ERROR');
  // SOAP CheckTransfer returns BARE {result:'ERROR'} (no error key) — unlike other methods.
  // This is the documented transport divergence from REST (which has a richer envelope).
  assert.ok(!('data' in out), 'SOAP CheckTransfer must NOT have a data key on failure');
});

test('CheckTransfer: structural/fatal error → bare {result:"ERROR"}, does not throw', async () => {
  const c   = makeSoap(CANNED.FATAL);
  const out = await c.CheckTransfer('example.com', 'epp123');

  assert.strictEqual(out.result, 'ERROR');
});

test('CheckTransfer: SOAP transport returns only result key (documented divergence from REST)', async () => {
  const c   = makeSoap(CANNED.OK);
  const out = await c.CheckTransfer('example.com', 'epp123');

  // SOAP: just {result:'OK'}
  // REST: {result:'OK', data:{TransferAvailabilityStatus,...}}
  // These intentionally differ — documented in task-8-report.md.
  const keys = Object.keys(out);
  assert.deepStrictEqual(keys, ['result'], 'SOAP CheckTransfer envelope must have only "result" key on success');
});
