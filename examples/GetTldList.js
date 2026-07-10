/**
 * nodejs-dna example — GetTldList
 * Retrieve the supported TLD list with pricing matrix.
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
   * GetTldList(count)
   * @param {number} [count=20]  Maximum number of TLDs to return
   * @returns {{ result: 'OK'|'ERROR', data: Array }}
   */
  const result = await api.GetTldList(10);
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: [
    {
      id:        1,
      status:    'Active',
      maxchar:   63,
      maxperiod: 10,
      minchar:   1,
      minperiod: 1,
      tld:       'com',
      pricing: {
        registration: { '1': '9.9900', '2': '19.9800' },
        renew:        { '1': '9.9900', '2': '19.9800' },
        transfer:     { '1': '9.9900' }
      },
      currencies: {
        registration: 'USD',
        renew:        'USD',
        transfer:     'USD'
      }
    }
  ]
}
*/
