'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const {
  DEFAULT_SENTRY_DSN,
  IGNORED_ERRORS,
  parseDsn,
  buildSentryEvent,
  reportError,
} = require('../src/telemetry');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

test('DEFAULT_SENTRY_DSN is an empty string', () => {
  assert.strictEqual(DEFAULT_SENTRY_DSN, '');
});

test('IGNORED_ERRORS is a non-empty array of strings', () => {
  assert.ok(Array.isArray(IGNORED_ERRORS));
  assert.ok(IGNORED_ERRORS.length > 0);
  for (const entry of IGNORED_ERRORS) {
    assert.strictEqual(typeof entry, 'string');
  }
});

// ---------------------------------------------------------------------------
// parseDsn
// ---------------------------------------------------------------------------

test('parseDsn returns null for empty string', () => {
  assert.strictEqual(parseDsn(''), null);
});

test('parseDsn returns null for undefined', () => {
  assert.strictEqual(parseDsn(undefined), null);
});

test('parseDsn returns null for null', () => {
  assert.strictEqual(parseDsn(null), null);
});

test('parseDsn returns null for a non-URL string', () => {
  assert.strictEqual(parseDsn('not-a-url'), null);
});

test('parseDsn returns null when publicKey is missing', () => {
  // No userinfo at all
  assert.strictEqual(parseDsn('https://sentry.io/123'), null);
});

test('parseDsn returns null when projectId is missing', () => {
  assert.strictEqual(parseDsn('https://pubkey@sentry.io/'), null);
});

test('parseDsn parses a valid DSN without secret key', () => {
  const result = parseDsn('https://abc123@sentry.io/456');
  assert.deepStrictEqual(result, {
    host: 'sentry.io',
    projectId: '456',
    publicKey: 'abc123',
    secretKey: null,
  });
});

test('parseDsn parses a valid DSN with secret key', () => {
  const result = parseDsn('https://pubkey:secretkey@sentry.io/789');
  assert.deepStrictEqual(result, {
    host: 'sentry.io',
    projectId: '789',
    publicKey: 'pubkey',
    secretKey: 'secretkey',
  });
});

test('parseDsn parses a realistic Sentry DSN', () => {
  const result = parseDsn('https://a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4@o123456.ingest.sentry.io/7654321');
  assert.ok(result !== null);
  assert.strictEqual(result.host, 'o123456.ingest.sentry.io');
  assert.strictEqual(result.projectId, '7654321');
  assert.strictEqual(result.publicKey, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
  assert.strictEqual(result.secretKey, null);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_DSN = 'https://testpublickey@sentry.example.com/42';

function makeFakeFetch() {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200 };
  };
  fn.calls = calls;
  return fn;
}

function makeConfig(overrides = {}) {
  return {
    dsn: VALID_DSN,
    enabled: true,
    version: '3.0.0',
    application: 'TestApp',
    environment: 'test',
    transport: 'REST',
    reseller: 'reseller-001',
    lastRequest: { payload: { domainName: 'example.com' } },
    lastResponse: { status: 'ok' },
    lastFunction: 'CheckAvailability',
    startAt: Date.now() - 500,
    _fetch: makeFakeFetch(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// reportError — gating (should NOT call fetch)
// ---------------------------------------------------------------------------

test('reportError does not call fetch when enabled is false', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ enabled: false, _fetch: fakeFetch });
  await reportError(config, new Error('something failed'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch when enabled is missing', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ enabled: undefined, _fetch: fakeFetch });
  await reportError(config, new Error('something failed'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch when dsn is empty string', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ dsn: '', _fetch: fakeFetch });
  await reportError(config, new Error('something failed'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch when dsn is invalid', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ dsn: 'not-a-valid-dsn', _fetch: fakeFetch });
  await reportError(config, new Error('something failed'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch when dsn is missing publicKey', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ dsn: 'https://sentry.io/123', _fetch: fakeFetch });
  await reportError(config, new Error('something failed'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch when config is null', async () => {
  // Should not throw
  await reportError(null, new Error('something failed'));
});

// ---------------------------------------------------------------------------
// reportError — ignored errors
// ---------------------------------------------------------------------------

test('reportError does not call fetch for ignored error: "Domain not found"', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('Domain not found for example.com'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch for ignored error: "balance is not sufficient"', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('Your balance is not sufficient to register'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch for ignored error: "Invalid API credentials"', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('Invalid API credentials provided'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

test('reportError does not call fetch for ignored error: "could not be found"', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('The domain name you requested could not be found'));
  assert.strictEqual(fakeFetch.calls.length, 0);
});

// ---------------------------------------------------------------------------
// reportError — happy path (should call fetch)
// ---------------------------------------------------------------------------

test('reportError calls fetch exactly once for enabled + valid dsn + normal error', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('Unexpected registry error'));
  assert.strictEqual(fakeFetch.calls.length, 1);
});

test('reportError posts to the correct Sentry store URL', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('registry timeout'));
  const { url } = fakeFetch.calls[0];
  assert.strictEqual(url, 'https://sentry.example.com/api/42/store/');
});

test('reportError sets X-Sentry-Auth header containing sentry_key', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('registry timeout'));
  const { opts } = fakeFetch.calls[0];
  const authHeader = opts.headers['X-Sentry-Auth'];
  assert.ok(typeof authHeader === 'string', 'X-Sentry-Auth header must be a string');
  assert.ok(authHeader.startsWith('Sentry '), 'header must start with "Sentry "');
  assert.ok(authHeader.includes('sentry_key=testpublickey'), 'header must contain sentry_key');
  assert.ok(authHeader.includes('sentry_version=7'), 'header must contain sentry_version=7');
  assert.ok(authHeader.includes('sentry_client=nodejs-dna/'), 'header must contain sentry_client');
});

test('reportError includes sentry_secret when DSN has a secret key', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({
    dsn: 'https://pubkey:mysecret@sentry.example.com/42',
    _fetch: fakeFetch,
  });
  await reportError(config, new Error('registry timeout'));
  const { opts } = fakeFetch.calls[0];
  assert.ok(opts.headers['X-Sentry-Auth'].includes('sentry_secret=mysecret'));
});

test('reportError does NOT include sentry_secret when DSN has no secret key', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch }); // VALID_DSN has no secret
  await reportError(config, new Error('registry timeout'));
  const { opts } = fakeFetch.calls[0];
  assert.ok(!opts.headers['X-Sentry-Auth'].includes('sentry_secret'));
});

test('reportError sends valid JSON body with required Sentry fields', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  const err = new Error('Unexpected registry error: connection refused');
  await reportError(config, err);
  const { opts } = fakeFetch.calls[0];
  const body = JSON.parse(opts.body);

  // event_id: 32 hex chars
  assert.ok(typeof body.event_id === 'string');
  assert.ok(/^[0-9a-f]{32}$/.test(body.event_id), 'event_id must be 32 lowercase hex chars');

  // level
  assert.strictEqual(body.level, 'error');

  // timestamp format: YYYY-MM-DDTHH:mm:ssZ
  assert.ok(typeof body.timestamp === 'string');
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(body.timestamp));

  // platform and logger
  assert.strictEqual(body.platform, 'node');
  assert.strictEqual(body.logger, 'node');

  // release from config.version
  assert.strictEqual(body.release, '3.0.0');

  // environment
  assert.strictEqual(body.environment, 'test');

  // exception.values[0].value is set
  assert.ok(Array.isArray(body.exception.values));
  assert.strictEqual(body.exception.values.length, 1);
  assert.ok(typeof body.exception.values[0].value === 'string');
  assert.ok(body.exception.values[0].value.length > 0);

  // tags.runtime_name === 'Node.js'
  assert.strictEqual(body.tags.runtime_name, 'Node.js');

  // tags.runtime_version matches process.version
  assert.strictEqual(body.tags.runtime_version, process.version);

  // tags.application
  assert.strictEqual(body.tags.application, 'TestApp');

  // tags.transport
  assert.strictEqual(body.tags.transport, 'REST');

  // fingerprint array
  assert.ok(Array.isArray(body.fingerprint));
  assert.ok(body.fingerprint.length >= 3);
  assert.strictEqual(body.fingerprint[0], 'dna');

  // extra fields
  assert.ok(typeof body.extra === 'object');
  assert.ok(typeof body.extra.original_message === 'string');
});

test('reportError uses POST method', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('test'));
  assert.strictEqual(fakeFetch.calls[0].opts.method, 'POST');
});

test('reportError sets Content-Type to application/json', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await reportError(config, new Error('test'));
  assert.strictEqual(
    fakeFetch.calls[0].opts.headers['Content-Type'],
    'application/json',
  );
});

test('reportError strips volatile data from fingerprint value (normalization)', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  // Two errors with same structure but different IPs should produce same fingerprint
  await reportError(config, new Error('Connection refused from 192.168.1.1'));
  const body1 = JSON.parse(fakeFetch.calls[0].opts.body);

  fakeFetch.calls.length = 0; // reset
  await reportError(config, new Error('Connection refused from 10.0.0.5'));
  const body2 = JSON.parse(fakeFetch.calls[0].opts.body);

  // Same fingerprint despite different IPs
  assert.deepStrictEqual(body1.fingerprint, body2.fingerprint);

  // But different event_ids
  assert.notStrictEqual(body1.event_id, body2.event_id);
});

test('reportError includes domain from lastRequest in tags', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({
    lastRequest: { payload: { domainName: 'mytest.com' } },
    _fetch: fakeFetch,
  });
  await reportError(config, new Error('registry error'));
  const body = JSON.parse(fakeFetch.calls[0].opts.body);
  assert.strictEqual(body.tags.domain, 'mytest.com');
});

test('reportError includes operation tag from lastFunction', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ lastFunction: 'Transfer', _fetch: fakeFetch });
  await reportError(config, new Error('registry error'));
  const body = JSON.parse(fakeFetch.calls[0].opts.body);
  assert.strictEqual(body.tags.operation, 'Transfer');
});

// ---------------------------------------------------------------------------
// reportError — never throws
// ---------------------------------------------------------------------------

test('reportError never throws when _fetch throws synchronously', async () => {
  const throwingFetch = () => {
    throw new Error('fetch exploded synchronously');
  };
  const config = makeConfig({ _fetch: throwingFetch });
  // Must resolve without throwing
  await assert.doesNotReject(async () => {
    await reportError(config, new Error('test error'));
  });
});

test('reportError never throws when _fetch returns a rejected promise', async () => {
  const rejectingFetch = async () => {
    throw new Error('network error');
  };
  const config = makeConfig({ _fetch: rejectingFetch });
  await assert.doesNotReject(async () => {
    await reportError(config, new Error('test error'));
  });
});

test('reportError never throws when error argument is null', async () => {
  const fakeFetch = makeFakeFetch();
  const config = makeConfig({ _fetch: fakeFetch });
  await assert.doesNotReject(async () => {
    await reportError(config, null);
  });
});

test('reportError never throws when config fields are all missing', async () => {
  await assert.doesNotReject(async () => {
    await reportError({}, new Error('test'));
  });
});

// ---------------------------------------------------------------------------
// buildSentryEvent
// ---------------------------------------------------------------------------

test('buildSentryEvent returns an object with all required Sentry fields', () => {
  const err = new Error('test event error');
  const context = {
    version: '1.2.3',
    application: 'MyApp',
    environment: 'production',
    transport: 'SOAP',
    reseller: 'res-abc',
    lastFunction: 'Renew',
    startAt: Date.now() - 100,
  };
  const event = buildSentryEvent(err, context);

  assert.strictEqual(typeof event.event_id, 'string');
  assert.ok(/^[0-9a-f]{32}$/.test(event.event_id));
  assert.strictEqual(event.level, 'error');
  assert.strictEqual(event.platform, 'node');
  assert.strictEqual(event.logger, 'node');
  assert.strictEqual(event.release, '1.2.3');
  assert.strictEqual(event.environment, 'production');
  assert.strictEqual(event.tags.runtime_name, 'Node.js');
  assert.strictEqual(event.tags.transport, 'SOAP');
  assert.strictEqual(event.tags.reseller, 'res-abc');
  assert.strictEqual(event.tags.operation, 'Renew');
  assert.ok(Array.isArray(event.exception.values));
  assert.ok(Array.isArray(event.fingerprint));
});

test('buildSentryEvent event_id is unique across calls', () => {
  const err = new Error('dup test');
  const ctx = { version: '1.0.0', application: 'App', environment: 'test' };
  const ev1 = buildSentryEvent(err, ctx);
  const ev2 = buildSentryEvent(err, ctx);
  assert.notStrictEqual(ev1.event_id, ev2.event_id);
});
