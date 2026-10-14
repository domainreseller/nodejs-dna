/**
 * nodejs-dna example — CheckTransfer
 * Check whether a domain is transferable using the provided EPP auth code.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Credentials: Reseller ID (UUID) + API Key (or set DNA_RESELLER_ID / DNA_API_KEY env vars):
//       new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key')
// NOTE: these are API credentials from your DomainNameAPI panel (API Settings),
//       NOT your panel login credentials.
const resellerId = process.env.DNA_RESELLER_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const apiKey = process.env.DNA_API_KEY || 'your-api-key';

const api = new DomainNameApi(resellerId, apiKey);

async function main() {
  /**
   * CheckTransfer(domainName, authcode)
   * @param {string} domainName  The fully-qualified domain to check
   * @param {string} authcode    EPP/auth code to validate
   * @returns {Object}
   *   { result, data: { TransferAvailabilityStatus, AuthCodeIsRequired, AuthCodeIsValid,
   *                     UserTransferRequired, TransferLock, Message, MessageKey, Additional } }
   */
  const result = await api.CheckTransfer('example.com', 'EPP-AUTH-CODE-HERE');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output (transferable domain):
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
*/
