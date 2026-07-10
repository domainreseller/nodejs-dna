/**
 * nodejs-dna example — GetList
 * Retrieve the list of domains in the reseller account (paginated).
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
