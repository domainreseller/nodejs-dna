'use strict';
// test/rest-reseller.test.js
// TDD tests for GetResellerDetails and GetCurrentBalance (Task 5).
// PHP source: DNARest.php lines 507–603.
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

// ---------------------------------------------------------------------------
// Canned responses
// ---------------------------------------------------------------------------

const CANNED_RESELLER = {
  resellerId: 'abc-123-uuid',
  resellerName: 'Acme Reseller',
  usdBalance: 250.5,
  tryBalance: 1800.75,
};

// ---------------------------------------------------------------------------
// GetResellerDetails — success
// ---------------------------------------------------------------------------

test('GetResellerDetails maps basic fields correctly', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, data) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'deposit/accounts/me');
    assert.deepStrictEqual(data, {});
    return CANNED_RESELLER;
  };
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.id, 'abc-123-uuid');
  assert.strictEqual(out.active, true);
  assert.strictEqual(out.name, 'Acme Reseller');
  assert.strictEqual(out.balance, '250.5');
  assert.strictEqual(out.currency, 'USD');
  assert.strictEqual(out.symbol, '$');
});

test('GetResellerDetails maps balances[] with both USD and TL entries', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => CANNED_RESELLER;
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'OK');
  assert.ok(Array.isArray(out.balances), 'balances must be an array');
  assert.strictEqual(out.balances.length, 2);

  const usd = out.balances[0];
  assert.strictEqual(usd.balance, '250.5');
  assert.strictEqual(usd.currency, 'USD');
  assert.strictEqual(usd.symbol, '$');

  const tl = out.balances[1];
  assert.strictEqual(tl.balance, '1800.75');
  assert.strictEqual(tl.currency, 'TL');
  assert.strictEqual(tl.symbol, 'TL');
});

test('GetResellerDetails handles zero balances (String cast)', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    resellerId: 'zero-uuid',
    resellerName: 'Zero Co',
    usdBalance: 0,
    tryBalance: 0,
  });
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.balance, '0');
  assert.strictEqual(out.balances[0].balance, '0');
  assert.strictEqual(out.balances[1].balance, '0');
});

// ---------------------------------------------------------------------------
// GetResellerDetails — error paths
// ---------------------------------------------------------------------------

test('GetResellerDetails returns CREDENTIALS error when resellerId missing', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ someOtherField: 'value' });
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'CREDENTIALS');
  assert.ok(out.error.Message);
});

test('GetResellerDetails returns error envelope on HTTP 401', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 401');
    err.statusCode = 401;
    throw err;
  };
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_401');
  assert.ok(out.error.Message);
});

test('GetResellerDetails falls back to RESELLER_DETAILS when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };
  const out = await c.GetResellerDetails();
  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'RESELLER_DETAILS');
});

// ---------------------------------------------------------------------------
// GetCurrentBalance — success
// ---------------------------------------------------------------------------

test('GetCurrentBalance sends currency query param uppercased', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.strictEqual(verb, 'GET');
    assert.strictEqual(ep, 'deposit/accounts/me');
    assert.deepStrictEqual(params, { currency: 'USD' });
    return { usdBalance: 100, tryBalance: 0 };
  };
  await c.GetCurrentBalance('usd');
});

test('GetCurrentBalance returns SUCCESS envelope for USD', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ usdBalance: 1234.5, tryBalance: 0 });
  const out = await c.GetCurrentBalance('USD');
  assert.strictEqual(out.ErrorCode, 0);
  assert.strictEqual(out.OperationResult, 'SUCCESS');
  assert.strictEqual(out.OperationMessage, 'Command completed succesfully.');
  assert.strictEqual(out.Balance, '1234.50');
  assert.strictEqual(out.CurrencyId, 2);
  assert.strictEqual(out.CurrencyInfo, null);
  assert.strictEqual(out.CurrencyName, 'USD');
  assert.strictEqual(out.CurrencySymbol, '$');
});

test('GetCurrentBalance returns SUCCESS envelope for TRY', async () => {
  const c = new DNARest('r', 't');
  c.request = async (verb, ep, params) => {
    assert.deepStrictEqual(params, { currency: 'TRY' });
    return { usdBalance: 0, tryBalance: 9876.12 };
  };
  const out = await c.GetCurrentBalance('TRY');
  assert.strictEqual(out.OperationResult, 'SUCCESS');
  assert.strictEqual(out.Balance, '9876.12');
  assert.strictEqual(out.CurrencyId, 1);
  assert.strictEqual(out.CurrencyName, 'TL');
  assert.strictEqual(out.CurrencySymbol, 'TL');
});

test('GetCurrentBalance formats Balance to 2 decimal places', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ usdBalance: 7 });
  const out = await c.GetCurrentBalance('USD');
  assert.strictEqual(out.Balance, '7.00');
});

test('GetCurrentBalance Balance is 0.00 when key missing', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // no usdBalance key
  const out = await c.GetCurrentBalance('USD');
  assert.strictEqual(out.Balance, '0.00');
});

test('GetCurrentBalance works for EUR', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({ eurBalance: 55.99 });
  const out = await c.GetCurrentBalance('EUR');
  assert.strictEqual(out.CurrencyId, 3);
  assert.strictEqual(out.Balance, '55.99');
  assert.strictEqual(out.CurrencyName, 'EUR');
  assert.strictEqual(out.CurrencySymbol, '€');
});

// ---------------------------------------------------------------------------
// GetCurrentBalance — error paths
// ---------------------------------------------------------------------------

test('GetCurrentBalance returns FAILED envelope on HTTP 500', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };
  const out = await c.GetCurrentBalance('USD');
  assert.strictEqual(out.OperationResult, 'FAILED');
  assert.strictEqual(out.ErrorCode, 'API_500');
  assert.strictEqual(out.Balance, '0.00');
  assert.strictEqual(out.CurrencyId, 2);  // USD mapped id preserved in error
  assert.strictEqual(out.CurrencyInfo, null);
  assert.ok(out.OperationMessage);
});

test('GetCurrentBalance FAILED envelope preserves currency mapping for TRY', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 403');
    err.statusCode = 403;
    throw err;
  };
  const out = await c.GetCurrentBalance('TRY');
  assert.strictEqual(out.OperationResult, 'FAILED');
  assert.strictEqual(out.ErrorCode, 'API_403');
  assert.strictEqual(out.CurrencyId, 1);
  assert.strictEqual(out.CurrencyName, 'TL');
  assert.strictEqual(out.CurrencySymbol, 'TL');
});

// ---------------------------------------------------------------------------
// Skeleton guard — real methods must NOT be skeletons
// ---------------------------------------------------------------------------

test('GetCurrentBalance: non-HTTP error yields ErrorCode BALANCE not "undefined"', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('boom'); };
  const out = await c.GetCurrentBalance('USD');
  assert.strictEqual(out.OperationResult, 'FAILED');
  assert.notStrictEqual(out.ErrorCode, 'undefined');
  assert.notStrictEqual(out.ErrorCode, 'API_undefined');
  assert.strictEqual(out.ErrorCode, 'BALANCE');
});

test('GetResellerDetails and GetCurrentBalance are real methods (not skeletons)', () => {
  const c = new DNARest('r', 't');
  for (const name of ['GetResellerDetails', 'GetCurrentBalance']) {
    assert.ok(typeof c[name] === 'function', `${name} is not a function`);
    // Real methods return a Promise; skeletons throw synchronously
    assert.ok(
      c[name]() instanceof Promise,
      `${name} did not return a Promise — may still be a skeleton`,
    );
  }
  // Clean up dangling promises (will reject since request is unstubbed)
});
