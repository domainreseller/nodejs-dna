/**
 * nodejs-dna example — EnableTheftProtectionLock
 * Enable EPP/theft-protection (registrar lock) on a domain.
 */
const DomainNameApi = require('..'); // or require('nodejs-dna') once installed

// Fill in your credentials (or set DNA_USER / DNA_PASS env vars).
const username = process.env.DNA_USER || 'your-username';
const password = process.env.DNA_PASS || 'your-password';

const api = new DomainNameApi(username, password);

async function main() {
  /**
   * EnableTheftProtectionLock(domainName)
   * @param {string} domainName  The fully-qualified domain to lock
   * @returns {{ result: 'OK'|'ERROR', data?: { LockStatus: true } }}
   */
  const result = await api.EnableTheftProtectionLock('example.com');
  console.dir(result, { depth: null });
}

main().catch(console.error);

/*
Sample output:
{
  result: 'OK',
  data: {
    LockStatus: true
  }
}
*/
