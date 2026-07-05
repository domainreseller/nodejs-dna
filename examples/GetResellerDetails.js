/**
 * nodejs-dna example — GetResellerDetails
 * Retrieve reseller account details including balances.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
