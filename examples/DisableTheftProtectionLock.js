/**
 * nodejs-dna example — DisableTheftProtectionLock
 * Disable EPP/theft-protection (registrar lock) on a domain.
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
   * DisableTheftProtectionLock(domainName)
   * @param {string} domainName  The fully-qualified domain to unlock
   * @returns {{ result: 'OK'|'ERROR', data?: { LockStatus: false } }}
   */
  const result = await api.DisableTheftProtectionLock('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    LockStatus: false
  }
}
*/
