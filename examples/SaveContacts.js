/**
 * nodejs-dna example — SaveContacts
 * Update the contacts (Administrative, Billing, Technical, Registrant) for a domain.
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
   * SaveContacts(domainName, contacts)
   * @param {string} domainName  The fully-qualified domain
   * @param {Object} contacts    { Administrative, Billing, Technical, Registrant }
   * @returns {{ result: 'OK'|'ERROR' }}
   *   NOTE: SOAP transport returns {result:'OK'} with no data key.
   *         REST transport returns {result:'OK', data:{contacts:{...}}}.
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
Sample output (SOAP transport):
{ result: 'OK' }

Sample output (REST transport):
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
