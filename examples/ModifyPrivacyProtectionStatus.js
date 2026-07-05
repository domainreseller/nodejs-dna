/**
 * nodejs-dna example — ModifyPrivacyProtectionStatus
 * Enable or disable WHOIS privacy protection on a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
