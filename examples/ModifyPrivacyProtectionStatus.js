/**
 * nodejs-dna example — ModifyPrivacyProtectionStatus
 * Enable or disable WHOIS privacy protection on a domain.
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
   * ModifyPrivacyProtectionStatus(domainName, status, reason)
   * @param {string}  domainName  The fully-qualified domain
   * @param {boolean} status      true to enable privacy, false to disable
   * @param {string}  [reason]    Reason string (accepted but not forwarded to the API)
   * @returns {{ result: 'OK'|'ERROR', data?: { PrivacyProtectionStatus: boolean } }}
   */
  const result = await api.ModifyPrivacyProtectionStatus('example.com', true, 'Owner request');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output (enabling privacy):
{
  result: 'OK',
  data: {
    PrivacyProtectionStatus: true
  }
}
*/
