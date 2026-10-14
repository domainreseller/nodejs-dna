/**
 * nodejs-dna example — ModifyNameServer
 * Replace the full nameserver set for a domain.
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
   * ModifyNameServer(domainName, nameServers)
   * @param {string}   domainName   The fully-qualified domain
   * @param {string[]} nameServers  Complete new nameserver list (replaces existing)
   * @returns {{ result: 'OK'|'ERROR', data?: { NameServers: string[] } }}
   */
  const result = await api.ModifyNameServer('example.com', [
    'ns1.newprovider.com',
    'ns2.newprovider.com',
  ]);
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    NameServers: [ 'ns1.newprovider.com', 'ns2.newprovider.com' ]
  }
}
*/
