/**
 * nodejs-dna example — IsTrTLD
 * Check synchronously whether a domain ends with '.tr' (Turkish TLD).
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// NOTE: IsTrTLD is purely local — no API call is made, credentials are not used.
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

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
