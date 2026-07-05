/**
 * nodejs-dna example — GetList
 * Retrieve the list of domains in the reseller account (paginated).
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
