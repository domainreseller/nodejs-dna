# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.0.0] - 2026-07-04

### Added

- Dual REST+SOAP transport with automatic routing: a UUID-formatted username routes to the REST transport (`api.domainresellerapi.com`); any other username routes to SOAP (`whmcs.domainnameapi.com`).
- `getActiveTransport()` method on the facade, returning `'REST'` or `'SOAP'`.
- Six new methods ported from php-dna:
  - `ModifyNameServer(domainName, nameServers)` — replace the full nameserver set for a domain.
  - `EnableTheftProtectionLock(domainName)` — enable EPP/theft-protection lock.
  - `DisableTheftProtectionLock(domainName)` — disable EPP/theft-protection lock.
  - `CheckTransfer(domainName, authcode)` — check domain transferability with EPP code.
  - `ValidateContact(contact)` — synchronous utility: normalize a contact object with TR-locale defaults.
  - `IsTrTLD(domain)` — synchronous utility: return `true` if a domain ends with `.tr`.
- Plain CJS module structure mirroring php-dna: `DomainNameApi` facade + `DNARest` + `DNASoap` + `shared` + normalize helpers (`rest-normalize`, `soap-normalize`). No TypeScript compilation step required.
- OTE (test environment) endpoint support for the REST transport via `testMode = true`.

### Changed (BREAKING)

- **Return envelope**: changed from the legacy `{ result: true/false, ... }` shape (v1.x) to the php-dna-compatible envelope `{ result: 'OK', data: {...} }` on success and `{ result: 'ERROR', error: { Code, Message, Details } }` on failure. See README for the small set of methods that use a distinct envelope shape.
- **License**: clarified to Apache-2.0 (was unspecified in earlier releases).

### Transport differences (intentional)

Two methods diverge between transports, faithfully matching their respective PHP source implementations:

- `SaveContacts`: SOAP returns `{ result: 'OK' }` with no `data` key; REST returns `{ result: 'OK', data: { contacts: {...} } }`.
- `CheckTransfer`: SOAP returns bare `{ result: 'OK' }` or `{ result: 'ERROR' }`; REST returns a richer envelope including `data.TransferAvailabilityStatus` and related fields.
