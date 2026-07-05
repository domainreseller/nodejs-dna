/**
 * nodejs-dna example — GetCurrentBalance
 * Get the current account balance for the specified currency.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * GetCurrentBalance(currencyId)
   * @param {string} [currencyId='USD']  Currency code: 'USD', 'TRY'/'TL', etc.
   * @returns flat envelope (no result:'OK' wrapper, no data key):
   *   { ErrorCode, OperationMessage, OperationResult, Balance, CurrencyId,
   *     CurrencyInfo, CurrencyName, CurrencySymbol }
   */
  const result = await api.GetCurrentBalance('USD');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  ErrorCode:        0,
  OperationMessage: 'Command completed succesfully.',
  OperationResult:  'SUCCESS',
  Balance:          '250.00',
  CurrencyId:       2,
  CurrencyInfo:     null,
  CurrencyName:     'USD',
  CurrencySymbol:   '$'
}
*/
