/**
 * nodejs-dna example — GetCurrentBalance
 * Get the current account balance for the specified currency.
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
