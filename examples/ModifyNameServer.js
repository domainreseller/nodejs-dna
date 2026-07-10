/**
 * nodejs-dna example — ModifyNameServer
 * Replace the full nameserver set for a domain.
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
