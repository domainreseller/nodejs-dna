/**
 * nodejs-dna example — ModifyNameServer
 * Replace the full nameserver set for a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
