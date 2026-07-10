/**
 * nodejs-dna example — ModifyChildNameServer
 * Update the IP address of an existing child (glue) nameserver.
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
