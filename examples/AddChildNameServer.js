/**
 * nodejs-dna example — AddChildNameServer
 * Add a child (glue) nameserver entry to a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
