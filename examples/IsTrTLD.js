/**
 * nodejs-dna example — IsTrTLD
 * Check synchronously whether a domain ends with '.tr' (Turkish TLD).
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Credentials: Reseller ID (UUID) + API Key (or set DNA_RESELLER_ID / DNA_API_KEY env vars):
//       new DomainNameApi('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key')
// NOTE: these are API credentials from your DomainNameAPI panel (API Settings),
//       NOT your panel login credentials.
// NOTE: IsTrTLD is purely local — no API call is made, credentials are not used.
const resellerId = process.env.DNA_RESELLER_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const apiKey = process.env.DNA_API_KEY || 'your-api-key';

const api = new DomainNameApi(resellerId, apiKey);

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
