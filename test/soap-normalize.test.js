'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const { parseSoapDomainInfo, parseSoapContactInfo } = require('../src/soap-normalize');

// ---------------------------------------------------------------------------
// Canned SOAP data fixtures
// ---------------------------------------------------------------------------

const SOAP_DOMAIN = {
  Id: 12345,
  Status: 'Active',
  DomainName: 'example.com',
  Auth: 'epp-code-123',
  LockStatus: true,
  PrivacyProtectionStatus: false,
  IsChildNameServer: false,
  AdministrativeContactId: 100,
  BillingContactId: 101,
  TechnicalContactId: 102,
  RegistrantContactId: 103,
  StartDate: '2020-01-01T00:00:00',
  ExpirationDate: '2030-01-01T00:00:00',
  RemainingDay: 365,
  NameServerList: {
    NameServer: ['ns1.example.com', 'ns2.example.com'],
  },
  AdditionalAttributes: {
    KeyValueOfstringstring: [
      { Key: 'TRABISDOMAINCATEGORY', Value: 'Owner' },
    ],
  },
  ChildNameServerInfo: {
    ChildNameServerInfo: [
      {
        ChildNameServer: 'ns1.example.com',
        IpAddress: { string: '1.2.3.4' },
      },
    ],
  },
};

const SOAP_CONTACT = {
  Id: 200,
  Status: 'Active',
  Auth: 'contact-auth-123',
  FirstName: 'John',
  LastName: 'Doe',
  Company: 'ACME Corp',
  EMail: 'john@example.com',
  Type: 'Contact',
  AddressLine1: '123 Main St',
  AddressLine2: 'Suite 100',
  AddressLine3: '',
  State: 'CA',
  City: 'Los Angeles',
  Country: 'US',
  ZipCode: '90001',
  Phone: '5551234567',
  PhoneCountryCode: '1',
  Fax: '5559876543',
  FaxCountryCode: '1',
  AdditionalAttributes: {
    KeyValueOfstringstring: [
      { Key: 'customKey', Value: 'customValue' },
    ],
  },
};

// ---------------------------------------------------------------------------
// parseSoapDomainInfo — top-level envelope
// ---------------------------------------------------------------------------

test('parseSoapDomainInfo returns {result:OK, data:{...}} envelope', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.result, 'OK');
  assert.ok(out.data && typeof out.data === 'object');
});

test('parseSoapDomainInfo maps Id → data.ID as integer', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.ID, 12345);
});

test('parseSoapDomainInfo maps Status → data.Status via normalizeDomainStatus', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.Status, 'Active');
  // numeric SOAP status should also normalize
  const outNumeric = parseSoapDomainInfo({ ...SOAP_DOMAIN, Status: 7 });
  assert.strictEqual(outNumeric.data.Status, 'PendingDelete');
});

test('parseSoapDomainInfo maps DomainName → data.DomainName', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.DomainName, 'example.com');
});

test('parseSoapDomainInfo maps Auth → data.AuthCode', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.AuthCode, 'epp-code-123');
});

test('parseSoapDomainInfo maps LockStatus bool → "true"/"false" string', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.LockStatus, 'true');
  const out2 = parseSoapDomainInfo({ ...SOAP_DOMAIN, LockStatus: false });
  assert.strictEqual(out2.data.LockStatus, 'false');
});

test('parseSoapDomainInfo maps PrivacyProtectionStatus bool → "true"/"false" string', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.PrivacyProtectionStatus, 'false');
  const out2 = parseSoapDomainInfo({ ...SOAP_DOMAIN, PrivacyProtectionStatus: true });
  assert.strictEqual(out2.data.PrivacyProtectionStatus, 'true');
});

test('parseSoapDomainInfo maps IsChildNameServer bool → "true"/"false" string', () => {
  const out = parseSoapDomainInfo(SOAP_DOMAIN);
  assert.strictEqual(out.data.IsChildNameServer, 'false');
  const out2 = parseSoapDomainInfo({ ...SOAP_DOMAIN, IsChildNameServer: true });
  assert.strictEqual(out2.data.IsChildNameServer, 'true');
});

test('parseSoapDomainInfo maps *ContactId → Contacts.*.ID', () => {
  const { Contacts } = parseSoapDomainInfo(SOAP_DOMAIN).data;
  assert.strictEqual(Contacts.Administrative.ID, 100);
  assert.strictEqual(Contacts.Billing.ID, 101);
  assert.strictEqual(Contacts.Technical.ID, 102);
  assert.strictEqual(Contacts.Registrant.ID, 103);
});

test('parseSoapDomainInfo maps StartDate/ExpirationDate/RemainingDay → Dates.*', () => {
  const { Dates } = parseSoapDomainInfo(SOAP_DOMAIN).data;
  assert.ok(Dates.Start.includes('2020'));
  assert.ok(Dates.Expiration.includes('2030'));
  assert.strictEqual(Dates.RemainingDays, 365);
});

test('parseSoapDomainInfo maps NameServerList.NameServer array → NameServers', () => {
  const { NameServers } = parseSoapDomainInfo(SOAP_DOMAIN).data;
  assert.deepStrictEqual(NameServers, ['ns1.example.com', 'ns2.example.com']);
});

test('parseSoapDomainInfo maps NameServerList.NameServer single string → NameServers', () => {
  const d = { ...SOAP_DOMAIN, NameServerList: { NameServer: 'ns1.example.com' } };
  const { NameServers } = parseSoapDomainInfo(d).data;
  assert.deepStrictEqual(NameServers, ['ns1.example.com']);
});

test('parseSoapDomainInfo maps AdditionalAttributes.KeyValueOfstringstring → Additional', () => {
  const { Additional } = parseSoapDomainInfo(SOAP_DOMAIN).data;
  assert.strictEqual(Additional.TRABISDOMAINCATEGORY, 'Owner');
});

test('parseSoapDomainInfo maps ChildNameServerInfo → ChildNameServers [{ns,ip}]', () => {
  const { ChildNameServers } = parseSoapDomainInfo(SOAP_DOMAIN).data;
  assert.strictEqual(ChildNameServers.length, 1);
  assert.strictEqual(ChildNameServers[0].ns, 'ns1.example.com');
  assert.strictEqual(ChildNameServers[0].ip, '1.2.3.4');
});

test('parseSoapDomainInfo handles IpAddress.string array (PHP last-ip bug replication)', () => {
  const d = {
    ...SOAP_DOMAIN,
    ChildNameServerInfo: {
      ChildNameServerInfo: [
        {
          ChildNameServer: 'ns1.example.com',
          IpAddress: { string: ['1.1.1.1', '2.2.2.2'] },
        },
      ],
    },
  };
  const { ChildNameServers } = parseSoapDomainInfo(d).data;
  // PHP overwrites each iteration → last IP wins
  assert.strictEqual(ChildNameServers[0].ip, '2.2.2.2');
});

test('parseSoapDomainInfo returns ERROR envelope on null input', () => {
  const out = parseSoapDomainInfo(null);
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error && out.error.Code);
});

test('parseSoapDomainInfo returns ERROR envelope on empty object', () => {
  const out = parseSoapDomainInfo({});
  assert.strictEqual(out.result, 'ERROR');
});

test('parseSoapDomainInfo Contacts default to ID:0 when absent', () => {
  const d = { Id: 1, Status: 'Active', DomainName: 'x.com' };
  const { Contacts } = parseSoapDomainInfo(d).data;
  assert.strictEqual(Contacts.Administrative.ID, 0);
  assert.strictEqual(Contacts.Billing.ID, 0);
  assert.strictEqual(Contacts.Technical.ID, 0);
  assert.strictEqual(Contacts.Registrant.ID, 0);
});

test('parseSoapDomainInfo NameServers defaults to [] when absent', () => {
  const d = { Id: 1, Status: 'Active', DomainName: 'x.com' };
  const { NameServers } = parseSoapDomainInfo(d).data;
  assert.deepStrictEqual(NameServers, []);
});

test('parseSoapDomainInfo ChildNameServers defaults to [] when absent', () => {
  const d = { Id: 1, Status: 'Active', DomainName: 'x.com' };
  const { ChildNameServers } = parseSoapDomainInfo(d).data;
  assert.deepStrictEqual(ChildNameServers, []);
});

test('parseSoapDomainInfo Additional defaults to [] when absent', () => {
  const d = { Id: 1, Status: 'Active', DomainName: 'x.com' };
  const { Additional } = parseSoapDomainInfo(d).data;
  assert.deepStrictEqual(Additional, []);
});

test('parseSoapDomainInfo derives RemainingDays from ExpirationDate if RemainingDay absent', () => {
  // Use a date far in the future
  const d = { Id: 1, Status: 'Active', DomainName: 'x.com', ExpirationDate: '2099-01-01T00:00:00' };
  const { Dates } = parseSoapDomainInfo(d).data;
  assert.ok(Dates.RemainingDays > 0, 'RemainingDays should be positive for future expiry');
});

// ---------------------------------------------------------------------------
// parseSoapDomainInfo output shape matches parseDomainInfo shape (key names)
// ---------------------------------------------------------------------------

test('parseSoapDomainInfo data keys match REST parseDomainInfo data keys', () => {
  const restN = require('../src/rest-normalize');
  const restOut = restN.parseDomainInfo({
    id: 1, status: 0, domainName: 'x.com', nameservers: [], contacts: [],
  });
  const soapOut = parseSoapDomainInfo({ Id: 1, Status: 'Active', DomainName: 'x.com' });
  const restKeys = Object.keys(restOut.data).sort();
  const soapKeys = Object.keys(soapOut.data).sort();
  assert.deepStrictEqual(soapKeys, restKeys);
});

// ---------------------------------------------------------------------------
// parseSoapContactInfo
// ---------------------------------------------------------------------------

test('parseSoapContactInfo maps Id → ID', () => {
  const out = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(out.ID, 200);
});

test('parseSoapContactInfo maps Status → Status', () => {
  const out = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(out.Status, 'Active');
});

test('parseSoapContactInfo maps Auth → AuthCode', () => {
  const out = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(out.AuthCode, 'contact-auth-123');
});

test('parseSoapContactInfo maps FirstName, LastName, Company, EMail, Type', () => {
  const out = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(out.FirstName, 'John');
  assert.strictEqual(out.LastName, 'Doe');
  assert.strictEqual(out.Company, 'ACME Corp');
  assert.strictEqual(out.EMail, 'john@example.com');
  assert.strictEqual(out.Type, 'Contact');
});

test('parseSoapContactInfo maps AddressLine1/2/3, State, City, Country, ZipCode → Address.*', () => {
  const { Address } = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(Address.Line1, '123 Main St');
  assert.strictEqual(Address.Line2, 'Suite 100');
  assert.strictEqual(Address.Line3, '');
  assert.strictEqual(Address.State, 'CA');
  assert.strictEqual(Address.City, 'Los Angeles');
  assert.strictEqual(Address.Country, 'US');
  assert.strictEqual(Address.ZipCode, '90001');
});

test('parseSoapContactInfo maps Phone/PhoneCountryCode, Fax/FaxCountryCode → Phone.*', () => {
  const { Phone } = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(Phone.Phone.Number, '5551234567');
  assert.strictEqual(Phone.Phone.CountryCode, '1');
  assert.strictEqual(Phone.Fax.Number, '5559876543');
  assert.strictEqual(Phone.Fax.CountryCode, '1');
});

test('parseSoapContactInfo maps AdditionalAttributes.KeyValueOfstringstring → Additional', () => {
  const out = parseSoapContactInfo(SOAP_CONTACT);
  assert.strictEqual(out.Additional.customKey, 'customValue');
});

test('parseSoapContactInfo returns {} on null input', () => {
  const out = parseSoapContactInfo(null);
  assert.deepStrictEqual(out, {});
});

test('parseSoapContactInfo returns {} on empty object', () => {
  const out = parseSoapContactInfo({});
  assert.deepStrictEqual(out, {});
});

test('parseSoapContactInfo ID defaults to empty string when Id missing or non-numeric', () => {
  const out = parseSoapContactInfo({ Status: 'Active', FirstName: 'John' });
  assert.strictEqual(out.ID, '');
  const out2 = parseSoapContactInfo({ Id: 'notanumber', Status: 'Active' });
  assert.strictEqual(out2.ID, '');
});

test('parseSoapContactInfo Additional defaults to [] when absent', () => {
  const out = parseSoapContactInfo({ Id: 1, Status: 'Active' });
  assert.deepStrictEqual(out.Additional, []);
});

// ---------------------------------------------------------------------------
// parseSoapContactInfo output shape matches REST parseContactInfo shape
// ---------------------------------------------------------------------------

test('parseSoapContactInfo output keys match REST parseContactInfo keys', () => {
  const restN = require('../src/rest-normalize');
  const restOut = restN.parseContactInfo({
    handle: 1, status: 'Active', firstName: 'A', lastName: 'B',
    eMail: 'a@b.com', phone: '123',
  });
  const soapOut = parseSoapContactInfo(SOAP_CONTACT);
  const restKeys = Object.keys(restOut).sort();
  const soapKeys = Object.keys(soapOut).sort();
  assert.deepStrictEqual(soapKeys, restKeys);
});
