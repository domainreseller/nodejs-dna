/**
 * nodejs-dna example — GetResellerDetails
 * Retrieve reseller account details including balances.
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
