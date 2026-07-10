/**
 * nodejs-dna example — GetDetails
 * Fetch full details for a single domain in the reseller account.
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
   * GetDetails(domainName)
   * @param {string} domainName  The fully-qualified domain (e.g. 'example.com')
   * @returns {{ result: 'OK'|'ERROR', data?: {...} }}
   */
  const result = await api.GetDetails('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    ID: 123456,
    Status: 'Active',
    DomainName: 'example.com',
    AuthCode: 'ABC123XYZ456DEF789GHI012JKL345MNO',
    LockStatus: 'true',
    PrivacyProtectionStatus: 'false',
    IsChildNameServer: 'false',
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
