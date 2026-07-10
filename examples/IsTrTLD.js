/**
 * nodejs-dna example — IsTrTLD
 * Check synchronously whether a domain ends with '.tr' (Turkish TLD).
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
// NOTE: IsTrTLD is purely local — no API call is made, credentials are not used.
const username = process.env.DNA_USER || 'your-api-username'; // or Reseller ID: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
const password = process.env.DNA_PASS || 'your-api-password'; // or API Key: 'your-api-key'

const api = new DomainNameApi(username, password);

/**
 * IsTrTLD(domain)
 * @param {string} domain  Any domain name string
 * @returns {boolean}  true when the domain ends with '.tr', false otherwise.
 *   Synchronous — no Promise, no await needed.
 */
console.log(api.IsTrTLD('example.com.tr'));   // true
console.log(api.IsTrTLD('example.com'));       // false
console.log(api.IsTrTLD('test.org.tr'));       // true
console.log(api.IsTrTLD('example.co.uk'));     // false

/*
Sample output:
true
false
true
false
*/
