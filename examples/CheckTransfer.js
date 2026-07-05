/**
 * nodejs-dna example — CheckTransfer
 * Check whether a domain is transferable using the provided EPP auth code.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * CheckTransfer(domainName, authcode)
   * @param {string} domainName  The fully-qualified domain to check
   * @param {string} authcode    EPP/auth code to validate
   * @returns {Object}
   *   REST: { result, data: { TransferAvailabilityStatus, AuthCodeIsRequired, AuthCodeIsValid,
   *                           UserTransferRequired, TransferLock, Message, MessageKey, Additional } }
   *   SOAP: { result: 'OK' } or { result: 'ERROR' }
   */
  const result = await api.CheckTransfer('example.com', 'EPP-AUTH-CODE-HERE');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output (REST transport — transferable domain):
{
  result: 'OK',
  data: {
    TransferAvailabilityStatus: true,
    AuthCodeIsRequired:         true,
    AuthCodeIsValid:            true,
    UserTransferRequired:       false,
    TransferLock:               false,
    Message:                    'Domain is transferable',
    MessageKey:                 '',
    Additional:                 []
  }
}

Sample output (SOAP transport):
{ result: 'OK' }
*/
