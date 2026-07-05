/**
 * nodejs-dna example — CancelTransfer
 * Cancel a pending incoming domain transfer.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * CancelTransfer(domainName)
   * @param {string} domainName  The fully-qualified domain with a pending transfer
   * @returns {{ result: 'OK'|'ERROR', data?: { DomainName: string, Status: string } }}
   */
  const result = await api.CancelTransfer('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    DomainName: 'example.com',
    Status:     'Cancelled'
  }
}
*/
