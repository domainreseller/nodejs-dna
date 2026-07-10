/**
 * nodejs-dna example — GetContacts
 * Retrieve the Administrative, Billing, Technical, and Registrant contacts for a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Credentials — two styles, one constructor (or set DNA_USER / DNA_PASS env vars):
//   REST (new panel, recommended): Reseller ID (UUID) + API Key
//       new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key')
//   SOAP (legacy):                 API username + API password
//       new DomainNameApi('your-api-username', 'your-api-password')
// The client picks the right API automatically (UUID -> REST, anything else -> SOAP).
// NOTE: these are API credentials from your DomainNameAPI panel (API Settings),
//       NOT your panel login e-mail and password.
const username = process.env.DNA_USER || 'your-api-username'; // or Reseller ID: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
const password = process.env.DNA_PASS || 'your-api-password'; // or API Key: 'your-api-key'

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
