/**
 * nodejs-dna example — ModifyPrivacyProtectionStatus
 * Enable or disable WHOIS privacy protection on a domain.
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
