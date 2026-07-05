/**
 * nodejs-dna example — Renew
 * Renew a domain registration for a given number of years.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

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
