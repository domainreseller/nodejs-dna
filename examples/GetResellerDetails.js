/**
 * nodejs-dna example — GetResellerDetails
 * Retrieve reseller account details including balances.
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
   * GetResellerDetails()
   * @returns flat envelope (no data wrapper):
   *   { result, id, active, name, balance, currency, symbol, balances: [...] }
   */
  const result = await api.GetResellerDetails();
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result:   'OK',
  id:       4567,
  active:   true,
  name:     'Example Reseller Ltd',
  balance:  '250.00',
  currency: 'USD',
  symbol:   '$',
  balances: [
    { balance: '250.00', currency: 'USD', symbol: '$' },
    { balance: '500.00', currency: 'TL',  symbol: 'TL' }
  ]
}
*/
