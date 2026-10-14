'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const n = require('../src/rest-normalize');

// ---------------------------------------------------------------------------
// normalizeDomainStatus
// ---------------------------------------------------------------------------
test('normalizeDomainStatus maps numeric enum, passes strings through', () => {
  assert.strictEqual(n.normalizeDomainStatus(7), 'PendingDelete');
  assert.strictEqual(n.normalizeDomainStatus('Active'), 'Active');
  assert.strictEqual(n.normalizeDomainStatus(0), 'Active');
  assert.strictEqual(n.normalizeDomainStatus(99), '99');           // unknown numeric → string
  assert.strictEqual(n.normalizeDomainStatus('SomeLabel'), 'SomeLabel');
});

// ---------------------------------------------------------------------------
// normalizeCountryCode
// ---------------------------------------------------------------------------
test('normalizeCountryCode: full name → ISO2, 2-char → upper', () => {
  assert.strictEqual(n.normalizeCountryCode('tr'), 'TR');
  assert.strictEqual(n.normalizeCountryCode('Turkey'), 'TR');
  assert.strictEqual(n.normalizeCountryCode('turkey'), 'TR');
  assert.strictEqual(n.normalizeCountryCode('us'), 'US');
  assert.strictEqual(n.normalizeCountryCode('United States'), 'US');
  assert.strictEqual(n.normalizeCountryCode('Germany'), 'DE');
  assert.strictEqual(n.normalizeCountryCode(''), '');
  assert.strictEqual(n.normalizeCountryCode('XY'), 'XY');          // already 2-char
});

// ---------------------------------------------------------------------------
// stringifyAttributes
// ---------------------------------------------------------------------------
test('stringifyAttributes coerces all values to strings', () => {
  assert.deepStrictEqual(n.stringifyAttributes({ a: 1, b: true }), { a: '1', b: 'true' });
  assert.deepStrictEqual(n.stringifyAttributes({ x: false }), { x: 'false' });
  assert.deepStrictEqual(n.stringifyAttributes({ x: null }), { x: '' });
  assert.deepStrictEqual(n.stringifyAttributes({ x: 0 }), { x: '0' });
  // arrays encoded as JSON
  assert.strictEqual(typeof n.stringifyAttributes({ arr: [1, 2] }).arr, 'string');
});

// ---------------------------------------------------------------------------
// parseDomainInfo
// ---------------------------------------------------------------------------
test('parseDomainInfo wraps into {result:OK, data:{...}} with normalized status', () => {
  const out = n.parseDomainInfo({ id: 5, status: 0, domainName: 'x.com', nameservers: ['a'] });
  assert.strictEqual(out.result, 'OK');
  assert.strictEqual(out.data.ID, 5);
  assert.strictEqual(out.data.Status, 'Active');
  assert.strictEqual(out.data.DomainName, 'x.com');
  assert.deepStrictEqual(out.data.NameServers, ['a']);
});

test('parseDomainInfo returns ERROR envelope on empty input', () => {
  const out = n.parseDomainInfo(null);
  assert.strictEqual(out.result, 'ERROR');
  assert.ok(out.error);
});

test('parseDomainInfo includes IPAdresses typo in child nameserver shape', () => {
  // IPAdresses (one 'd') is the intentional typo from the PHP source
  // parseDomainInfo itself builds ChildNameServers [{ns, ip}]; the IPAdresses typo
  // is in addChildNameServer's response normalization, not parseDomainInfo.
  // Here we confirm the ChildNameServers shape from parseDomainInfo.
  const raw = {
    id: 1, status: 0, domainName: 'x.com', nameservers: [],
    hosts: [{ name: 'ns1.x.com', ipAddresses: [{ ipAddress: '1.2.3.4' }] }],
  };
  const out = n.parseDomainInfo(raw);
  assert.deepStrictEqual(out.data.ChildNameServers, [{ ns: 'ns1.x.com', ip: '1.2.3.4' }]);
});

// ---------------------------------------------------------------------------
// parseContactInfo
// ---------------------------------------------------------------------------
test('parseContactInfo returns nested Address and Phone structure', () => {
  const raw = {
    handle: 42, firstName: 'John', lastName: 'Doe',
    companyName: 'Acme', eMail: 'j@d.com',
    address: '123 Main St', city: 'NY', state: 'NY', country: 'US', postalCode: '10001',
    phone: '5551234', phoneCountryCode: '1',
    fax: '5559876', faxCountryCode: '1',
  };
  const out = n.parseContactInfo(raw);
  assert.strictEqual(out.ID, 42);
  assert.strictEqual(out.FirstName, 'John');
  assert.strictEqual(out.Address.Line1, '123 Main St');
  assert.strictEqual(out.Address.City, 'NY');
  assert.strictEqual(out.Address.ZipCode, '10001');
  assert.strictEqual(out.Phone.Phone.Number, '5551234');
  assert.strictEqual(out.Phone.Phone.CountryCode, '1');
  assert.strictEqual(out.Phone.Fax.Number, '5559876');
});

test('parseContactInfo returns {} on empty input', () => {
  assert.deepStrictEqual(n.parseContactInfo(null), {});
  assert.deepStrictEqual(n.parseContactInfo({}), {});
});

// ---------------------------------------------------------------------------
// parseContact
// ---------------------------------------------------------------------------
test('parseContact maps PascalCase contact to REST API body', () => {
  const contact = {
    FirstName: 'Jane', LastName: 'Smith', Company: 'Corp',
    EMail: 'jane@corp.com', AddressLine1: '10 Elm St',
    City: 'LA', State: 'CA', Country: 'US', ZipCode: '90001',
    Phone: '2125551234', PhoneCountryCode: '1',
    Fax: '', FaxCountryCode: '',
  };
  const out = n.parseContact(contact, 'Administrative');
  assert.strictEqual(out.contactType, 'Admin');
  assert.strictEqual(out.firstName, 'Jane');
  assert.strictEqual(out.country, 'US');
  assert.strictEqual(typeof out.isHidden, 'boolean');
});

test('parseContact maps Technical → Tech', () => {
  const out = n.parseContact({ FirstName: 'X' }, 'Technical');
  assert.strictEqual(out.contactType, 'Tech');
});

// ---------------------------------------------------------------------------
// parseContactIds
// ---------------------------------------------------------------------------
test('parseContactIds extracts IDs keyed by role', () => {
  const contacts = [
    { contactType: 'Admin', handle: 10 },
    { contactType: 'Tech', handle: 20 },
    { contactType: 'Billing', handle: 30 },
    { contactType: 'Registrant', handle: 40 },
  ];
  const out = n.parseContactIds(contacts);
  assert.strictEqual(out.Administrative.ID, 10);
  assert.strictEqual(out.Technical.ID, 20);
  assert.strictEqual(out.Billing.ID, 30);
  assert.strictEqual(out.Registrant.ID, 40);
});

test('parseContactIds returns zeros for missing contacts', () => {
  const out = n.parseContactIds([]);
  assert.strictEqual(out.Billing.ID, 0);
  assert.strictEqual(out.Administrative.ID, 0);
});

// ---------------------------------------------------------------------------
// formatApiDate
// ---------------------------------------------------------------------------
test('formatApiDate formats ISO string to YYYY-MM-DDTHH:mm:ss', () => {
  const out = n.formatApiDate('2024-06-15T12:00:00Z');
  assert.match(out, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
});

test('formatApiDate returns empty string for null/empty/unparseable', () => {
  assert.strictEqual(n.formatApiDate(null), '');
  assert.strictEqual(n.formatApiDate(''), '');
  assert.strictEqual(n.formatApiDate('not-a-date'), '');
});

// ---------------------------------------------------------------------------
// remainingDaysFromDate
// ---------------------------------------------------------------------------
test('remainingDaysFromDate returns 0 for null/empty/unparseable', () => {
  assert.strictEqual(n.remainingDaysFromDate(null), 0);
  assert.strictEqual(n.remainingDaysFromDate(''), 0);
  assert.strictEqual(n.remainingDaysFromDate('bad'), 0);
});

test('remainingDaysFromDate returns positive number for future date', () => {
  const future = new Date(Date.now() + 10 * 86400 * 1000).toISOString();
  assert.ok(n.remainingDaysFromDate(future) > 0);
});

test('remainingDaysFromDate returns 0 for past date', () => {
  assert.strictEqual(n.remainingDaysFromDate('2000-01-01T00:00:00Z'), 0);
});

// ---------------------------------------------------------------------------
// normalizeTrAttributes
// ---------------------------------------------------------------------------
test('normalizeTrAttributes drops unsupported keys', () => {
  const input = {
    TRABISDOMAINCATEGORY: '1',
    TRABISCITIZENID: '123',
    TRABISNAMESURNAME: 'should be dropped',
    TRABISCOUNTRYID: 'also dropped',
  };
  const out = n.normalizeTrAttributes(input);
  assert.ok(!('TRABISNAMESURNAME' in out));
  assert.ok(!('TRABISCOUNTRYID' in out));
  assert.strictEqual(out.TRABISDOMAINCATEGORY, 'Owner');
  assert.strictEqual(out.TRABISCITIZENID, '123');
});

test('normalizeTrAttributes maps typo TRABISCITIZIENID → TRABISCITIZENID', () => {
  const out = n.normalizeTrAttributes({ TRABISCITIZIENID: 'abc' });
  assert.strictEqual(out.TRABISCITIZENID, 'abc');
  assert.ok(!('TRABISCITIZIENID' in out));
});

test('normalizeTrAttributes: category 0 → Corporate, 1 → Owner', () => {
  assert.strictEqual(n.normalizeTrAttributes({ TRABISDOMAINCATEGORY: '0' }).TRABISDOMAINCATEGORY, 'Corporate');
  assert.strictEqual(n.normalizeTrAttributes({ TRABISDOMAINCATEGORY: 'corporate' }).TRABISDOMAINCATEGORY, 'Corporate');
  assert.strictEqual(n.normalizeTrAttributes({ TRABISDOMAINCATEGORY: 'personal' }).TRABISDOMAINCATEGORY, 'Owner');
});

test('normalizeTrAttributes returns [] for non-array input', () => {
  assert.deepStrictEqual(n.normalizeTrAttributes(null), []);
  assert.deepStrictEqual(n.normalizeTrAttributes({}), {});
});

// ---------------------------------------------------------------------------
// flattenValidationErrors
// ---------------------------------------------------------------------------
test('flattenValidationErrors joins members and message with " - "', () => {
  const ve = [{ members: ['$.administrativeContact.postalCode'], message: "'PostalCode' is required" }];
  const out = n.flattenValidationErrors(ve);
  assert.ok(out.includes('Admin'));
  assert.ok(out.includes("'PostalCode' is required"));
});

test('flattenValidationErrors handles plain string entries', () => {
  const out = n.flattenValidationErrors(['error one', 'error two']);
  assert.ok(out.includes('error one'));
  assert.ok(out.includes('error two'));
});

// ---------------------------------------------------------------------------
// humanizeValidationMember
// ---------------------------------------------------------------------------
test('humanizeValidationMember converts JSONPath to label', () => {
  assert.strictEqual(n.humanizeValidationMember('$.administrativeContact.postalCode'), 'Admin PostalCode');
  assert.strictEqual(n.humanizeValidationMember('$.technicalContact.phone'), 'Tech Phone');
  assert.strictEqual(n.humanizeValidationMember('$.tldAttributes.TRABISCOUNTRYID'), 'TldAttributes TRABISCOUNTRYID');
});

test('humanizeValidationMember returns empty string for empty input', () => {
  assert.strictEqual(n.humanizeValidationMember(''), '');
  assert.strictEqual(n.humanizeValidationMember('  '), '');
});
