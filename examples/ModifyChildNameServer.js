/**
 * nodejs-dna example — ModifyChildNameServer
 * Update the IP address of an existing child (glue) nameserver.
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
   * ModifyChildNameServer(domainName, nameServer, ipAddress)
   * @param {string} domainName  The parent domain (e.g. 'example.com')
   * @param {string} nameServer  Hostname of the existing child nameserver
   * @param {string} ipAddress   New IPv4 or IPv6 address for the glue record
   * @returns {{ result: 'OK'|'ERROR', data?: { NameServer: string, IPAdresses: string[] } }}
   *   Note: 'IPAdresses' has a one-'d' typo — preserved from the upstream API.
   */
  const result = await api.ModifyChildNameServer('example.com', 'ns1.example.com', '5.6.7.8');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    NameServer: 'ns1.example.com',
    IPAdresses: [ '5.6.7.8' ]
  }
}
*/
