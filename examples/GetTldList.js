/**
 * nodejs-dna example — GetTldList
 * Retrieve the supported TLD list with pricing matrix.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
