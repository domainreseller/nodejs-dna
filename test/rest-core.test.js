// test/rest-core.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

function fakeAxios(captured, response) {
  return async (config) => { Object.assign(captured, config); return response; };
}

test('request sends auth headers and joins base URL', async () => {
  const c = new DNARest('reseller-uuid', 'api-key', true); // OTE
  const captured = {};
  c._axios = fakeAxios(captured, { status: 200, data: { ok: 1 }, headers: {} });
  const body = await c.request('GET', 'deposit/accounts/me', { currency: 'USD' });
  assert.strictEqual(body.ok, 1);
  assert.match(captured.url, /ote\.domainresellerapi\.com\/api\/v1\/deposit\/accounts\/me$/);
  assert.strictEqual(captured.headers['X-API-KEY'], 'api-key');
  assert.strictEqual(captured.headers['__reseller'], 'reseller-uuid');
  assert.strictEqual(captured.method, 'GET');
  assert.deepStrictEqual(captured.params, { currency: 'USD' });
});

test('POST sends JSON body not query params', async () => {
  const c = new DNARest('r', 't');
  const captured = {};
  c._axios = fakeAxios(captured, { status: 200, data: {}, headers: {} });
  await c.request('POST', 'domains/renew', { domainName: 'x.com', period: 1 });
  assert.deepStrictEqual(captured.data, { domainName: 'x.com', period: 1 });
});
