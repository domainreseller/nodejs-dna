// test/client-info.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');
const DomainNameApi = require('../src/DomainNameApi');
const { VERSION } = require('../src/shared');

function captureHeaders(client) {
  const captured = {};
  client._axios = async (config) => { Object.assign(captured, config); return { status: 200, data: {}, headers: {} }; };
  return captured;
}

const LIB_VERSION = VERSION.replace(/[^0-9.]/g, '').replace(/^\.+|\.+$/g, '');

test('defaults: X-App nodejs and the library version', async () => {
  const c = new DNARest('r', 't');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
  const captured = captureHeaders(c);
  await c.request('GET', 'deposit/accounts/me');
  assert.strictEqual(captured.headers['X-App'], 'nodejs');
  assert.strictEqual(captured.headers['X-Version'], LIB_VERSION);
});

test('override is sent on every request, other headers untouched', async () => {
  const c = new DNARest('reseller', 'key');
  assert.strictEqual(c.setClientInfo('whmcs', '8.13.1'), c, 'setClientInfo returns this');
  const captured = captureHeaders(c);
  await c.request('POST', 'domains/renew', { domainName: 'x.com' });
  assert.strictEqual(captured.headers['X-App'], 'whmcs');
  assert.strictEqual(captured.headers['X-Version'], '8.13.1');
  assert.strictEqual(captured.headers['X-API-KEY'], 'key');
  assert.strictEqual(captured.headers['__reseller'], 'reseller');
  assert.strictEqual(captured.headers['Content-Type'], 'application/json');
  assert.strictEqual(captured.headers['Accept'], 'application/json');
  assert.strictEqual(Object.keys(captured.headers).length, 6);
});

test('normalization: lowercase app, digits and dots only in version', () => {
  const c = new DNARest('r', 't');
  c.setClientInfo('WiseCP5', 'V2.0.20-beta');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'wisecp5', version: '2.0.20' });
  c.setClientInfo('  My App/2 (x)_v.1-a ', '..1.2.');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'myapp2x_v.1-a', version: '1.2' });
});

test('empty or invalid values fall back to the defaults', () => {
  const c = new DNARest('r', 't');
  c.setClientInfo('', '');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
  c.setClientInfo('!!!', 'beta');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
  c.setClientInfo('wisecp');
  assert.deepStrictEqual(c.getClientInfo(), { app: 'wisecp', version: LIB_VERSION });
  c.setClientInfo(undefined, null);
  assert.deepStrictEqual(c.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
});

test('facade: setClientInfo chains and reaches the request headers', async () => {
  const api = new DomainNameApi('r', 't');
  assert.deepStrictEqual(api.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
  assert.strictEqual(api.setClientInfo('WiseCP5', 'V2.0.20-beta'), api);
  assert.deepStrictEqual(api.getClientInfo(), { app: 'wisecp5', version: '2.0.20' });
  const captured = captureHeaders(api.client);
  await api.client.request('GET', 'deposit/accounts/me');
  assert.strictEqual(captured.headers['X-App'], 'wisecp5');
  assert.strictEqual(captured.headers['X-Version'], '2.0.20');
});

test('facade: clientInfo constructor option; legacy boolean form unchanged', () => {
  const api = new DomainNameApi('r', 't', { testMode: true, clientInfo: { app: 'Blesta', version: 'v5.10.2' } });
  assert.deepStrictEqual(api.getClientInfo(), { app: 'blesta', version: '5.10.2' });
  assert.match(api.client.serviceUrl, /ote\./);
  const legacy = new DomainNameApi('r', 't', true);
  assert.deepStrictEqual(legacy.getClientInfo(), { app: 'nodejs', version: LIB_VERSION });
  assert.match(legacy.client.serviceUrl, /ote\./);
});
