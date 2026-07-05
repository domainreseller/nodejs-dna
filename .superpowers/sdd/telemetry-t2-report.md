# Telemetry T2 Report — Sentry Wiring into REST/SOAP Cores + Facade

## Hook Points

### `src/DNARest.js` — `request()` method (lines ~95-140 after edits)

Two error paths hooked:

1. **Network-level catch** (`catch (err)` around `await this._axios(config)`):
   - `this._reportError(err)` is called before `return {}`.
   - `err` is the raw axios/network error (has `.code`, `.message`, etc.).

2. **Non-2xx path** (after `status >= 300`):
   - `const err = new Error(`HTTP ${status}`)` is constructed, `err.statusCode = status` set.
   - `this._reportError(err)` called immediately before `throw err`.
   - Return/throw behavior is unchanged.

### `src/DNASoap.js` — `callApiFunction()` method (lines ~1095-1145 after edits)

Two fault paths hooked:

1. **SOAP fault branch** (`if (data.faultcode)`):
   - A proper `Error` is constructed from `data.faultstring`, `.faultcode` set on it.
   - `this._reportError(faultErr)` called before returning `{result:false, level:'fault', ...}`.

2. **Exception catch block** (`catch (error)`):
   - `this._reportError(error instanceof Error ? error : new Error(String(error)))` called before `return {result:false, level:'exception'}`.

Context tracking added at the top of `callApiFunction`:
- `this.lastFunction = apiFunctionName` — stored before any async work.
- `this.lastRequest = parameters` — stored before any async work.
- `this.lastResponse = result` — stored after the SOAP call succeeds (before fault/data checks).

## Constructor Option Handling

### DNARest
- Signature: `constructor(resellerId, token, testMode = false, options = {})`
- `options.telemetry !== false` → `this.errorReportingEnabled` (falsy options.telemetry or absent means `true`)
- `options.sentryDsn || DEFAULT_SENTRY_DSN` → `this.sentryDsn`
- `Date.now()` → `this.startAt`

### DNASoap
- Signature: `constructor(userName = 'ownername', password = 'ownerpass', testMode = false, options = {})`
- Same logic for `errorReportingEnabled`, `sentryDsn`, `startAt`.
- Also initialises `lastRequest = null`, `lastResponse = null`, `lastFunction = null`.

### DomainNameApi (facade)
- Signature: `constructor(userName, password, optionsOrTestMode = false)`
- **Backward compat**: if `optionsOrTestMode` is a `boolean` → it IS `testMode` (existing `new DomainNameApi('u','p',true)` unchanged).
- **New form**: if `optionsOrTestMode` is an `object` → destructures `{ testMode, telemetry, sentryDsn }`. Passes a clean `options = {telemetry, sentryDsn}` object as 4th arg to whichever client is constructed.
- Added `setErrorReportingEnabled(enabled)` that delegates to `this.client.setErrorReportingEnabled(enabled)` and returns `this`.

## No-Test-Hit Guarantee (Zero Real Sentry Calls)

All 450 existing tests stub `client.request` or `client.callApiFunction` at the **business-method level** (e.g. `api.GetDetails = async () => fakeData`). The telemetry hooks are wired **inside** the two transport-core functions. When tests stub at the method level, `request()` / `callApiFunction()` never runs, so `_reportError()` is never reached.

For the new 25 tests in `telemetry-wiring.test.js`:
- Tests that spy on `_reportError` replace the instance method directly (`client._reportError = spy`) before any error path runs → `telemetry.reportError` is never called.
- The two tests that DO let `_reportError` call through (enabled-flag propagation tests) monkey-patch `telemetry.reportError` on the module exports object (`telemetry.reportError = async (config) => { ... }`) and restore the original in a `finally` block. This intercepts the call before it can reach `globalThis.fetch`.
- No test uses a live network connection. Confirmed by running the full suite in an environment with no Sentry server available.

## Test Output

```
# tests 475
# pass 475
# fail 0
# cancelled 0
# skipped 0
```

New test file: `test/telemetry-wiring.test.js` (25 tests).
Existing test count unchanged: 450 tests all pass.

## Notable Technical Issue Encountered & Resolved

Using `new Proxy({}, { get: () => async () => { throw ... } })` as a fake SOAP client stub caused two tests to fail with `unhandledRejection`. Root cause: `Promise.resolve(proxy)` detects that the Proxy has a `then` property (the catch-all getter intercepts `then` and returns an async function, making the Proxy look like a thenable). `Promise.resolve` then calls `proxy.then(resolve, reject)`, which invokes the async stub—creating a rejected Promise that is never caught (because `resolve`/`reject` are never called, and the returned rejected Promise is floating).

Fix: replaced Proxy stubs with plain objects that have only the specific method needed for each test (e.g. `{ GetDetails: async () => { throw new Error(...); } }`). Plain objects without a `then` property are not thenables, so `Promise.resolve()` wraps them correctly without triggering unhandled rejections.

## Concerns / Follow-ups

- `testMode` parameter in `DNASoap` constructor is accepted but not currently used (`this.serviceUrl` is always `SOAP_URL`). This is pre-existing behaviour; no change made here.
- `_reportError` is fire-and-forget: it calls `telemetry.reportError(...)` without `await`. The `reportError` function is itself async and has a top-level try/catch that swallows all errors. The `_reportError` wrapper adds an additional try/catch for the synchronous call boundary.
- The `lastRequest` field on SOAP is set to the full `parameters` object (which includes `request.Password`). `telemetry.reportError` / `buildSentryEvent` calls `scrubSensitive()` on `lastRequest` before including it in the Sentry payload, so credentials are redacted before transmission.
