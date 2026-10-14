/**
 * nodejs-dna example — GetList
 * Retrieve the list of domains in the reseller account (paginated).
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
   * GetList(extraParameters)
   * @param {Object} [extraParameters={}]  Extra query params, e.g. { MaxResultCount: 50, SkipCount: 0 }
   * @returns {{ result: 'OK'|'ERROR', TotalCount: number, data: { Domains: Array } }}
   */
  const result = await api.GetList({ MaxResultCount: 20, SkipCount: 0 });
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result:     'OK',
  TotalCount: 2,
  data: {
    Domains: [
      {
        ID:                      123456,
        Status:                  'Active',
        DomainName:              'example.com',
        AuthCode:                '',
        LockStatus:              'true',
        PrivacyProtectionStatus: 'false',
        IsChildNameServer:       'false',
        Contacts: {
          Billing:        { ID: '' },
          Technical:      { ID: '' },
          Administrative: { ID: '' },
          Registrant:     { ID: '' }
        },
        Dates: {
          Start:         '2022-09-09T00:00:00',
          Expiration:    '2025-09-09T00:00:00',
          RemainingDays: 365
        },
        NameServers:      [ 'ns1.example.com', 'ns2.example.com' ],
        Additional:       [],
        ChildNameServers: []
      }
    ]
  }
}
*/
