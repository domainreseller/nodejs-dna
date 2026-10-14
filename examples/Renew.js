/**
 * nodejs-dna example — Renew
 * Renew a domain registration for a given number of years.
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
   * Renew(domainName, period)
   * @param {string} domainName  The fully-qualified domain (e.g. 'example.com')
   * @param {number} period      Renewal period in years
   * @returns {{ result: 'OK'|'ERROR', data?: { ExpirationDate: string } }}
   */
  const result = await api.Renew('example.com', 1);
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    ExpirationDate: '2027-09-08T00:00:00'
  }
}
*/
