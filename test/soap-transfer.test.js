'use strict';
/**
 * test/soap-transfer.test.js
 *
 * Network-free unit tests for Phase 3 Task 7 — aligning the 4 SOAP transfer
 * methods to the unified php-dna envelope:
 *   Transfer, CancelTransfer, ApproveTransfer, RejectTransfer
 *
 * callApiFunction is stubbed per-test so the network is never touched.
 * Canned responses reflect what callApiFunction returns AFTER it extracts
 * ${op}Result and adds result:bool (its normal side-effect).
 *
 * Each method's output must equal its REST counterpart's output shape.
 */

const assert  = require('node:assert');
const { test } = require('node:test');
const DNASoap = require('../src/DNASoap');

// ---------------------------------------------------------------------------
// Canned SOAP callApiFunction responses (already unwrapped by callApiFunction)
// ---------------------------------------------------------------------------

const CANNED = {
  // Generic failure (OperationResult !== 'SUCCESS')
  FAILURE: { result: false, level: 'error', message: 'API error', OperationResult: 'ERROR' },

  // Transfer — success with DomainInfo
  TRANSFER_OK: {
    result         : true,
    OperationResult: 'SUCCESS',
    DomainInfo: {
      Id                     : 12345,
      Status                 : 'WaitingForIncomingTransfer',
      DomainName             : 'transfer.com',
      Auth                   : 'eppcode123',
      LockStatus             : false,
      PrivacyProtectionStatus: false,
      IsChildNameServer      : false,
      AdministrativeContactId: 10,
      BillingContactId       : 11,
      TechnicalContactId     : 12,
      RegistrantContactId    : 13,
      StartDate              : '2024-01-01T00:00:00',
      ExpirationDate         : '2025-01-01T00:00:00',
      RemainingDay           : 180,
      NameServerList         : { NameServer: ['ns1.example.com', 'ns2.example.com'] },
    },
  },

  // Transfer — SUCCESS but DomainInfo absent
  TRANSFER_NO_DOMAIN: {
    result         : true,
    OperationResult: 'SUCCESS',
    // DomainInfo intentionally absent
  },

  // CancelTransfer — success with Status present
  CANCEL_OK_WITH_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
    Status         : 'Cancelled',
  },

  // CancelTransfer — success but Status absent (default should apply)
  CANCEL_OK_NO_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
    // Status intentionally absent
  },

  // ApproveTransfer — success with Status present
  APPROVE_OK_WITH_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
    Status         : 'Approved',
  },

  // ApproveTransfer — success but Status absent (default should apply)
  APPROVE_OK_NO_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
  },

  // RejectTransfer — success with Status present
  REJECT_OK_WITH_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
    Status         : 'Rejected',
  },

  // RejectTransfer — success but Status absent (default should apply)
  REJECT_OK_NO_STATUS: {
    result         : true,
    OperationResult: 'SUCCESS',
  },
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
// Transfer
// ---------------------------------------------------------------------------

test('Transfer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.Transfer, 'function');
});

test('Transfer success → {result:"OK", data: parseSoapDomainInfo shape}', async () => {
  const c = makeSoap(CANNED.TRANSFER_OK);
  const out = await c.Transfer('transfer.com', 'eppcode123', 1);

  assert.strictEqual(out.result, 'OK', 'result must be "OK"');
  const d = out.data;
  assert.ok(d, 'data must be present');
  assert.strictEqual(d.DomainName, 'transfer.com', 'DomainName must match');
  assert.strictEqual(d.ID, 12345, 'ID must be numeric');
  assert.ok(typeof d.LockStatus === 'string', 'LockStatus must be string "true"/"false"');
  assert.ok(d.Contacts, 'Contacts must be present');
  assert.ok(d.Dates,    'Dates must be present');
  assert.ok(Array.isArray(d.NameServers), 'NameServers must be an array');
  assert.ok(!('error' in out), 'no error key on success');
});

test('Transfer success → unified domain shape keys match REST parseDomainInfo output', async () => {
  const c = makeSoap(CANNED.TRANSFER_OK);
  const out = await c.Transfer('transfer.com', 'eppcode123', 1);

  const expectedKeys = [
    'ID', 'Status', 'DomainName', 'AuthCode', 'LockStatus',
    'PrivacyProtectionStatus', 'IsChildNameServer', 'Contacts',
    'Dates', 'NameServers', 'Additional', 'ChildNameServers',
  ];
  for (const key of expectedKeys) {
    assert.ok(key in out.data, `data.${key} must exist (REST parity)`);
  }
});

test('Transfer passes correct SOAP op and params to callApiFunction', async () => {
  const c = new DNASoap('user', 'pass');
  let capturedOp;
  let capturedParams;
  c.callApiFunction = async (op, params) => {
    capturedOp     = op;
    capturedParams = params;
    return CANNED.TRANSFER_OK;
  };

  await c.Transfer('transfer.com', 'myepp', 2);

  assert.strictEqual(capturedOp, 'Transfer', 'SOAP operation must be "Transfer"');
  assert.strictEqual(capturedParams.request.DomainName, 'transfer.com', 'DomainName in request');
  assert.strictEqual(capturedParams.request.AuthCode,   'myepp',        'AuthCode in request');

  // Transfer period is passed via AdditionalAttributes KeyValueOfstringstring
  const kvList = capturedParams.request.AdditionalAttributes &&
    capturedParams.request.AdditionalAttributes.KeyValueOfstringstring;
  assert.ok(Array.isArray(kvList), 'AdditionalAttributes.KeyValueOfstringstring must be an array');
  const periodKV = kvList.find((kv) => kv.Key === 'TRANSFERPERIOD');
  assert.ok(periodKV, 'TRANSFERPERIOD key must be in AdditionalAttributes');
  assert.strictEqual(periodKV.Value, 2, 'TRANSFERPERIOD value must equal period arg');
});

test('Transfer no DomainInfo in response → DOMAIN_TRANSFER_REQUEST error, no throw', async () => {
  const c = makeSoap(CANNED.TRANSFER_NO_DOMAIN);
  const out = await c.Transfer('transfer.com', 'eppcode123', 1);

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});

test('Transfer API failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  const out = await c.Transfer('transfer.com', 'eppcode123', 1);

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});

// ---------------------------------------------------------------------------
// CancelTransfer
// ---------------------------------------------------------------------------

test('CancelTransfer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.CancelTransfer, 'function');
});

test('CancelTransfer success with Status → {result:"OK", data:{DomainName, Status:"Cancelled"}}', async () => {
  const c = makeSoap(CANNED.CANCEL_OK_WITH_STATUS);
  const out = await c.CancelTransfer('cancel.com');

  assert.strictEqual(out.result,          'OK',          'result must be "OK"');
  assert.strictEqual(out.data.DomainName, 'cancel.com',  'DomainName must echo input');
  assert.strictEqual(out.data.Status,     'Cancelled',   'Status must be "Cancelled"');
  assert.ok(!('error' in out), 'no error key on success');
});

test('CancelTransfer success without Status → defaults to "Cancelled"', async () => {
  const c = makeSoap(CANNED.CANCEL_OK_NO_STATUS);
  const out = await c.CancelTransfer('cancel.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'cancel.com');
  assert.strictEqual(out.data.Status,     'Cancelled', 'must default to "Cancelled" when Status absent');
});

test('CancelTransfer API failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  const out = await c.CancelTransfer('cancel.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});

// ---------------------------------------------------------------------------
// ApproveTransfer
// ---------------------------------------------------------------------------

test('ApproveTransfer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.ApproveTransfer, 'function');
});

test('ApproveTransfer success with Status → {result:"OK", data:{DomainName, Status:"Approved"}}', async () => {
  const c = makeSoap(CANNED.APPROVE_OK_WITH_STATUS);
  const out = await c.ApproveTransfer('approve.com');

  assert.strictEqual(out.result,          'OK',           'result must be "OK"');
  assert.strictEqual(out.data.DomainName, 'approve.com',  'DomainName must echo input');
  assert.strictEqual(out.data.Status,     'Approved',     'Status must be "Approved"');
  assert.ok(!('error' in out), 'no error key on success');
});

test('ApproveTransfer success without Status → defaults to "Approved"', async () => {
  const c = makeSoap(CANNED.APPROVE_OK_NO_STATUS);
  const out = await c.ApproveTransfer('approve.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'approve.com');
  assert.strictEqual(out.data.Status,     'Approved', 'must default to "Approved" when Status absent');
});

test('ApproveTransfer API failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  const out = await c.ApproveTransfer('approve.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});

// ---------------------------------------------------------------------------
// RejectTransfer
// ---------------------------------------------------------------------------

test('RejectTransfer is a function', () => {
  const c = new DNASoap('u', 'p');
  assert.strictEqual(typeof c.RejectTransfer, 'function');
});

test('RejectTransfer success with Status → {result:"OK", data:{DomainName, Status:"Rejected"}}', async () => {
  const c = makeSoap(CANNED.REJECT_OK_WITH_STATUS);
  const out = await c.RejectTransfer('reject.com');

  assert.strictEqual(out.result,          'OK',          'result must be "OK"');
  assert.strictEqual(out.data.DomainName, 'reject.com',  'DomainName must echo input');
  assert.strictEqual(out.data.Status,     'Rejected',    'Status must be "Rejected"');
  assert.ok(!('error' in out), 'no error key on success');
});

test('RejectTransfer success without Status → defaults to "Rejected"', async () => {
  const c = makeSoap(CANNED.REJECT_OK_NO_STATUS);
  const out = await c.RejectTransfer('reject.com');

  assert.strictEqual(out.result,          'OK');
  assert.strictEqual(out.data.DomainName, 'reject.com');
  assert.strictEqual(out.data.Status,     'Rejected', 'must default to "Rejected" when Status absent');
});

test('RejectTransfer API failure → setError envelope, no throw', async () => {
  const c = makeSoap(CANNED.FAILURE);
  const out = await c.RejectTransfer('reject.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error, 'error key must be present');
  assert.ok(out.error.Code, 'error.Code must be set');
});
