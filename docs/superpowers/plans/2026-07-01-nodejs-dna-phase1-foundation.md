# nodejs-dna Phase 1 — Foundation & Facade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the TypeScript project scaffolding and the shared foundation (config, errors, telemetry, base client, types, interface) plus the transport-routing facade with skeleton clients — a testable base the REST/SOAP method implementations build on.

**Architecture:** Approach A — mirror php-dna structure in modern TypeScript. A `DomainNameApi` facade routes by username (UUID → `RestClient`, else `SoapClient`); both clients extend a shared `BaseClient` and implement a common `DomainApiClient` interface. Phase 1 delivers everything except the per-method REST/SOAP marshalling (skeleton clients throw `NotImplementedError`).

**Tech Stack:** TypeScript, ESM (+ dual CJS via `tsup`), native `fetch`, `strong-soap` (deferred to Phase 3), `vitest` runner.

## Global Constraints

- Node.js **>= 20** (native global `fetch`).
- Library version: **`3.0.0`** (single source of truth in `src/core/config.ts`; `package.json` mirrors it).
- Public API is **camelCase**, returns **typed objects**, and **throws typed errors** on failure — no `{result, data}` envelope.
- Module output: **dual ESM + CJS + `.d.ts`** via `tsup`; `package.json` `exports` map.
- Telemetry (Sentry) is **default ON**, opt-out via `{ telemetry: false }`; **no extra credential/PII redaction** (accepted risk).
- REST base URLs: prod `https://api.domainresellerapi.com/api/v1`, OTE `https://ote.domainresellerapi.com/api/v1`.
- Commit author must be `xa81 <poisonkid@gmail.com>` (per-repo identity).
- All source under `src/`, all tests under `test/`, ESM import specifiers use explicit `.js` extensions (TS `nodenext` resolution).

---

### Task 1: Project scaffolding (TypeScript + tsup + vitest)

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (temporary stub, replaced in Task 9)
- Create: `.gitignore` (ensure `dist/` ignored)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable/testable project. `npm run build` emits `dist/`; `npm test` runs vitest.

- [ ] **Step 1: Rewrite `package.json`**

```json
{
  "name": "nodejs-dna",
  "version": "3.0.0",
  "description": "Modern TypeScript client for the Domain Name API (REST + SOAP)",
  "author": "Atak Domain",
  "license": "MIT",
  "type": "module",
  "engines": { "node": ">=20" },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "strong-soap": "^4.1.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Create temporary `src/index.ts`**

```ts
export const PLACEHOLDER = true;
```

- [ ] **Step 6: Ensure `.gitignore` ignores build + deps**

Append to `.gitignore` (create if missing) so it contains:

```
node_modules/
dist/
*.cache
```

- [ ] **Step 7: Install and verify build + test run**

Run: `npm install && npm run build && npm test`
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` exist; vitest reports "no test files found" (exit 0 acceptable) — the toolchain works.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: TypeScript + tsup + vitest scaffolding (v3.0.0)"
```

---

### Task 2: Core config

**Files:**
- Create: `src/core/config.ts`
- Test: `test/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `VERSION: string` (`'3.0.0'`)
  - `URL_PROD: string`, `URL_OTE: string`
  - `DEFAULT_TIMEOUT_MS: number` (`20000`)
  - `APPLICATION: string` (`'CORE'`)
  - `looksLikeUuid(value: string): boolean`
  - `resolveBaseUrl(testMode: boolean): string`

- [ ] **Step 1: Write the failing test**

```ts
// test/config.test.ts
import { describe, it, expect } from 'vitest';
import { looksLikeUuid, resolveBaseUrl, URL_PROD, URL_OTE, VERSION } from '../src/core/config.js';

describe('config', () => {
  it('VERSION is 3.0.0', () => {
    expect(VERSION).toBe('3.0.0');
  });

  it('detects a UUID (trims surrounding whitespace)', () => {
    expect(looksLikeUuid('  3f2504e0-4f89-41d3-9a0c-0305e82c3301  ')).toBe(true);
  });

  it('rejects a normal username', () => {
    expect(looksLikeUuid('ownername')).toBe(false);
  });

  it('resolves base url by testMode', () => {
    expect(resolveBaseUrl(false)).toBe(URL_PROD);
    expect(resolveBaseUrl(true)).toBe(URL_OTE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/config.test.ts`
Expected: FAIL — cannot resolve `../src/core/config.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/config.ts
export const VERSION = '3.0.0';
export const URL_PROD = 'https://api.domainresellerapi.com/api/v1';
export const URL_OTE = 'https://ote.domainresellerapi.com/api/v1';
export const DEFAULT_TIMEOUT_MS = 20000;
export const APPLICATION = 'CORE';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function resolveBaseUrl(testMode: boolean): string {
  return testMode ? URL_OTE : URL_PROD;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/config.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/config.ts test/config.test.ts
git commit -m "feat(core): config constants, looksLikeUuid, resolveBaseUrl"
```

---

### Task 3: Error hierarchy

**Files:**
- Create: `src/core/errors.ts`
- Test: `test/errors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface DomainApiErrorOptions { code?: string; gatewayCode?: string; details?: string; transport?: 'rest' | 'soap'; requestId?: string; fields?: Record<string, string>; cause?: unknown }`
  - `class DomainApiError extends Error` (fields: `code?`, `gatewayCode?`, `details?`, `transport?`, `requestId?`, `fields?`)
  - Subclasses: `AuthenticationError`, `ValidationError`, `DomainNotFoundError`, `RateLimitError`, `TransportError`, `ApiError`.

- [ ] **Step 1: Write the failing test**

```ts
// test/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  DomainApiError,
  DomainNotFoundError,
  ValidationError,
} from '../src/core/errors.js';

describe('errors', () => {
  it('DomainApiError carries metadata and correct name', () => {
    const e = new DomainApiError('boom', { code: 'X', transport: 'rest' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DomainApiError');
    expect(e.code).toBe('X');
    expect(e.transport).toBe('rest');
  });

  it('subclasses are instanceof the base and carry their own name', () => {
    const e = new DomainNotFoundError('not found', { gatewayCode: 'ERR_DOMAIN_NOT_FOUND' });
    expect(e).toBeInstanceOf(DomainApiError);
    expect(e.name).toBe('DomainNotFoundError');
    expect(e.gatewayCode).toBe('ERR_DOMAIN_NOT_FOUND');
  });

  it('ValidationError carries per-field details', () => {
    const e = new ValidationError('invalid', { fields: { email: 'required' } });
    expect(e.fields?.email).toBe('required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/errors.test.ts`
Expected: FAIL — cannot resolve `../src/core/errors.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/errors.ts
export interface DomainApiErrorOptions {
  code?: string;
  gatewayCode?: string;
  details?: string;
  transport?: 'rest' | 'soap';
  requestId?: string;
  fields?: Record<string, string>;
  cause?: unknown;
}

export class DomainApiError extends Error {
  code?: string;
  gatewayCode?: string;
  details?: string;
  transport?: 'rest' | 'soap';
  requestId?: string;
  fields?: Record<string, string>;

  constructor(message: string, opts: DomainApiErrorOptions = {}) {
    super(message, { cause: opts.cause });
    this.name = new.target.name;
    this.code = opts.code;
    this.gatewayCode = opts.gatewayCode;
    this.details = opts.details;
    this.transport = opts.transport;
    this.requestId = opts.requestId;
    this.fields = opts.fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends DomainApiError {}
export class ValidationError extends DomainApiError {}
export class DomainNotFoundError extends DomainApiError {}
export class RateLimitError extends DomainApiError {}
export class TransportError extends DomainApiError {}
export class ApiError extends DomainApiError {}

/** Thrown by skeleton client methods until their transport is implemented. */
export class NotImplementedError extends DomainApiError {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/errors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/errors.ts test/errors.test.ts
git commit -m "feat(core): typed error hierarchy"
```

---

### Task 4: Domain types & client interface

**Files:**
- Create: `src/types/index.ts`
- Create: `src/clients/DomainApiClient.ts`
- Test: `test/types.test.ts` (compile-time contract check via a conforming stub)

**Interfaces:**
- Consumes: nothing (pure type declarations).
- Produces: the shared DTOs and the `DomainApiClient` interface that both
  `RestClient` and `SoapClient` implement. Method signatures below are the
  frozen contract for Phases 2–3.

- [ ] **Step 1: Create `src/types/index.ts`**

```ts
// src/types/index.ts
// Shared DTOs. Field sets are grounded in the current SOAP payloads (index.js)
// and php-dna DNARest; Phases 2-3 refine optional fields as gateway schemas require.

export interface ClientOptions {
  testMode?: boolean;
  timeout?: number;
  telemetry?: boolean;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  [extra: string]: unknown;
}

export interface DomainContacts {
  administrative?: ContactInfo;
  billing?: ContactInfo;
  technical?: ContactInfo;
  registrant?: ContactInfo;
}

export interface DomainDates {
  start?: string;
  expiration?: string;
}

export interface DomainDetails {
  id?: string;
  domainName?: string;
  status?: string;
  locked?: boolean;
  privacyProtection?: boolean;
  autoRenew?: boolean;
  nameServers?: string[];
  dates?: DomainDates;
  contacts?: DomainContacts;
  [extra: string]: unknown;
}

export interface DomainAvailabilityResult {
  domainName: string;
  tld: string;
  available: boolean;
  classicPrice?: number;
  currency?: string;
  command?: string;
  status?: string;
}

export interface RegisterResult {
  domainName?: string;
  id?: string;
  status?: string;
  [extra: string]: unknown;
}

export interface TransferResult {
  domainName?: string;
  transferId?: string;
  status?: string;
  [extra: string]: unknown;
}

export interface RenewResult {
  domainName?: string;
  expirationDate?: string;
  [extra: string]: unknown;
}

export interface ResellerDetails {
  id?: string;
  name?: string;
  active?: boolean;
  [extra: string]: unknown;
}

export interface BalanceInfo {
  balance: number;
  currency: string;
  [extra: string]: unknown;
}

export interface TldInfo {
  tld: string;
  minPeriod?: number;
  maxPeriod?: number;
  prices?: Record<string, number>;
  [extra: string]: unknown;
}

export interface DomainListItem {
  id?: string;
  domainName?: string;
  status?: string;
  [extra: string]: unknown;
}

export interface DomainListResult {
  items: DomainListItem[];
  total?: number;
}

export interface ChildNameServerResult {
  nameServer: string;
  ipAddresses: string[];
}

export interface RegisterParams {
  domainName: string;
  period: number;
  contacts: DomainContacts;
  nameServers?: string[];
  eppLock?: boolean;
  privacyLock?: boolean;
  additionalAttributes?: Record<string, string>;
}
```

- [ ] **Step 2: Create `src/clients/DomainApiClient.ts`**

```ts
// src/clients/DomainApiClient.ts
import type {
  DomainDetails,
  DomainAvailabilityResult,
  DomainContacts,
  RegisterParams,
  RegisterResult,
  TransferResult,
  RenewResult,
  ResellerDetails,
  BalanceInfo,
  TldInfo,
  DomainListResult,
  ChildNameServerResult,
} from '../types/index.js';

export interface DomainApiClient {
  readonly transport: 'rest' | 'soap';

  getDetails(domainName: string): Promise<DomainDetails>;
  checkAvailability(
    domains: string[],
    extensions: string[],
    period?: number,
    command?: string,
  ): Promise<DomainAvailabilityResult[]>;
  registerWithContactInfo(params: RegisterParams): Promise<RegisterResult>;
  syncFromRegistry(domainName: string): Promise<DomainDetails>;

  transfer(domainName: string, eppCode: string, period: number): Promise<TransferResult>;
  cancelTransfer(domainName: string): Promise<TransferResult>;
  approveTransfer(domainName: string): Promise<TransferResult>;
  rejectTransfer(domainName: string): Promise<TransferResult>;
  renew(domainName: string, period: number): Promise<RenewResult>;

  getContacts(domainName: string): Promise<DomainContacts>;
  saveContacts(domainName: string, contacts: DomainContacts): Promise<DomainContacts>;
  modifyPrivacyProtection(
    domainName: string,
    status: boolean,
    reason?: string,
  ): Promise<DomainDetails>;

  getResellerDetails(): Promise<ResellerDetails>;
  getCurrentBalance(currencyId?: number): Promise<BalanceInfo>;
  getList(extraParameters?: Record<string, unknown>): Promise<DomainListResult>;
  getTldList(count?: number): Promise<TldInfo[]>;

  addChildNameServer(
    domainName: string,
    nameServer: string,
    ipAddress: string,
  ): Promise<ChildNameServerResult>;
  deleteChildNameServer(domainName: string, nameServer: string): Promise<void>;
  modifyChildNameServer(
    domainName: string,
    nameServer: string,
    ipAddress: string,
  ): Promise<ChildNameServerResult>;
}
```

- [ ] **Step 3: Write the contract compile test**

```ts
// test/types.test.ts
import { describe, it, expect } from 'vitest';
import type { DomainApiClient } from '../src/clients/DomainApiClient.js';
import type { DomainDetails } from '../src/types/index.js';

describe('types', () => {
  it('a minimal object can satisfy DomainDetails shape', () => {
    const d: DomainDetails = { domainName: 'example.com', status: 'Active' };
    expect(d.domainName).toBe('example.com');
  });

  it('DomainApiClient transport is a literal union', () => {
    const t: DomainApiClient['transport'] = 'rest';
    expect(t).toBe('rest');
  });
});
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run test/types.test.ts && npm run typecheck`
Expected: tests PASS; `tsc --noEmit` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/clients/DomainApiClient.ts test/types.test.ts
git commit -m "feat: shared DTOs and DomainApiClient interface contract"
```

---

### Task 5: Telemetry (Sentry envelope reporter)

**Files:**
- Create: `src/core/telemetry.ts`
- Test: `test/telemetry.test.ts`

**Interfaces:**
- Consumes: `VERSION` from `config.ts`.
- Produces:
  - `interface TelemetryOptions { enabled: boolean; dsn?: string; fetchImpl?: typeof fetch }`
  - `class Telemetry { constructor(opts: TelemetryOptions); captureException(err: unknown, context?: Record<string, unknown>): Promise<void> }`
  - When `enabled === false`, `captureException` is a no-op and never calls fetch.

- [ ] **Step 1: Write the failing test**

```ts
// test/telemetry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Telemetry } from '../src/core/telemetry.js';

describe('telemetry', () => {
  it('does not call fetch when disabled', async () => {
    const fetchImpl = vi.fn();
    const t = new Telemetry({ enabled: false, dsn: 'https://k@o.ingest.sentry.io/1', fetchImpl: fetchImpl as unknown as typeof fetch });
    await t.captureException(new Error('x'));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts an envelope when enabled', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const t = new Telemetry({ enabled: true, dsn: 'https://key@o123.ingest.sentry.io/42', fetchImpl: fetchImpl as unknown as typeof fetch });
    await t.captureException(new Error('boom'));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/api/42/envelope/');
  });

  it('never throws even if fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const t = new Telemetry({ enabled: true, dsn: 'https://key@o1.ingest.sentry.io/9', fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(t.captureException(new Error('boom'))).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/telemetry.test.ts`
Expected: FAIL — cannot resolve `../src/core/telemetry.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/telemetry.ts
import { VERSION } from './config.js';

export interface TelemetryOptions {
  enabled: boolean;
  dsn?: string;
  fetchImpl?: typeof fetch;
}

interface ParsedDsn {
  ingestUrl: string;
  publicKey: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  // https://<key>@<host>/<projectId>
  const m = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn);
  if (!m) return null;
  const [, publicKey, host, projectId] = m;
  return { ingestUrl: `https://${host}/api/${projectId}/envelope/`, publicKey };
}

export class Telemetry {
  private readonly enabled: boolean;
  private readonly dsn?: ParsedDsn | null;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: TelemetryOptions) {
    this.enabled = opts.enabled;
    this.dsn = opts.dsn ? parseDsn(opts.dsn) : null;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async captureException(
    err: unknown,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    if (!this.enabled || !this.dsn) return;
    try {
      const error = err instanceof Error ? err : new Error(String(err));
      const eventId = crypto.randomUUID().replace(/-/g, '');
      const header = JSON.stringify({
        event_id: eventId,
        dsn: undefined,
        sdk: { name: 'nodejs-dna', version: VERSION },
      });
      const itemHeader = JSON.stringify({ type: 'event' });
      const payload = JSON.stringify({
        event_id: eventId,
        platform: 'node',
        release: VERSION,
        level: 'error',
        exception: {
          values: [{ type: error.name, value: error.message }],
        },
        extra: context,
      });
      const body = `${header}\n${itemHeader}\n${payload}`;
      await this.fetchImpl(this.dsn.ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=nodejs-dna/${VERSION}, sentry_key=${this.dsn.publicKey}`,
        },
        body,
      });
    } catch {
      // telemetry must never surface to the caller
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/telemetry.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/telemetry.ts test/telemetry.test.ts
git commit -m "feat(core): lightweight Sentry envelope telemetry (default on, opt-out)"
```

---

### Task 6: BaseClient (config, timeout, retry, telemetry wiring, debug state)

**Files:**
- Create: `src/core/BaseClient.ts`
- Test: `test/base-client.test.ts`

**Interfaces:**
- Consumes: `resolveBaseUrl`, `DEFAULT_TIMEOUT_MS`, `APPLICATION` from `config.ts`; `Telemetry` from `telemetry.ts`; `TransportError` from `errors.ts`; `ClientOptions` from `types`.
- Produces:
  - `abstract class BaseClient` with:
    - `constructor(userName: string, password: string, options?: ClientOptions)`
    - protected `baseUrl: string`, `userName: string`, `password: string`, `timeout: number`, `telemetry: Telemetry`
    - public debug state `lastRequest`, `lastResponse`, `lastResponseHeaders`, `lastFunction`
    - protected `withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T>`
    - protected `retry<T>(fn: () => Promise<T>, attempts?: number): Promise<T>` (exponential backoff, only retries `TransportError`)

- [ ] **Step 1: Write the failing test**

```ts
// test/base-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BaseClient } from '../src/core/BaseClient.js';
import { TransportError, ValidationError } from '../src/core/errors.js';
import { URL_OTE, URL_PROD } from '../src/core/config.js';

class Probe extends BaseClient {
  readonly transport = 'rest' as const;
  runRetry<T>(fn: () => Promise<T>, attempts?: number) {
    return this.retry(fn, attempts);
  }
}

describe('BaseClient', () => {
  it('selects OTE base url in test mode', () => {
    const prod = new Probe('u', 'p');
    const ote = new Probe('u', 'p', { testMode: true });
    // @ts-expect-error protected access for test
    expect(prod.baseUrl).toBe(URL_PROD);
    // @ts-expect-error protected access for test
    expect(ote.baseUrl).toBe(URL_OTE);
  });

  it('retries TransportError then succeeds', async () => {
    const c = new Probe('u', 'p');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TransportError('net'))
      .mockResolvedValueOnce('ok');
    await expect(c.runRetry(fn, 2)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transport errors', async () => {
    const c = new Probe('u', 'p');
    const fn = vi.fn().mockRejectedValue(new ValidationError('bad'));
    await expect(c.runRetry(fn, 3)).rejects.toBeInstanceOf(ValidationError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/base-client.test.ts`
Expected: FAIL — cannot resolve `../src/core/BaseClient.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/BaseClient.ts
import { APPLICATION, DEFAULT_TIMEOUT_MS, resolveBaseUrl } from './config.js';
import { Telemetry } from './telemetry.js';
import { TransportError } from './errors.js';
import type { ClientOptions } from '../types/index.js';

const SENTRY_DSN =
  'https://examplePublicKey@o0.ingest.sentry.io/0'; // replace with real DNA DSN in Phase 4

export abstract class BaseClient {
  abstract readonly transport: 'rest' | 'soap';

  protected readonly userName: string;
  protected readonly password: string;
  protected readonly baseUrl: string;
  protected readonly timeout: number;
  protected readonly application = APPLICATION;
  protected readonly telemetry: Telemetry;

  public lastRequest: unknown = null;
  public lastResponse: unknown = null;
  public lastResponseHeaders: Record<string, string> | null = null;
  public lastFunction = '';

  constructor(userName: string, password: string, options: ClientOptions = {}) {
    this.userName = userName.trim();
    this.password = password.trim();
    this.baseUrl = resolveBaseUrl(options.testMode ?? false);
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.telemetry = new Telemetry({
      enabled: options.telemetry ?? true,
      dsn: SENTRY_DSN,
    });
  }

  protected async withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fn(controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        throw new TransportError(`Request timed out after ${this.timeout}ms`, {
          transport: this.transport,
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  protected async retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (!(err instanceof TransportError) || i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, 2 ** i * 100));
      }
    }
    throw lastErr;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/base-client.test.ts && npm run typecheck`
Expected: PASS (3 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/core/BaseClient.ts test/base-client.test.ts
git commit -m "feat(core): BaseClient with timeout, retry, telemetry, debug state"
```

---

### Task 7: RestClient skeleton

**Files:**
- Create: `src/clients/RestClient.ts`
- Test: `test/rest-client.test.ts`

**Interfaces:**
- Consumes: `BaseClient`, `DomainApiClient`, `NotImplementedError`.
- Produces: `class RestClient extends BaseClient implements DomainApiClient` with
  `transport = 'rest'`. Every interface method is present and throws
  `NotImplementedError` (bodies land in Phase 2). Also produces protected
  `restHeaders(): Record<string, string>` returning `{ 'X-API-KEY', '__reseller' }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/rest-client.test.ts
import { describe, it, expect } from 'vitest';
import { RestClient } from '../src/clients/RestClient.js';
import { NotImplementedError } from '../src/core/errors.js';

describe('RestClient skeleton', () => {
  it('reports rest transport', () => {
    const c = new RestClient('3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'apikey');
    expect(c.transport).toBe('rest');
  });

  it('builds REST auth headers from reseller uuid + api key', () => {
    const c = new RestClient('3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'apikey');
    // @ts-expect-error protected access for test
    const h = c.restHeaders();
    expect(h['X-API-KEY']).toBe('apikey');
    expect(h['__reseller']).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  });

  it('methods throw NotImplementedError until Phase 2', async () => {
    const c = new RestClient('3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'apikey');
    await expect(c.getDetails('example.com')).rejects.toBeInstanceOf(NotImplementedError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/rest-client.test.ts`
Expected: FAIL — cannot resolve `../src/clients/RestClient.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/clients/RestClient.ts
import { BaseClient } from '../core/BaseClient.js';
import { NotImplementedError } from '../core/errors.js';
import type { DomainApiClient } from './DomainApiClient.js';
import type {
  DomainDetails,
  DomainAvailabilityResult,
  DomainContacts,
  RegisterParams,
  RegisterResult,
  TransferResult,
  RenewResult,
  ResellerDetails,
  BalanceInfo,
  TldInfo,
  DomainListResult,
  ChildNameServerResult,
} from '../types/index.js';

export class RestClient extends BaseClient implements DomainApiClient {
  readonly transport = 'rest' as const;

  protected restHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.password,
      __reseller: this.userName,
    };
  }

  private ni(fn: string): never {
    throw new NotImplementedError(`RestClient.${fn} not implemented (Phase 2)`, {
      transport: 'rest',
    });
  }

  getDetails(_domainName: string): Promise<DomainDetails> { return this.ni('getDetails'); }
  checkAvailability(_d: string[], _e: string[], _p?: number, _c?: string): Promise<DomainAvailabilityResult[]> { return this.ni('checkAvailability'); }
  registerWithContactInfo(_p: RegisterParams): Promise<RegisterResult> { return this.ni('registerWithContactInfo'); }
  syncFromRegistry(_domainName: string): Promise<DomainDetails> { return this.ni('syncFromRegistry'); }
  transfer(_d: string, _e: string, _p: number): Promise<TransferResult> { return this.ni('transfer'); }
  cancelTransfer(_d: string): Promise<TransferResult> { return this.ni('cancelTransfer'); }
  approveTransfer(_d: string): Promise<TransferResult> { return this.ni('approveTransfer'); }
  rejectTransfer(_d: string): Promise<TransferResult> { return this.ni('rejectTransfer'); }
  renew(_d: string, _p: number): Promise<RenewResult> { return this.ni('renew'); }
  getContacts(_d: string): Promise<DomainContacts> { return this.ni('getContacts'); }
  saveContacts(_d: string, _c: DomainContacts): Promise<DomainContacts> { return this.ni('saveContacts'); }
  modifyPrivacyProtection(_d: string, _s: boolean, _r?: string): Promise<DomainDetails> { return this.ni('modifyPrivacyProtection'); }
  getResellerDetails(): Promise<ResellerDetails> { return this.ni('getResellerDetails'); }
  getCurrentBalance(_c?: number): Promise<BalanceInfo> { return this.ni('getCurrentBalance'); }
  getList(_e?: Record<string, unknown>): Promise<DomainListResult> { return this.ni('getList'); }
  getTldList(_c?: number): Promise<TldInfo[]> { return this.ni('getTldList'); }
  addChildNameServer(_d: string, _n: string, _i: string): Promise<ChildNameServerResult> { return this.ni('addChildNameServer'); }
  deleteChildNameServer(_d: string, _n: string): Promise<void> { return this.ni('deleteChildNameServer'); }
  modifyChildNameServer(_d: string, _n: string, _i: string): Promise<ChildNameServerResult> { return this.ni('modifyChildNameServer'); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/rest-client.test.ts && npm run typecheck`
Expected: PASS (3 tests); typecheck clean (RestClient satisfies DomainApiClient).

- [ ] **Step 5: Commit**

```bash
git add src/clients/RestClient.ts test/rest-client.test.ts
git commit -m "feat(rest): RestClient skeleton implementing the client contract"
```

---

### Task 8: SoapClient skeleton

**Files:**
- Create: `src/clients/SoapClient.ts`
- Test: `test/soap-client.test.ts`

**Interfaces:**
- Consumes: `BaseClient`, `DomainApiClient`, `NotImplementedError`.
- Produces: `class SoapClient extends BaseClient implements DomainApiClient` with
  `transport = 'soap'`. Every interface method throws `NotImplementedError`
  (bodies land in Phase 3). Also produces protected
  `soapRequestBase(): { UserName: string; Password: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/soap-client.test.ts
import { describe, it, expect } from 'vitest';
import { SoapClient } from '../src/clients/SoapClient.js';
import { NotImplementedError } from '../src/core/errors.js';

describe('SoapClient skeleton', () => {
  it('reports soap transport', () => {
    const c = new SoapClient('ownername', 'ownerpass');
    expect(c.transport).toBe('soap');
  });

  it('builds SOAP request base with UserName/Password', () => {
    const c = new SoapClient('ownername', 'ownerpass');
    // @ts-expect-error protected access for test
    const b = c.soapRequestBase();
    expect(b.UserName).toBe('ownername');
    expect(b.Password).toBe('ownerpass');
  });

  it('methods throw NotImplementedError until Phase 3', async () => {
    const c = new SoapClient('ownername', 'ownerpass');
    await expect(c.getDetails('example.com')).rejects.toBeInstanceOf(NotImplementedError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/soap-client.test.ts`
Expected: FAIL — cannot resolve `../src/clients/SoapClient.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/clients/SoapClient.ts
import { BaseClient } from '../core/BaseClient.js';
import { NotImplementedError } from '../core/errors.js';
import type { DomainApiClient } from './DomainApiClient.js';
import type {
  DomainDetails,
  DomainAvailabilityResult,
  DomainContacts,
  RegisterParams,
  RegisterResult,
  TransferResult,
  RenewResult,
  ResellerDetails,
  BalanceInfo,
  TldInfo,
  DomainListResult,
  ChildNameServerResult,
} from '../types/index.js';

export class SoapClient extends BaseClient implements DomainApiClient {
  readonly transport = 'soap' as const;

  protected soapRequestBase(): { UserName: string; Password: string } {
    return { UserName: this.userName, Password: this.password };
  }

  private ni(fn: string): never {
    throw new NotImplementedError(`SoapClient.${fn} not implemented (Phase 3)`, {
      transport: 'soap',
    });
  }

  getDetails(_domainName: string): Promise<DomainDetails> { return this.ni('getDetails'); }
  checkAvailability(_d: string[], _e: string[], _p?: number, _c?: string): Promise<DomainAvailabilityResult[]> { return this.ni('checkAvailability'); }
  registerWithContactInfo(_p: RegisterParams): Promise<RegisterResult> { return this.ni('registerWithContactInfo'); }
  syncFromRegistry(_domainName: string): Promise<DomainDetails> { return this.ni('syncFromRegistry'); }
  transfer(_d: string, _e: string, _p: number): Promise<TransferResult> { return this.ni('transfer'); }
  cancelTransfer(_d: string): Promise<TransferResult> { return this.ni('cancelTransfer'); }
  approveTransfer(_d: string): Promise<TransferResult> { return this.ni('approveTransfer'); }
  rejectTransfer(_d: string): Promise<TransferResult> { return this.ni('rejectTransfer'); }
  renew(_d: string, _p: number): Promise<RenewResult> { return this.ni('renew'); }
  getContacts(_d: string): Promise<DomainContacts> { return this.ni('getContacts'); }
  saveContacts(_d: string, _c: DomainContacts): Promise<DomainContacts> { return this.ni('saveContacts'); }
  modifyPrivacyProtection(_d: string, _s: boolean, _r?: string): Promise<DomainDetails> { return this.ni('modifyPrivacyProtection'); }
  getResellerDetails(): Promise<ResellerDetails> { return this.ni('getResellerDetails'); }
  getCurrentBalance(_c?: number): Promise<BalanceInfo> { return this.ni('getCurrentBalance'); }
  getList(_e?: Record<string, unknown>): Promise<DomainListResult> { return this.ni('getList'); }
  getTldList(_c?: number): Promise<TldInfo[]> { return this.ni('getTldList'); }
  addChildNameServer(_d: string, _n: string, _i: string): Promise<ChildNameServerResult> { return this.ni('addChildNameServer'); }
  deleteChildNameServer(_d: string, _n: string): Promise<void> { return this.ni('deleteChildNameServer'); }
  modifyChildNameServer(_d: string, _n: string, _i: string): Promise<ChildNameServerResult> { return this.ni('modifyChildNameServer'); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/soap-client.test.ts && npm run typecheck`
Expected: PASS (3 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/clients/SoapClient.ts test/soap-client.test.ts
git commit -m "feat(soap): SoapClient skeleton implementing the client contract"
```

---

### Task 9: Facade (DomainNameApi) + public exports

**Files:**
- Create: `src/DomainNameApi.ts`
- Modify: `src/index.ts` (replace the Task 1 placeholder)
- Test: `test/facade.test.ts`

**Interfaces:**
- Consumes: `looksLikeUuid` from config; `RestClient`, `SoapClient`; `DomainApiClient`; `ClientOptions`.
- Produces:
  - `class DomainNameApi implements DomainApiClient` — constructs the right
    client by username and delegates every method to it. Exposes
    `readonly transport` and `readonly client: DomainApiClient`.
  - `src/index.ts` re-exports `DomainNameApi`, all error classes, and all types.

- [ ] **Step 1: Write the failing test**

```ts
// test/facade.test.ts
import { describe, it, expect } from 'vitest';
import { DomainNameApi } from '../src/DomainNameApi.js';

describe('DomainNameApi facade routing', () => {
  it('routes a UUID username to the REST client', () => {
    const api = new DomainNameApi('3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'apikey');
    expect(api.transport).toBe('rest');
  });

  it('routes a normal username to the SOAP client', () => {
    const api = new DomainNameApi('ownername', 'ownerpass');
    expect(api.transport).toBe('soap');
  });

  it('routes a whitespace-padded UUID to REST (trimmed)', () => {
    const api = new DomainNameApi('  3f2504e0-4f89-41d3-9a0c-0305e82c3301  ', 'apikey');
    expect(api.transport).toBe('rest');
  });

  it('delegates method calls to the active client', async () => {
    const api = new DomainNameApi('ownername', 'ownerpass');
    // skeleton throws NotImplementedError → proves delegation reached the client
    await expect(api.getDetails('example.com')).rejects.toThrow(/not implemented/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/facade.test.ts`
Expected: FAIL — cannot resolve `../src/DomainNameApi.js`.

- [ ] **Step 3: Write `src/DomainNameApi.ts`**

```ts
// src/DomainNameApi.ts
import { looksLikeUuid } from './core/config.js';
import { RestClient } from './clients/RestClient.js';
import { SoapClient } from './clients/SoapClient.js';
import type { DomainApiClient } from './clients/DomainApiClient.js';
import type {
  ClientOptions,
  DomainDetails,
  DomainAvailabilityResult,
  DomainContacts,
  RegisterParams,
  RegisterResult,
  TransferResult,
  RenewResult,
  ResellerDetails,
  BalanceInfo,
  TldInfo,
  DomainListResult,
  ChildNameServerResult,
} from './types/index.js';

export class DomainNameApi implements DomainApiClient {
  readonly client: DomainApiClient;

  constructor(userName: string, password: string, options: ClientOptions = {}) {
    this.client = looksLikeUuid(userName)
      ? new RestClient(userName, password, options)
      : new SoapClient(userName, password, options);
  }

  get transport(): 'rest' | 'soap' {
    return this.client.transport;
  }

  getDetails(domainName: string): Promise<DomainDetails> { return this.client.getDetails(domainName); }
  checkAvailability(domains: string[], extensions: string[], period?: number, command?: string): Promise<DomainAvailabilityResult[]> { return this.client.checkAvailability(domains, extensions, period, command); }
  registerWithContactInfo(params: RegisterParams): Promise<RegisterResult> { return this.client.registerWithContactInfo(params); }
  syncFromRegistry(domainName: string): Promise<DomainDetails> { return this.client.syncFromRegistry(domainName); }
  transfer(domainName: string, eppCode: string, period: number): Promise<TransferResult> { return this.client.transfer(domainName, eppCode, period); }
  cancelTransfer(domainName: string): Promise<TransferResult> { return this.client.cancelTransfer(domainName); }
  approveTransfer(domainName: string): Promise<TransferResult> { return this.client.approveTransfer(domainName); }
  rejectTransfer(domainName: string): Promise<TransferResult> { return this.client.rejectTransfer(domainName); }
  renew(domainName: string, period: number): Promise<RenewResult> { return this.client.renew(domainName, period); }
  getContacts(domainName: string): Promise<DomainContacts> { return this.client.getContacts(domainName); }
  saveContacts(domainName: string, contacts: DomainContacts): Promise<DomainContacts> { return this.client.saveContacts(domainName, contacts); }
  modifyPrivacyProtection(domainName: string, status: boolean, reason?: string): Promise<DomainDetails> { return this.client.modifyPrivacyProtection(domainName, status, reason); }
  getResellerDetails(): Promise<ResellerDetails> { return this.client.getResellerDetails(); }
  getCurrentBalance(currencyId?: number): Promise<BalanceInfo> { return this.client.getCurrentBalance(currencyId); }
  getList(extraParameters?: Record<string, unknown>): Promise<DomainListResult> { return this.client.getList(extraParameters); }
  getTldList(count?: number): Promise<TldInfo[]> { return this.client.getTldList(count); }
  addChildNameServer(domainName: string, nameServer: string, ipAddress: string): Promise<ChildNameServerResult> { return this.client.addChildNameServer(domainName, nameServer, ipAddress); }
  deleteChildNameServer(domainName: string, nameServer: string): Promise<void> { return this.client.deleteChildNameServer(domainName, nameServer); }
  modifyChildNameServer(domainName: string, nameServer: string, ipAddress: string): Promise<ChildNameServerResult> { return this.client.modifyChildNameServer(domainName, nameServer, ipAddress); }
}
```

- [ ] **Step 4: Replace `src/index.ts`**

```ts
// src/index.ts
export { DomainNameApi } from './DomainNameApi.js';
export { VERSION } from './core/config.js';
export type { DomainApiClient } from './clients/DomainApiClient.js';
export {
  DomainApiError,
  AuthenticationError,
  ValidationError,
  DomainNotFoundError,
  RateLimitError,
  TransportError,
  ApiError,
  NotImplementedError,
} from './core/errors.js';
export type * from './types/index.js';
```

- [ ] **Step 5: Run tests + typecheck + build**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: all tests PASS; typecheck clean; `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` emitted with `DomainNameApi` exported.

- [ ] **Step 6: Commit**

```bash
git add src/DomainNameApi.ts src/index.ts test/facade.test.ts
git commit -m "feat: DomainNameApi facade with username-based transport routing + public exports"
```

---

### Task 10: Smoke test the built package (ESM + CJS)

**Files:**
- Create: `test/smoke/esm.mjs`
- Create: `test/smoke/cjs.cjs`

**Interfaces:**
- Consumes: built `dist/` from Task 9.
- Produces: proof both module formats import and route correctly.

- [ ] **Step 1: Create ESM smoke script**

```js
// test/smoke/esm.mjs
import { DomainNameApi } from '../../dist/index.js';
const api = new DomainNameApi('3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'k');
if (api.transport !== 'rest') throw new Error('ESM: expected rest');
console.log('ESM ok:', api.transport);
```

- [ ] **Step 2: Create CJS smoke script**

```js
// test/smoke/cjs.cjs
const { DomainNameApi } = require('../../dist/index.cjs');
const api = new DomainNameApi('ownername', 'p');
if (api.transport !== 'soap') throw new Error('CJS: expected soap');
console.log('CJS ok:', api.transport);
```

- [ ] **Step 3: Build then run both**

Run: `npm run build && node test/smoke/esm.mjs && node test/smoke/cjs.cjs`
Expected: prints `ESM ok: rest` and `CJS ok: soap`.

- [ ] **Step 4: Commit**

```bash
git add test/smoke/esm.mjs test/smoke/cjs.cjs
git commit -m "test: ESM + CJS dual-format smoke tests"
```

---

## Self-Review

**Spec coverage (Phase 1 slice):**
- Module layout (spec §2) → Tasks 2–9 create every `src/` path listed.
- Facade routing + auth (spec §3) → Task 9 (routing), Task 7 `restHeaders`, Task 8 `soapRequestBase`.
- Type system + interface (spec §4) → Task 4.
- Error model (spec §5) → Task 3; `DomainNotFoundError` present for the sync fix (bodies use it in Phase 2/3).
- Cross-cutting BaseClient (spec §6) → Task 6 (retry/timeout/telemetry/debug state).
- Telemetry (spec §6) → Task 5.
- Build/dist/versioning (spec §9) → Task 1 (tsup dual build, v3.0.0), Task 10 (dual-format proof).
- **Deferred to later phase plans (intentionally, per spec §10 phasing):** REST method bodies + behavioral fixes (Phase 2), SOAP method bodies (Phase 3), OTE example tests + workflow update + upstream wiring + real Sentry DSN (Phase 4). The `SENTRY_DSN` placeholder in `BaseClient` is explicitly replaced in Phase 4.

**Placeholder scan:** No "TBD/TODO/handle appropriately" in steps. The one intentional stub (`SENTRY_DSN`) and the `NotImplementedError` method bodies are deliberate, tested, phase-scoped deliverables — not gaps.

**Type consistency:** `DomainApiClient` method signatures in Task 4 match RestClient (Task 7), SoapClient (Task 8), and the facade (Task 9) exactly — same names, params, return types. `ClientOptions`, error class names, and config exports are referenced consistently across tasks.

## Follow-on plans (not in this document)

- **Phase 2** — `docs/superpowers/plans/YYYY-MM-DD-nodejs-dna-phase2-rest.md`: implement all `RestClient` methods over native `fetch` + gateway error mapping + `.tr`/register/sync behavioral fixes.
- **Phase 3** — `...-phase3-soap.md`: implement all `SoapClient` methods via `strong-soap` wrapper, response-envelope parsing, parity with REST.
- **Phase 4** — `...-phase4-release.md`: OTE example integration tests, real Sentry DSN, `npm-publish.yml` build step, `domainreseller/nodejs-dna` upstream wiring, v3.0.0 release.
