/**
 * nodejs-dna example — SyncFromRegistry
 * Sync domain information from the registry (refreshes local records).
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
   * SyncFromRegistry(domainName)
   * @param {string} domainName  The fully-qualified domain to sync
   * @returns {{ result: 'OK'|'ERROR', data?: {...domain info...} }}
   *   Same envelope as GetDetails — returns the refreshed domain data.
   */
  const result = await api.SyncFromRegistry('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    ID:                      123456,
    Status:                  'Active',
    DomainName:              'example.com',
    AuthCode:                'ABC123XYZ456DEF789GHI012JKL345MNO',
    LockStatus:              'true',
    PrivacyProtectionStatus: 'false',
    IsChildNameServer:       'false',
    Contacts: {
      Billing:        { ID: 0 },
      Technical:      { ID: 0 },
      Administrative: { ID: 0 },
      Registrant:     { ID: 0 }
    },
    Dates: {
      Start:         '2022-09-09T00:00:00',
      Expiration:    '2026-09-08T00:00:00',
      RemainingDays: 1284
    },
    NameServers:      [ 'ns1.example.com', 'ns2.example.com' ],
    Additional:       [],
    ChildNameServers: []
  }
}
*/
