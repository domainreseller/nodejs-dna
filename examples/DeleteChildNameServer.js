/**
 * nodejs-dna example — DeleteChildNameServer
 * Remove a child (glue) nameserver entry from a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

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
