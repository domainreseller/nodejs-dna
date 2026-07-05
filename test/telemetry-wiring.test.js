// test/telemetry-wiring.test.js
//
// Verifies that telemetry hooks are correctly wired into the REST and SOAP
// transport cores, and that the facade's opt-out / backward-compat API works.
//
// NETWORK SAFETY: all tests either replace `client._reportError` with a spy
// (bypassing `telemetry.reportError` entirely) or monkey-patch
// `telemetry.reportError` on the module's exports object (restored after the
// test). No test creates a real network connection to sentry.atakdomain.com.

'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');
const DNASoap = require('../src/DNASoap');
const DomainNameApi = require('../src/DomainNameApi');
const telemetry = require('../src/telemetry');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fake axios that returns the given status code and body. */
function fakeAxiosStatus(status, data = null) {
  return async () => ({ status, data, headers: {} });
}

/** Fake axios that throws a network error. */
function fakeAxiosThrow(message = 'Network failure') {
  return async () => { throw new Error(message); };
}

/**
 * Return a fake SOAP client whose `methodName` method throws when called.
 * Using a plain object (NOT a Proxy) so that Promise.resolve() does not
 * mistakenly treat it as a thenable (a Proxy with a catch-all `get` trap
 * intercepts the `then` property lookup and causes unhandled rejections).
 */
function throwingSoapStubFor(methodName, message = 'SOAP network failure') {
  return { [methodName]: async () => { throw new Error(message); } };
}

// ---------------------------------------------------------------------------
// REST — constructor state
// ---------------------------------------------------------------------------

test('DNARest: errorReportingEnabled defaults to true', () => {
  const client = new DNARest('r', 't');
  assert.strictEqual(client.errorReportingEnabled, true);
});

test('DNARest: options.telemetry=false sets errorReportingEnabled to false', () => {
  const client = new DNARest('r', 't', false, { telemetry: false });
  assert.strictEqual(client.errorReportingEnabled, false);
});

test('DNARest: setErrorReportingEnabled toggles the flag and returns this', () => {
  const client = new DNARest('r', 't');
  const ret = client.setErrorReportingEnabled(false);
  assert.strictEqual(client.errorReportingEnabled, false);
  assert.strictEqual(ret, client, 'setErrorReportingEnabled must return this');
});

test('DNARest: startAt is set to a recent timestamp', () => {
  const before = Date.now();
  const client = new DNARest('r', 't');
  const after = Date.now();
  assert.ok(client.startAt >= before && client.startAt <= after);
});

// ---------------------------------------------------------------------------
// REST — _reportError is called on non-2xx HTTP error
// ---------------------------------------------------------------------------

test('DNARest: _reportError called once on HTTP 500', async () => {
  const client = new DNARest('reseller-id', 'token');
  let callCount = 0;
  client._reportError = () => { callCount++; };

  client._axios = fakeAxiosStatus(500);

  // request() throws on non-2xx; the business methods catch it but here we
  // catch it ourselves to confirm _reportError was invoked.
  try {
    await client.request('GET', 'domains', {});
  } catch {
    // expected
  }

  assert.strictEqual(callCount, 1, '_reportError must be called exactly once on HTTP 500');
});

test('DNARest: _reportError called once on HTTP 404', async () => {
  const client = new DNARest('reseller-id', 'token');
  let callCount = 0;
  client._reportError = () => { callCount++; };
  client._axios = fakeAxiosStatus(404);

  try {
    await client.request('GET', 'domains', {});
  } catch {
    // expected
  }

  assert.strictEqual(callCount, 1);
});

// ---------------------------------------------------------------------------
// REST — _reportError is called on network (axios) error
// ---------------------------------------------------------------------------

test('DNARest: _reportError called on network error', async () => {
  const client = new DNARest('reseller-id', 'token');
  let callCount = 0;
  client._reportError = () => { callCount++; };
  client._axios = fakeAxiosThrow('ECONNREFUSED');

  await client.request('GET', 'domains', {}); // returns {} without throwing

  assert.strictEqual(callCount, 1, '_reportError must be called on axios throw');
});

// ---------------------------------------------------------------------------
// REST — throw / return behavior unchanged after hook
// ---------------------------------------------------------------------------

test('DNARest: non-2xx still throws after _reportError hook', async () => {
  const client = new DNARest('r', 't');
  client._reportError = () => {}; // no-op spy
  client._axios = fakeAxiosStatus(500);

  await assert.rejects(
    () => client.request('GET', 'test', {}),
    (err) => {
      assert.strictEqual(err.statusCode, 500);
      return true;
    },
  );
});

test('DNARest: network error still returns {} after _reportError hook', async () => {
  const client = new DNARest('r', 't');
  client._reportError = () => {};
  client._axios = fakeAxiosThrow('ETIMEDOUT');

  const result = await client.request('GET', 'test', {});
  assert.deepStrictEqual(result, {});
});

// ---------------------------------------------------------------------------
// REST — enabled flag propagates to telemetry.reportError config
// ---------------------------------------------------------------------------

test('DNARest: telemetry.reportError receives enabled:false after setErrorReportingEnabled(false)', async () => {
  const client = new DNARest('reseller-id', 'token');
  client.setErrorReportingEnabled(false);
  client._axios = fakeAxiosStatus(500);

  // Patch the module-level reportError; restore after.
  const orig = telemetry.reportError;
  let capturedConfig = null;
  telemetry.reportError = async (config) => { capturedConfig = config; };

  try {
    await client.request('GET', 'domains', {});
  } catch {
    // expected throw
  } finally {
    telemetry.reportError = orig;
  }

  assert.ok(capturedConfig !== null, 'telemetry.reportError should have been called');
  assert.strictEqual(capturedConfig.enabled, false, 'enabled must be false');
  assert.strictEqual(capturedConfig.transport, 'REST');
});

test('DNARest: telemetry.reportError receives enabled:true by default', async () => {
  const client = new DNARest('reseller-id', 'token');
  client._axios = fakeAxiosStatus(500);

  const orig = telemetry.reportError;
  let capturedConfig = null;
  telemetry.reportError = async (config) => { capturedConfig = config; };

  try {
    await client.request('GET', 'domains', {});
  } catch {
    // expected
  } finally {
    telemetry.reportError = orig;
  }

  assert.ok(capturedConfig !== null);
  assert.strictEqual(capturedConfig.enabled, true);
});

// ---------------------------------------------------------------------------
// SOAP — constructor state
// ---------------------------------------------------------------------------

test('DNASoap: errorReportingEnabled defaults to true', () => {
  const client = new DNASoap('u', 'p');
  assert.strictEqual(client.errorReportingEnabled, true);
});

test('DNASoap: options.telemetry=false sets errorReportingEnabled to false', () => {
  const client = new DNASoap('u', 'p', false, { telemetry: false });
  assert.strictEqual(client.errorReportingEnabled, false);
});

test('DNASoap: setErrorReportingEnabled returns this', () => {
  const client = new DNASoap('u', 'p');
  const ret = client.setErrorReportingEnabled(false);
  assert.strictEqual(client.errorReportingEnabled, false);
  assert.strictEqual(ret, client);
});

// ---------------------------------------------------------------------------
// SOAP — _reportError called when callApiFunction catches a thrown error
// ---------------------------------------------------------------------------

test('DNASoap: _reportError called when soapClientPromise rejects', async () => {
  const client = new DNASoap('u', 'p');
  let callCount = 0;
  client._reportError = () => { callCount++; };

  // Force the soap client creation to fail
  client.soapClientPromise = Promise.reject(new Error('Cannot connect to SOAP'));

  const result = await client.callApiFunction('GetDetails', { request: {} });

  assert.strictEqual(callCount, 1, '_reportError must be called on soap client rejection');
  assert.strictEqual(result.result, false);
  assert.strictEqual(result.level, 'exception');
});

test('DNASoap: _reportError called when SOAP method call throws', async () => {
  const client = new DNASoap('u', 'p');
  let callCount = 0;
  client._reportError = () => { callCount++; };

  // Plain object (no Proxy) so Promise.resolve() does not treat it as a thenable
  client.soapClientPromise = Promise.resolve(throwingSoapStubFor('GetDetails', 'SOAP method threw'));

  const result = await client.callApiFunction('GetDetails', { request: {} });

  assert.strictEqual(callCount, 1);
  assert.strictEqual(result.result, false);
  assert.strictEqual(result.level, 'exception');
});

test('DNASoap: _reportError called on fault response', async () => {
  const client = new DNASoap('u', 'p');
  let callCount = 0;
  client._reportError = () => { callCount++; };

  // Fake SOAP client that returns a SOAP fault
  const fakeSoapClient = {
    GetDetails: async () => ({
      GetDetailsResult: { faultcode: 'env:Client', faultstring: 'Access denied' },
    }),
  };
  client.soapClientPromise = Promise.resolve(fakeSoapClient);

  const result = await client.callApiFunction('GetDetails', { request: {} });

  assert.strictEqual(callCount, 1, '_reportError must be called on SOAP fault');
  assert.strictEqual(result.result, false);
  assert.strictEqual(result.level, 'fault');
});

// ---------------------------------------------------------------------------
// SOAP — callApiFunction tracks lastFunction / lastRequest
// ---------------------------------------------------------------------------

test('DNASoap: callApiFunction sets lastFunction and lastRequest', async () => {
  const client = new DNASoap('u', 'p');
  client._reportError = () => {};

  client.soapClientPromise = Promise.resolve(throwingSoapStubFor('MyOperation'));

  await client.callApiFunction('MyOperation', { request: { DomainName: 'example.com' } });

  assert.strictEqual(client.lastFunction, 'MyOperation');
  assert.deepStrictEqual(client.lastRequest, { request: { DomainName: 'example.com' } });
});

// ---------------------------------------------------------------------------
// Facade — backward compat with boolean 3rd arg
// ---------------------------------------------------------------------------

test('DomainNameApi: boolean true as 3rd arg still routes correctly (backward compat)', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token', true);
  assert.strictEqual(api.getActiveTransport(), 'REST');
  assert.strictEqual(api.client.errorReportingEnabled, true); // default
});

test('DomainNameApi: boolean false as 3rd arg backward compat', () => {
  const api = new DomainNameApi('ownername', 'pass', false);
  assert.strictEqual(api.getActiveTransport(), 'SOAP');
  assert.strictEqual(api.client.errorReportingEnabled, true); // default
});

// ---------------------------------------------------------------------------
// Facade — options object as 3rd arg
// ---------------------------------------------------------------------------

test('DomainNameApi: {telemetry:false} disables reporting on SOAP client', () => {
  const api = new DomainNameApi('ownername', 'pass', { telemetry: false });
  assert.strictEqual(api.client.errorReportingEnabled, false);
});

test('DomainNameApi: {telemetry:false} disables reporting on REST client', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token', { telemetry: false });
  assert.strictEqual(api.client.errorReportingEnabled, false);
});

test('DomainNameApi: {testMode:true} still routes with correct transport', () => {
  const api = new DomainNameApi('550e8400-e29b-41d4-a716-446655440000', 'token', { testMode: true });
  assert.strictEqual(api.getActiveTransport(), 'REST');
  assert.strictEqual(api.client.errorReportingEnabled, true);
});

// ---------------------------------------------------------------------------
// Facade — setErrorReportingEnabled delegation
// ---------------------------------------------------------------------------

test('DomainNameApi: setErrorReportingEnabled(false) flips the client flag', () => {
  const api = new DomainNameApi('ownername', 'pass');
  assert.strictEqual(api.client.errorReportingEnabled, true);
  const ret = api.setErrorReportingEnabled(false);
  assert.strictEqual(api.client.errorReportingEnabled, false);
  assert.strictEqual(ret, api, 'setErrorReportingEnabled must return the facade (this)');
});

test('DomainNameApi: setErrorReportingEnabled(true) re-enables', () => {
  const api = new DomainNameApi('ownername', 'pass', { telemetry: false });
  assert.strictEqual(api.client.errorReportingEnabled, false);
  api.setErrorReportingEnabled(true);
  assert.strictEqual(api.client.errorReportingEnabled, true);
});
