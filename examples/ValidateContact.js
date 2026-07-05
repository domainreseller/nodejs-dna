/**
 * nodejs-dna example — ValidateContact
 * Validate and normalise a contact object synchronously (no network call).
 * Missing or blank fields are filled in with Turkish-locale defaults.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
// NOTE: ValidateContact is purely local — no API call is made, credentials are not used.
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

/**
 * ValidateContact(contact)
 * @param {Object} contact  Contact object (may have missing/empty fields)
 * @returns {Object}  The mutated contact with defaults applied and phone normalised.
 *   Synchronous — no Promise, no await needed.
 */
const out = api.ValidateContact({
  FirstName:    'John',
  LastName:     'Doe',
  AddressLine1: '123 Main Street',
  City:         'Los Angeles',
  Country:      'US',
  ZipCode:      '90001',
  Phone:        '5551234567',
  // PhoneCountryCode intentionally omitted — will be filled with default '90'
});

console.dir(out, { depth: null });

/*
Sample output:
{
  FirstName:        'John',
  LastName:         'Doe',
  AddressLine1:     '123 Main Street',
  City:             'Los Angeles',
  Country:          'US',
  ZipCode:          '90001',
  Phone:            '5551234567',
  PhoneCountryCode: '90'
}
*/
