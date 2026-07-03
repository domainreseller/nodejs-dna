'use strict';
// test/rest-childns.test.js
// TDD tests for AddChildNameServer, DeleteChildNameServer, ModifyChildNameServer (Task 7).
// All tests are network-free: c.request is stubbed before each call.

const assert = require('node:assert');
const { test } = require('node:test');
const DNARest = require('../src/DNARest');

// ---------------------------------------------------------------------------
// Existence checks (synchronous — no stub, no unhandled rejections)
// ---------------------------------------------------------------------------

test('AddChildNameServer, DeleteChildNameServer, ModifyChildNameServer are real functions', () => {
  const c = new DNARest('r', 't');
  assert.strictEqual(typeof c.AddChildNameServer,    'function', 'AddChildNameServer must be a function');
  assert.strictEqual(typeof c.DeleteChildNameServer, 'function', 'DeleteChildNameServer must be a function');
  assert.strictEqual(typeof c.ModifyChildNameServer, 'function', 'ModifyChildNameServer must be a function');
});

// ---------------------------------------------------------------------------
// AddChildNameServer
// ---------------------------------------------------------------------------

test('AddChildNameServer sends POST to domains/dns/host with correct payload (IPv4)', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');

  assert.strictEqual(capturedVerb, 'POST');
  assert.strictEqual(capturedEp,   'domains/dns/host');
  assert.deepStrictEqual(capturedData, {
    domainName:  'example.com',
    hostName:    'ns1.example.com',
    ipAddresses: [{ ipAddress: '1.2.3.4', ipVersion: 'v4' }],
  });
  assert.strictEqual(out.result, 'OK');
});

test('AddChildNameServer returns correct success envelope with IPAdresses typo key', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});

  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.NameServer, 'ns1.example.com');
  // Verify one-'d' typo key exists and holds the correct value
  assert.ok('IPAdresses' in out.data,   'IPAdresses key (one "d") must exist');
  assert.ok(!('IPAddresses' in out.data), 'IPAddresses key (two "d"s) must NOT exist');
  assert.deepStrictEqual(out.data.IPAdresses, ['1.2.3.4']);
});

test('AddChildNameServer detects IPv6 address and sets ipVersion v6', async () => {
  const c = new DNARest('r', 't');
  let sentData;
  c.request = async (_verb, _ep, data) => { sentData = data; return {}; };

  await c.AddChildNameServer('example.com', 'ns1.example.com', '2001:db8::1');

  assert.strictEqual(sentData.ipAddresses[0].ipVersion, 'v6');
  assert.strictEqual(sentData.ipAddresses[0].ipAddress, '2001:db8::1');
});

test('AddChildNameServer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 422');
    err.statusCode = 422;
    throw err;
  };

  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_422');
  assert.ok(out.error.Message);
});

test('AddChildNameServer error falls back to ADD_CHILD_NS when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };

  const out = await c.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'ADD_CHILD_NS');
});

// ---------------------------------------------------------------------------
// DeleteChildNameServer
// ---------------------------------------------------------------------------

test('DeleteChildNameServer sends DELETE to domains/dns/host with correct query params', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  const out = await c.DeleteChildNameServer('example.com', 'ns1.example.com');

  assert.strictEqual(capturedVerb, 'DELETE');
  assert.strictEqual(capturedEp,   'domains/dns/host');
  assert.deepStrictEqual(capturedData, {
    domainName: 'example.com',
    hostName:   'ns1.example.com',
  });
  assert.strictEqual(out.result, 'OK');
});

test('DeleteChildNameServer returns correct success envelope', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});

  const out = await c.DeleteChildNameServer('example.com', 'ns1.example.com');

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.NameServer, 'ns1.example.com');
  // No IPAdresses key expected on delete
  assert.ok(!('IPAdresses' in out.data), 'DeleteChildNameServer should not include IPAdresses');
});

test('DeleteChildNameServer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 404');
    err.statusCode = 404;
    throw err;
  };

  const out = await c.DeleteChildNameServer('example.com', 'ns1.example.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_404');
  assert.ok(out.error.Message);
});

test('DeleteChildNameServer error falls back to DELETE_CHILD_NS when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };

  const out = await c.DeleteChildNameServer('example.com', 'ns1.example.com');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'DELETE_CHILD_NS');
});

// ---------------------------------------------------------------------------
// ModifyChildNameServer
// ---------------------------------------------------------------------------

test('ModifyChildNameServer sends PUT to domains/dns/host with correct payload (IPv4)', async () => {
  const c = new DNARest('r', 't');
  let capturedVerb, capturedEp, capturedData;
  c.request = async (verb, ep, data) => {
    capturedVerb = verb;
    capturedEp   = ep;
    capturedData = data;
    return {};
  };

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.strictEqual(capturedVerb, 'PUT');
  assert.strictEqual(capturedEp,   'domains/dns/host');
  assert.deepStrictEqual(capturedData, {
    domainName:  'example.com',
    hostName:    'ns1.example.com',
    newHostName: 'ns1.example.com',
    ipAddresses: [{ ipAddress: '5.6.7.8', ipVersion: 'v4' }],
  });
  assert.strictEqual(out.result, 'OK');
});

test('ModifyChildNameServer sends IPv6 version correctly', async () => {
  const c = new DNARest('r', 't');
  let sentData;
  c.request = async (_verb, _ep, data) => { sentData = data; return {}; };

  await c.ModifyChildNameServer('example.com', 'ns1.example.com', '2001:db8::2');

  assert.strictEqual(sentData.ipAddresses[0].ipVersion, 'v6');
  assert.strictEqual(sentData.ipAddresses[0].ipAddress, '2001:db8::2');
});

test('ModifyChildNameServer uses response.hostName and response.ipAddresses when present', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({
    hostName:    'ns2.example.com',
    ipAddresses: ['10.0.0.1', '10.0.0.2'],
  });

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.NameServer, 'ns2.example.com');   // from response.hostName
  assert.deepStrictEqual(out.data.IPAdresses, ['10.0.0.1', '10.0.0.2']); // from response.ipAddresses
});

test('ModifyChildNameServer falls back to nameServer when response.hostName is absent', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});   // empty response — no hostName, no ipAddresses

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.NameServer, 'ns1.example.com');  // fallback to nameServer arg
  assert.deepStrictEqual(out.data.IPAdresses, ['5.6.7.8']);    // fallback to [ipAddress] arg
});

test('ModifyChildNameServer IPAdresses key uses one-d typo', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => ({});

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.ok('IPAdresses' in out.data,    'IPAdresses key (one "d") must exist');
  assert.ok(!('IPAddresses' in out.data), 'IPAddresses key (two "d"s) must NOT exist');
});

test('ModifyChildNameServer returns error envelope on HTTP error', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => {
    const err = new Error('HTTP 500');
    err.statusCode = 500;
    throw err;
  };

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'API_500');
  assert.ok(out.error.Message);
});

test('ModifyChildNameServer error falls back to MODIFY_CHILD_NS when no statusCode', async () => {
  const c = new DNARest('r', 't');
  c.request = async () => { throw new Error('network failure'); };

  const out = await c.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');

  assert.strictEqual(out.result, 'ERROR');
  assert.strictEqual(out.error.Code, 'MODIFY_CHILD_NS');
});
