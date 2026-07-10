/**
 * nodejs-dna example — AddChildNameServer
 * Add a child (glue) nameserver entry to a domain.
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
   * AddChildNameServer(domainName, nameServer, ipAddress)
   * @param {string} domainName  The parent domain (e.g. 'example.com')
   * @param {string} nameServer  Hostname of the child nameserver (e.g. 'ns1.example.com')
   * @param {string} ipAddress   IPv4 or IPv6 address for the glue record
   * @returns {{ result: 'OK'|'ERROR', data?: { NameServer: string, IPAdresses: string[] } }}
   *   Note: 'IPAdresses' has a one-'d' typo — preserved from the upstream API.
   */
  const result = await api.AddChildNameServer('example.com', 'ns1.example.com', '1.2.3.4');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    NameServer: 'ns1.example.com',
    IPAdresses: [ '1.2.3.4' ]
  }
}
*/
