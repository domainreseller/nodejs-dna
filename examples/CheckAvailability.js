/**
 * nodejs-dna example — CheckAvailability
 * Check domain availability for a cartesian product of names × TLD extensions.
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
   * CheckAvailability(domains, extensions, period, command)
   * @param {string[]} domains     SLD parts (without dot), e.g. ['example', 'testdomain']
   * @param {string[]} extensions  TLD parts, e.g. ['com', 'net']
   * @param {number}   period      Registration period in years
   * @param {string}   [command]   Operation command, default 'create'
   * @returns {Array|{ result: 'ERROR', error: {...} }}
   *   Returns a DIRECT ARRAY of availability objects (not wrapped in {result:'OK'}).
   */
  const result = await api.CheckAvailability(['example', 'testdomain'], ['com', 'net'], 1, 'create');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
[
  {
    TLD:        'com',
    DomainName: 'example',
    Status:     'notavailable',
    Command:    'create',
    Period:     1,
    IsFee:      false,
    Price:      '9.9900',
    Currency:   'USD',
    Reason:     'Domain exists'
  },
  {
    TLD:        'com',
    DomainName: 'testdomain',
    Status:     'available',
    Command:    'create',
    Period:     1,
    IsFee:      false,
    Price:      '9.9900',
    Currency:   'USD',
    Reason:     null
  },
  {
    TLD:        'net',
    DomainName: 'example',
    Status:     'notavailable',
    Command:    'create',
    Period:     1,
    IsFee:      false,
    Price:      '12.9900',
    Currency:   'USD',
    Reason:     'Domain exists'
  },
  {
    TLD:        'net',
    DomainName: 'testdomain',
    Status:     'available',
    Command:    'create',
    Period:     1,
    IsFee:      false,
    Price:      '12.9900',
    Currency:   'USD',
    Reason:     null
  }
]
*/
