# nodejs-dna

Node.js client for the [Domain Name API](https://www.domainnameapi.com/) (domainnameapi.com) — a faithful JavaScript port of [php-dna](https://github.com/atakdomain/php-dna) with dual REST and SOAP transport support through a single unified facade.

## Features

- **Dual transport, zero config** — UUID username routes to REST, any other username routes to SOAP, automatically
- **25 API methods** covering registration, renewal, transfer, contacts, nameservers, and account management
- **Unified return envelope** — consistent `{ result: 'OK', data: {...} }` / `{ result: 'ERROR', error: {...} }` across both transports
- **Promise-based** — all network methods are `async` and return Promises; `ValidateContact` and `IsTrTLD` are synchronous utilities
- **OTE / test mode** — a single flag switches to the REST sandbox endpoint
- **Error telemetry** — unexpected errors are reported to Sentry by default (opt-out available; credentials are never sent)
- **Apache-2.0 license** — free for personal and commercial use

## Install

```bash
npm install nodejs-dna
```

Requires Node.js >= 16.

## Quick start

```js
const DomainNameApi = require('nodejs-dna');

const api = new DomainNameApi('myusername', 'mypassword');

const res = await api.GetResellerDetails();
if (res.result === 'OK') {
  console.log(res.name, res.balance, res.currency);
}
```

The transport is chosen automatically. If your username is a UUID, the library uses the REST API. Otherwise it uses SOAP. See [Transport routing](#transport-routing) below.

**REST transport (UUID username):**

```js
const api = new DomainNameApi('fd2bea54-99ea-16b6-c195-3a1b9079df00', 'your-api-token');
console.log(api.getActiveTransport()); // 'REST'

const domains = await api.CheckAvailability(['hello', 'world'], ['com', 'net'], 1);
```

## Constructor

```js
new DomainNameApi(userName, password, optionsOrTestMode = false)
```

| Parameter            | Type               | Description |
|---------------------|--------------------|-------------|
| `userName`          | string             | API username (regular string → SOAP; UUID format → REST) |
| `password`          | string             | API password or token |
| `optionsOrTestMode` | boolean \| object  | `true` as legacy shorthand for test mode, or an options object |

**Options object:**

```js
{
  testMode:  false,        // true → REST OTE endpoint (ote.domainresellerapi.com)
  telemetry: true,         // false → disable error reporting to Sentry
  sentryDsn: undefined,    // override the default Sentry DSN
}
```

Examples:

```js
// Legacy boolean form — still works
const api = new DomainNameApi('uuid-...', 'token', true);

// Options object — preferred for v3
const api = new DomainNameApi('uuid-...', 'token', { testMode: true, telemetry: false });
```

## Transport routing

Transport is selected once at construction time based on the username:

| Username format | Transport | Endpoint |
|----------------|-----------|----------|
| UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) | REST | `api.domainresellerapi.com/api/v1` |
| Anything else | SOAP | `whmcs.domainnameapi.com/DomainApi.svc` |

```js
api.getActiveTransport(); // → 'REST' or 'SOAP'
```

Both transports expose the same 25 method names through the same facade class. Most methods return the same envelope shape regardless of transport; the few exceptions are listed in the table below.

## Return envelope

Every async method returns a Promise that resolves to one of two shapes.

**Success:**

```js
{ result: 'OK', data: { /* method-specific fields */ } }
```

**Error:**

```js
{
  result: 'ERROR',
  error: {
    Code:    'DOMAIN_DETAILS',   // string error code
    Message: 'Human-readable message',
    Details: 'Additional context'
  }
}
```

Always check `result === 'OK'` before accessing `data`:

```js
const res = await api.GetDetails('example.com');

if (res.result === 'OK') {
  console.log(res.data.DomainName, res.data.Dates.Expiration);
} else {
  console.error(res.error.Code, res.error.Message);
}
```

### Envelope exceptions

A few methods intentionally deviate from the standard shape, matching the php-dna contract exactly:

| Method | Transport | Envelope |
|--------|-----------|---------|
| `GetResellerDetails` | both | `{ result:'OK', id, active, name, balance, currency, symbol, balances }` — flat, no `data` key |
| `GetCurrentBalance` | both | `{ OperationResult:'SUCCESS'\|'FAILED', Balance, CurrencyId, CurrencyName, CurrencySymbol, ... }` — no `result` key |
| `CheckAvailability` | both | Bare **array** of availability objects on success |
| `SaveContacts` | SOAP only | `{ result:'OK' }` — no `data` key (REST returns `{ result:'OK', data:{ contacts:{...} } }`) |
| `CheckTransfer` | SOAP only | `{ result:'OK' }` or `{ result:'ERROR' }` — bare (REST returns a richer `data` object) |
| `ApproveTransfer`, `CancelTransfer`, `RejectTransfer` | both | `{ result:'OK', data:{ DomainName, Status } }` |

## Common examples

These are the most-used methods. All examples use `async/await`.

---

### Check availability

```js
const results = await api.CheckAvailability(['hello', 'world'], ['com', 'net'], 1);

for (const item of results) {
  console.log(item.DomainName + '.' + item.TLD, item.Status, item.Price);
}
// hello.com  notavailable  10.8100
// hello.net  available     9.9900
// world.com  notavailable  10.8100
// world.net  available     9.9900
```

`CheckAvailability` returns a **bare array** (not `{ result, data }`). On error it returns `{ result:'ERROR', error:{...} }`.

---

### Register a domain

```js
const contact = {
  FirstName:        'John',
  LastName:         'Doe',
  Company:          'Example Corp',
  EMail:            'john@example.com',
  AddressLine1:     '123 Main Street',
  City:             'Springfield',
  Country:          'US',
  ZipCode:          '62701',
  State:            'IL',
  Phone:            '5551234567',
  PhoneCountryCode: '1',
  Type:             'Contact',
};

const res = await api.RegisterWithContactInfo(
  'example.com',
  1,
  {
    Administrative: contact,
    Billing:        contact,
    Technical:      contact,
    Registrant:     contact,
  },
  ['ns1.example.com', 'ns2.example.com'],
  true,   // eppLock
  false,  // privacyLock
);

if (res.result === 'OK') {
  console.log(res.data.DomainName, res.data.Dates.Expiration);
}
```

> **Note for `.tr` domains:** pass `additionalAttributes` as the 7th argument:
> ```js
> { TRABISDOMAINCATEGORY: '1', TRABISCITIZIENID: '12345678901', TRABISNAMESURNAME: 'John Doe', TRABISCOUNTRYID: '840', TRABISCITYID: '17' }
> ```

---

### Get domain details

```js
const res = await api.GetDetails('example.com');

if (res.result === 'OK') {
  const d = res.data;
  console.log(d.DomainName, d.Status, d.Dates.Expiration, d.NameServers);
}
```

---

### Get domain list

```js
const res = await api.GetList();

if (res.result === 'OK') {
  console.log(`Total: ${res.TotalCount}`);
  for (const domain of res.data.Domains) {
    console.log(domain.DomainName, domain.Status, domain.Dates.Expiration);
  }
}
```

Pass extra parameters to filter or page:

```js
const res = await api.GetList({ PageNumber: 0, PageSize: 100 });
```

---

### Renew a domain

```js
const res = await api.Renew('example.com', 1);

if (res.result === 'OK') {
  console.log('New expiry:', res.data.ExpirationDate);
}
```

---

### Get and save contacts

```js
// Get contacts
const res = await api.GetContacts('example.com');
if (res.result === 'OK') {
  console.log(res.data.contacts.Registrant);
}

// Save contacts
const contact = {
  FirstName: 'Jane', LastName: 'Doe',
  EMail: 'jane@example.com', AddressLine1: '123 Main St',
  City: 'Springfield', Country: 'US', ZipCode: '62701',
  Phone: '5551234567', PhoneCountryCode: '1', Type: 'Contact',
};

const saveRes = await api.SaveContacts('example.com', {
  Administrative: contact,
  Billing:        contact,
  Technical:      contact,
  Registrant:     contact,
});

if (saveRes.result === 'OK') {
  console.log('Contacts updated');
}
```

> **Transport note:** SOAP `SaveContacts` returns `{ result:'OK' }` with no `data` key. REST returns `{ result:'OK', data:{ contacts:{...} } }`.

---

### Transfer a domain

```js
const res = await api.Transfer('example.com', 'epp-auth-code', 1);

if (res.result === 'OK') {
  console.log(res.data.DomainName, res.data.Status);
}
```

---

### Modify nameservers

```js
const res = await api.ModifyNameServer('example.com', [
  'ns1.yourdns.com',
  'ns2.yourdns.com',
]);

if (res.result === 'OK') {
  console.log(res.data.NameServers);
}
```

## Full method reference

### Domain info

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetDetails` | `(domainName)` | Fetch full details for a domain |
| `SyncFromRegistry` | `(domainName)` | Sync domain info from the registry |
| `GetContacts` | `(domainName)` | Fetch all 4 contacts for a domain |

### Availability and lists

| Method | Signature | Description |
|--------|-----------|-------------|
| `CheckAvailability` | `(domains, extensions, period, command='create')` | Check availability for a cartesian product of names × TLDs; returns a bare array |
| `GetList` | `(extra_parameters={})` | List all domains in the reseller account |
| `GetTldList` | `(count=20)` | Supported TLDs with pricing matrix |

### Registration and lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `RegisterWithContactInfo` | `(domainName, period, contacts, nameServers=[], eppLock=true, privacyLock=false, additionalAttributes=[])` | Register a domain with full contact info |
| `Renew` | `(domainName, period)` | Renew a domain |
| `ModifyPrivacyProtectionStatus` | `(domainName, status, reason='Owner request')` | Enable or disable WHOIS privacy |
| `SyncFromRegistry` | `(domainName)` | Pull latest status from the registry |

### Contacts

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetContacts` | `(domainName)` | Fetch Administrative, Billing, Technical, Registrant contacts |
| `SaveContacts` | `(domainName, contacts)` | Update all contacts for a domain |

### Nameservers

| Method | Signature | Description |
|--------|-----------|-------------|
| `ModifyNameServer` | `(domainName, nameServers)` | Replace the full nameserver set |
| `AddChildNameServer` | `(domainName, nameServer, ipAddress)` | Add a child nameserver (glue record) |
| `DeleteChildNameServer` | `(domainName, nameServer)` | Remove a child nameserver |
| `ModifyChildNameServer` | `(domainName, nameServer, ipAddress)` | Update a child nameserver's IP |

### Transfer

| Method | Signature | Description |
|--------|-----------|-------------|
| `Transfer` | `(domainName, eppCode, period, contacts=[])` | Initiate an incoming transfer |
| `CheckTransfer` | `(domainName, authcode)` | Check transferability with EPP code |
| `ApproveTransfer` | `(domainName)` | Approve a pending outgoing transfer |
| `CancelTransfer` | `(domainName)` | Cancel a pending incoming transfer |
| `RejectTransfer` | `(domainName)` | Reject a pending outgoing transfer |

### Lock management

| Method | Signature | Description |
|--------|-----------|-------------|
| `EnableTheftProtectionLock` | `(domainName)` | Enable EPP/transfer-protection lock |
| `DisableTheftProtectionLock` | `(domainName)` | Disable EPP/transfer-protection lock |

### Account

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetResellerDetails` | `()` | Reseller account info and balances; flat envelope (no `data` key) |
| `GetCurrentBalance` | `(currencyId='USD')` | Current balance for a currency; flat balance envelope (no `result` key) |

### Utilities (synchronous)

These two helpers are **synchronous** — they return a value directly, not a Promise.

| Method | Signature | Description |
|--------|-----------|-------------|
| `ValidateContact` | `(contact)` | Normalize a contact object; fills missing fields with TR-locale defaults and normalizes the phone number. Returns the mutated contact. |
| `IsTrTLD` | `(domain)` | Returns `true` if the domain ends with `.tr`. |

```js
const cleaned = api.ValidateContact({ FirstName: 'Jane', EMail: 'jane@example.com' });
const isTr    = api.IsTrTLD('example.tr'); // true
```

## Error handling

Every API method returns an object — it never throws. Check `result` before accessing `data`:

```js
const res = await api.Renew('example.com', 1);

if (res.result === 'OK') {
  console.log('Renewed until', res.data.ExpirationDate);
} else {
  // res.result === 'ERROR'
  console.error(`[${res.error.Code}] ${res.error.Message}`);
}
```

**Common API error codes** (returned in `error.Code`):

| Code | Meaning |
|------|---------|
| `CREDENTIALS` | Invalid username or password |
| `DOMAIN_DETAILS` | Domain not found or details format invalid |
| `DOMAIN_RENEW` | Renewal failed (domain may not be renewable) |
| `DOMAIN_REGISTER` | Registration failed |
| `DOMAIN_LIST` | Unexpected domain list response |
| `CONTACT_INFO` | Contact information response format error |
| `CONTACT_SAVE` | Contact save failed |
| `API_350` | Insufficient reseller balance |
| `API_310` | TLD not supported |
| `API_301` | IP address not authorized |

Error codes prefixed `API_` carry the numeric code from the domainnameapi.com backend. See the [php-dna error code table](https://github.com/atakdomain/php-dna) for the full list.

## Telemetry and privacy

To help diagnose unexpected API failures, this library reports errors to a Sentry instance by default. This opt-out telemetry is built into the library.

**What is sent:**
- The error message and stack trace
- The HTTP method and endpoint that failed (e.g. `POST domains/renew`)
- Node.js version and library version

**What is never sent:**
- Your password or API token — these are scrubbed from all payloads before transmission
- Domain names and reseller IDs are tagged (filterable) but not included in error grouping keys

**How to opt out:**

```js
// At construction time (preferred)
const api = new DomainNameApi('username', 'password', { telemetry: false });

// Or at any time after construction
api.setErrorReportingEnabled(false);
```

Telemetry transmission always happens in the background and never throws or rejects — disabling it has no effect on the return values of any API method.

## Test mode (OTE)

The REST transport supports a sandbox (OTE) environment:

```js
// Boolean shorthand
const api = new DomainNameApi('uuid-reseller-id', 'token', true);

// Options object
const api = new DomainNameApi('uuid-reseller-id', 'token', { testMode: true });
// → uses https://ote.domainresellerapi.com/api/v1
```

`testMode` applies only to the REST transport. The SOAP transport always connects to the production endpoint.

## Version

```js
DomainNameApi.VERSION  // '3.0.0'
```

## Examples

See the `examples/` folder for a runnable script for each method.

## Contributing

Pull requests are welcome. Please open an issue first to discuss what you would like to change.

Run the test suite:

```bash
node --test test/
```

## License

[Apache License 2.0](./LICENSE) — free to use, modify, distribute, and fork, including for commercial purposes.
