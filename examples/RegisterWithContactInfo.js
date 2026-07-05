/**
 * nodejs-dna example — RegisterWithContactInfo
 * Register a new domain with full contact information and nameservers.
 * NOTE: For .tr domain registration, see RegisterWithContactInfo-TR.js instead.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

const contact = {
  FirstName:        'John',
  LastName:         'Doe',
  Company:          'Example Corp',
  EMail:            'john.doe@example.com',
  AddressLine1:     '123 Main Street',
  AddressLine2:     'Suite 100',
  AddressLine3:     '',
  City:             'Los Angeles',
  Country:          'US',
  Fax:              '5559876543',
  FaxCountryCode:   '1',
  Phone:            '5551234567',
  PhoneCountryCode: '1',
  Type:             'Contact',
  ZipCode:          '90001',
  State:            'California',
};

async function main() {
  /**
   * RegisterWithContactInfo(domainName, period, contacts, nameServers, eppLock, privacyLock, additionalAttributes)
   * @param {string}        domainName
   * @param {number}        period               Registration period in years
   * @param {Object}        contacts             { Administrative, Billing, Technical, Registrant }
   * @param {string[]}      [nameServers=[]]     Desired nameservers (empty → default API nameservers)
   * @param {boolean}       [eppLock=true]       Enable EPP/theft-protection lock
   * @param {boolean}       [privacyLock=false]  Enable WHOIS privacy protection
   * @param {Object|Array}  [additionalAttributes=[]]  TLD-specific attributes
   * @returns {{ result: 'OK'|'ERROR', data?: {...domain info...} }}
   */
  const result = await api.RegisterWithContactInfo(
    'example.com',
    1,
    {
      Administrative: contact,
      Billing:        contact,
      Technical:      contact,
      Registrant:     contact,
    },
    ['ns1.example.com', 'ns2.example.com'],
    true,
    false,
  );
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    ID:                      0,
    Status:                  'clientTransferProhibited',
    DomainName:              'example.com',
    AuthCode:                'E!m5b3}R6Qq=Wc/9',
    LockStatus:              'true',
    PrivacyProtectionStatus: 'false',
    IsChildNameServer:       'false',
    Contacts: {
      Billing:        { ID: 0 },
      Technical:      { ID: 0 },
      Administrative: { ID: 0 },
      Registrant:     { ID: 0 }
    },
    Dates: {
      Start:         '2023-03-04T15:45:33',
      Expiration:    '2024-03-04T15:45:33',
      RemainingDays: 0
    },
    NameServers:      [ 'ns1.example.com', 'ns2.example.com' ],
    Additional:       [],
    ChildNameServers: []
  }
}
*/
