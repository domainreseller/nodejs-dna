/**
 * nodejs-dna example — RegisterWithContactInfo (Turkish .tr domains)
 * Register a new .tr domain with TRABIS-required additional attributes.
 *
 * Country and City IDs can be looked up at https://trabis.domainnameapi.com/#countryList
 * For individual registrants use TRABISDOMAINCATEGORY=1 (with citizen ID + name).
 * For commercial registrants use TRABISDOMAINCATEGORY=0 (with org + tax info).
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

const contact = {
  FirstName:        'Ahmet',
  LastName:         'Yilmaz',
  Company:          '',
  EMail:            'ahmet.yilmaz@example.com',
  AddressLine1:     'Ornek Sokak No: 123',
  AddressLine2:     'Daire 4',
  AddressLine3:     '',
  City:             'Istanbul',
  Country:          'TR',
  Fax:              '2121234567',
  FaxCountryCode:   '90',
  Phone:            '5551234567',
  PhoneCountryCode: '90',
  Type:             'Contact',
  ZipCode:          '34000',
  State:            'Istanbul',
};

// Individual (natural person) registrant attributes — TRABISDOMAINCATEGORY: 1
const individualAttributes = {
  TRABISDOMAINCATEGORY: 1,
  TRABISCITIZIENID:     '11111111111',
  TRABISNAMESURNAME:    'Ahmet Yilmaz',
  TRABISCOUNTRYID:      '215',
  TRABISCITYID:         '34',
  TRABISCOUNTRYNAME:    'Türkiye',
  TRABISCITYNAME:       'Istanbul',
};

// Commercial (legal entity) registrant attributes — TRABISDOMAINCATEGORY: 0
// const commercialAttributes = {
//   TRABISDOMAINCATEGORY: 0,
//   TRABISORGANIZATION:   'Example Ltd. Sti.',
//   TRABISTAXOFFICE:      'Istanbul VD',
//   TRABISTAXNUMBER:      '1234567890',
//   TRABISCOUNTRYID:      '215',
//   TRABISCITYID:         '34',
//   TRABISCOUNTRYNAME:    'Türkiye',
//   TRABISCITYNAME:       'Istanbul',
// };

async function main() {
  /**
   * RegisterWithContactInfo(domainName, period, contacts, nameServers, eppLock, privacyLock, additionalAttributes)
   * @param {string}        domainName
   * @param {number}        period
   * @param {Object}        contacts             { Administrative, Billing, Technical, Registrant }
   * @param {string[]}      [nameServers=[]]
   * @param {boolean}       [eppLock=true]
   * @param {boolean}       [privacyLock=false]
   * @param {Object}        additionalAttributes  TRABIS attributes (required for .tr)
   * @returns {{ result: 'OK'|'ERROR', data?: {...domain info...} }}
   */
  const result = await api.RegisterWithContactInfo(
    'example.com.tr',
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
    individualAttributes,
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
    Status:                  'active',
    DomainName:              'example.com.tr',
    AuthCode:                '',
    LockStatus:              'true',
    PrivacyProtectionStatus: 'false',
    IsChildNameServer:       'false',
    Contacts: {
      Billing:        { ID: 11965589 },
      Technical:      { ID: 11965589 },
      Administrative: { ID: 11965589 },
      Registrant:     { ID: 11965589 }
    },
    Dates: {
      Start:         '2023-03-04T00:00:00',
      Expiration:    '2024-03-03T00:00:00',
      RemainingDays: 0
    },
    NameServers:      [ 'ns1.example.com', 'ns2.example.com' ],
    Additional:       [],
    ChildNameServers: []
  }
}
*/
