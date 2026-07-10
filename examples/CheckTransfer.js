/**
 * nodejs-dna example — CheckTransfer
 * Check whether a domain is transferable using the provided EPP auth code.
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
