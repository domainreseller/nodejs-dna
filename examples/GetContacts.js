/**
 * nodejs-dna example — GetContacts
 * Retrieve the Administrative, Billing, Technical, and Registrant contacts for a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Credentials: Reseller ID (UUID) + API Key (or set DNA_RESELLER_ID / DNA_API_KEY env vars):
//       new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key')
// NOTE: these are API credentials from your DomainNameAPI panel (API Settings),
//       NOT your panel login credentials.
const resellerId = process.env.DNA_RESELLER_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const apiKey = process.env.DNA_API_KEY || 'your-api-key';

const api = new DomainNameApi(resellerId, apiKey);

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
