/**
 * nodejs-dna example — CheckAvailability
 * Check domain availability for a cartesian product of names × TLD extensions.
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
