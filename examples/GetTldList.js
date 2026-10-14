/**
 * nodejs-dna example — GetTldList
 * Retrieve the supported TLD list with pricing matrix.
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
