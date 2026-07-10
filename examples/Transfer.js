/**
 * nodejs-dna example — Transfer
 * Initiate a domain transfer into the reseller account using an EPP auth code.
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
   * Transfer(domainName, eppCode, period, contacts)
   * @param {string}       domainName  The fully-qualified domain to transfer
   * @param {string}       eppCode     EPP/auth code from the current registrar
   * @param {number}       period      Transfer period in years
   * @param {Object|Array} [contacts=[]]  Optional contact objects keyed by type
   * @returns {{ result: 'OK'|'ERROR', data?: {...domain info...} }}
   */
  const result = await api.Transfer('example.com', 'EPP-AUTH-CODE-HERE', 1);
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    ID:                      123456,
    Status:                  'WaitingForIncomingTransfer',
    DomainName:              'example.com',
    AuthCode:                'EPP-AUTH-CODE-HERE',
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
      RemainingDays: 730
    },
    NameServers:      [ 'ns1.registrar.com', 'ns2.registrar.com' ],
    Additional:       [],
    ChildNameServers: []
  }
}
*/
