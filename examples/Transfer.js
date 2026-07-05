/**
 * nodejs-dna example — Transfer
 * Initiate a domain transfer into the reseller account using an EPP auth code.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
