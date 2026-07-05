/**
 * nodejs-dna example — RejectTransfer
 * Reject a pending outgoing domain transfer request.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * RejectTransfer(domainName)
   * @param {string} domainName  The fully-qualified domain with a pending outgoing transfer
   * @returns {{ result: 'OK'|'ERROR', data?: { DomainName: string, Status: string } }}
   */
  const result = await api.RejectTransfer('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    DomainName: 'example.com',
    Status:     'Rejected'
  }
}
*/
