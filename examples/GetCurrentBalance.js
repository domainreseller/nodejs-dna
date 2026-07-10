/**
 * nodejs-dna example — GetCurrentBalance
 * Get the current account balance for the specified currency.
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
