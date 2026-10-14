/**
 * nodejs-dna example — SaveContacts
 * Update the contacts (Administrative, Billing, Technical, Registrant) for a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Credentials: Reseller ID (UUID) + API Key (or set DNA_RESELLER_ID / DNA_API_KEY env vars):
//       new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key')
// NOTE: these are API credentials from your DomainNameAPI panel (API Settings),
//       NOT your panel login credentials.
const resellerId = process.env.DNA_RESELLER_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const apiKey = process.env.DNA_API_KEY || 'your-api-key';

const api = new DomainNameApi(resellerId, apiKey);

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
   * SaveContacts(domainName, contacts)
   * @param {string} domainName  The fully-qualified domain
   * @param {Object} contacts    { Administrative, Billing, Technical, Registrant }
   * @returns {{ result: 'OK'|'ERROR', data?: { contacts: Object } }}
   */
  const result = await api.SaveContacts('example.com', {
    Administrative: contact,
    Billing:        contact,
    Technical:      contact,
    Registrant:     contact,
  });
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    contacts: {
      Administrative: { ID: 98765, FirstName: 'John', LastName: 'Doe', ... },
      Billing:        { ID: 98765, FirstName: 'John', LastName: 'Doe', ... },
      Technical:      { ID: 98765, FirstName: 'John', LastName: 'Doe', ... },
      Registrant:     { ID: 98765, FirstName: 'John', LastName: 'Doe', ... }
    }
  }
}
*/
