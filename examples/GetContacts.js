/**
 * nodejs-dna example — GetContacts
 * Retrieve the Administrative, Billing, Technical, and Registrant contacts for a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * GetContacts(domainName)
   * @param {string} domainName  The fully-qualified domain (e.g. 'example.com')
   * @returns {{ result: 'OK'|'ERROR', data?: { contacts: { Administrative, Billing, Registrant, Technical } } }}
   */
  const result = await api.GetContacts('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    contacts: {
      Administrative: {
        ID:               98765,
        FirstName:        'John',
        LastName:         'Doe',
        Company:          'Example Corp',
        EMail:            'john.doe@example.com',
        AddressLine1:     '123 Main Street',
        AddressLine2:     '',
        AddressLine3:     '',
        City:             'Los Angeles',
        Country:          'US',
        ZipCode:          '90001',
        Phone:            '5551234567',
        PhoneCountryCode: '1',
        Fax:              '',
        FaxCountryCode:   '',
        State:            'California',
        Type:             'Administrative'
      },
      Billing: { ID: 98765, FirstName: 'John', LastName: 'Doe' },
      Registrant: { ID: 98765, FirstName: 'John', LastName: 'Doe' },
      Technical: { ID: 98765, FirstName: 'John', LastName: 'Doe' }
    }
  }
}
*/
