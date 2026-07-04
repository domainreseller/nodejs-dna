# nodejs-dna

Node.js client for the [Domain Name API](https://www.domainnameapi.com/) (domainnameapi.com).

A faithful JavaScript port of the [php-dna](https://github.com/atakdomain/php-dna) library, supporting both REST and SOAP transports through a single unified facade with consistent return envelopes.

## Install

```bash
npm install nodejs-dna
```

## Quick start

### SOAP transport (standard username)

```js
const DomainNameApi = require('nodejs-dna');

const api = new DomainNameApi('myusername', 'mypassword');
console.log(api.getActiveTransport()); // 'SOAP'

const res = await api.GetResellerDetails();
if (res.result === 'OK') {
  console.log(res.name, res.balance, res.currency);
}
```

### REST transport (UUID username)

```js
const DomainNameApi = require('nodejs-dna');

const api = new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'api-token');
console.log(api.getActiveTransport()); // 'REST'

const domains = await api.CheckAvailability(['example'], ['com', 'net'], 1);
```

## Constructor

```js
new DomainNameApi(userName, password, testMode = false)
```

| Parameter  | Type    | Description                                          |
|------------|---------|------------------------------------------------------|
| `userName` | string  | API username (SOAP) or reseller ID / UUID (REST)     |
| `password` | string  | API password or token                                |
| `testMode` | boolean | `true` uses the OTE (test) endpoint (REST only)      |

## Transport routing

The transport is selected automatically based on the username format:

- **UUID username** (matches `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) → **REST** transport (`api.domainresellerapi.com`)
- **Any other username** → **SOAP** transport (`whmcs.domainnameapi.com`)

Use `api.getActiveTransport()` to confirm which transport is active — it returns `'REST'` or `'SOAP'`.

## OTE / test mode

```js
const api = new DomainNameApi('uuid-reseller-id', 'token', true);
// REST transport → https://ote.domainresellerapi.com/api/v1
```

`testMode` only affects the REST transport. The SOAP transport always uses the production endpoint regardless of this flag.

## Return envelope

All async methods return a Promise. The standard envelope is:

**Success**
```js
{ result: 'OK', data: { /* method-specific fields */ } }
```

**Error**
```js
{
  result: 'ERROR',
  error: {
    Code:    'DOMAIN_DETAILS',
    Message: 'Human-readable message',
    Details: 'Additional context'
  }
}
```

### Envelope exceptions

A few methods intentionally deviate from the standard shape to match php-dna:

| Method | Transport | Envelope shape |
|--------|-----------|----------------|
| `GetResellerDetails` | both | `{ result:'OK', id, active, name, balance, currency, symbol, balances }` — flat, no `data` key |
| `GetCurrentBalance` | both | `{ OperationResult:'SUCCESS'/'FAILED', Balance, CurrencyId, CurrencyName, CurrencySymbol, ... }` — no `result` key |
| `CheckAvailability` | both | Returns a **bare array** of availability objects on success |
| `SaveContacts` | SOAP | `{ result:'OK' }` — no `data` key (REST returns `data.contacts`) |
| `CheckTransfer` | SOAP | `{ result:'OK' }` or `{ result:'ERROR' }` — bare (REST includes a rich `data` object) |
| `ApproveTransfer`, `CancelTransfer`, `RejectTransfer` | both | `{ result:'OK', data:{ DomainName, Status } }` |

## Handling results

```js
const res = await api.GetDetails('example.com');

if (res.result === 'OK') {
  console.log(res.data);
} else {
  console.error(res.error.Code, res.error.Message);
}
```

`ValidateContact` and `IsTrTLD` are **synchronous** utilities — they return a value directly, not a Promise.

## Method reference

### Domain info

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetDetails` | `(domainName)` | Fetch full details for a domain |
| `SyncFromRegistry` | `(domainName)` | Sync domain info from the registry |
| `GetContacts` | `(domainName)` | Fetch all contacts for a domain |

### Availability & list

| Method | Signature | Description |
|--------|-----------|-------------|
| `CheckAvailability` | `(domains, extensions, period, command='create')` | Check availability for a cartesian product of names × TLDs; returns a bare array on success |
| `GetList` | `(extra_parameters={})` | List all domains in the reseller account |
| `GetTldList` | `(count=20)` | Get supported TLDs with pricing matrix |

### Contacts

| Method | Signature | Description |
|--------|-----------|-------------|
| `SaveContacts` | `(domainName, contacts)` | Update contacts for a domain |

### Nameservers

| Method | Signature | Description |
|--------|-----------|-------------|
| `ModifyNameServer` | `(domainName, nameServers)` | Replace the full nameserver set for a domain |
| `AddChildNameServer` | `(domainName, nameServer, ipAddress)` | Add a child nameserver |
| `DeleteChildNameServer` | `(domainName, nameServer)` | Remove a child nameserver |
| `ModifyChildNameServer` | `(domainName, nameServer, ipAddress)` | Update a child nameserver's IP address |

### Transfer

| Method | Signature | Description |
|--------|-----------|-------------|
| `Transfer` | `(domainName, eppCode, period, contacts=[])` | Initiate a domain transfer |
| `CheckTransfer` | `(domainName, authcode)` | Check domain transferability with EPP code |
| `ApproveTransfer` | `(domainName)` | Approve a pending outgoing transfer |
| `CancelTransfer` | `(domainName)` | Cancel a pending incoming transfer |
| `RejectTransfer` | `(domainName)` | Reject a pending outgoing transfer |

### Registration & lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `RegisterWithContactInfo` | `(domainName, period, contacts, nameServers=[], eppLock=true, privacyLock=false, additionalAttributes=[])` | Register a domain with full contact info |
| `Renew` | `(domainName, period)` | Renew a domain registration |
| `ModifyPrivacyProtectionStatus` | `(domainName, status, reason='Owner request')` | Enable or disable privacy protection |

### Lock management

| Method | Signature | Description |
|--------|-----------|-------------|
| `EnableTheftProtectionLock` | `(domainName)` | Enable EPP/theft-protection lock |
| `DisableTheftProtectionLock` | `(domainName)` | Disable EPP/theft-protection lock |

### Account

| Method | Signature | Description |
|--------|-----------|-------------|
| `GetResellerDetails` | `()` | Fetch reseller account info and balances; flat envelope (no `data` key) |
| `GetCurrentBalance` | `(currencyId='USD')` | Get current balance for a currency; flat balance envelope (no `result` key) |

### Utilities

| Method | Signature | Description |
|--------|-----------|-------------|
| `ValidateContact` | `(contact)` | Normalize a contact object, filling missing fields with TR-locale defaults. **Synchronous.** |
| `IsTrTLD` | `(domain)` | Return `true` if the domain ends with `.tr`. **Synchronous.** |

## Version

```js
DomainNameApi.VERSION  // '3.0.0'
```

## License

This project is licensed under the [Apache License 2.0](./LICENSE). You are free to use, modify, distribute, and fork it, including for commercial purposes.
