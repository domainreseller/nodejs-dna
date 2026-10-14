/**
 * nodejs-dna example — DeleteChildNameServer
 * Remove a child (glue) nameserver entry from a domain.
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
   * DeleteChildNameServer(domainName, nameServer)
   * @param {string} domainName  The parent domain (e.g. 'example.com')
   * @param {string} nameServer  Hostname of the child nameserver to remove
   * @returns {{ result: 'OK'|'ERROR', data?: { NameServer: string } }}
   */
  const result = await api.DeleteChildNameServer('example.com', 'ns1.example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    NameServer: 'ns1.example.com'
  }
}
*/
