'use strict';
/**
 * Pure normalization helpers for SOAP (PascalCase XML) responses — ported
 * from DNASoap.php `parseDomainInfo` (lines 1410–1615) and `parseContactInfo`
 * (lines 1623–1666).
 *
 * Both functions map SOAP PascalCase input keys to the SAME output shape that
 * `src/rest-normalize.js` `parseDomainInfo`/`parseContactInfo` produce, so
 * the facade layer is fully transport-agnostic.
 *
 * Utility helpers (`normalizeDomainStatus`, `formatApiDate`,
 * `remainingDaysFromDate`) are re-used from `./rest-normalize` — no
 * duplication.
 */

const {
  normalizeDomainStatus,
  formatApiDate,
  remainingDaysFromDate,
} = require('./rest-normalize');

const { RESULT_OK, RESULT_ERROR, DEFAULT_ERRORS } = require('./shared');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse an integer from a value that may be numeric.
 * Returns `defaultVal` when the value is absent, null, or non-numeric.
 *
 * @param {*} val
 * @param {number} defaultVal
 * @returns {number}
 */
function toIntOrDefault(val, defaultVal) {
  if (val == null) return defaultVal;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Flatten a SOAP `AdditionalAttributes.KeyValueOfstringstring` array into a
 * plain object.  Returns `[]` (matching REST behaviour) when absent.
 *
 * @param {*} attrs
 * @returns {Object|Array}
 */
function flattenKeyValues(attrs) {
  if (
    !attrs ||
    !Array.isArray(attrs.KeyValueOfstringstring) ||
    attrs.KeyValueOfstringstring.length === 0
  ) {
    return [];
  }
  const out = {};
  for (const kv of attrs.KeyValueOfstringstring) {
    if (kv && kv.Key !== undefined && kv.Value !== undefined) {
      out[kv.Key] = kv.Value;
    }
  }
  return Object.keys(out).length > 0 ? out : [];
}

// ---------------------------------------------------------------------------
// parseSoapDomainInfo
// PHP: DNASoap.php lines 1410–1615
// ---------------------------------------------------------------------------
/**
 * Map a raw SOAP domain object (PascalCase keys, as produced by
 * `objectToArray`) → the `{result, data:{...}}` envelope that REST
 * `parseDomainInfo` produces.
 *
 * SOAP input keys → output field:
 *   Id                       → data.ID
 *   Status                   → data.Status   (via normalizeDomainStatus)
 *   DomainName               → data.DomainName
 *   Auth                     → data.AuthCode
 *   LockStatus               → data.LockStatus   ('true'|'false')
 *   PrivacyProtectionStatus  → data.PrivacyProtectionStatus ('true'|'false')
 *   IsChildNameServer        → data.IsChildNameServer ('true'|'false')
 *   AdministrativeContactId  → data.Contacts.Administrative.ID
 *   BillingContactId         → data.Contacts.Billing.ID
 *   TechnicalContactId       → data.Contacts.Technical.ID
 *   RegistrantContactId      → data.Contacts.Registrant.ID
 *   StartDate                → data.Dates.Start
 *   ExpirationDate           → data.Dates.Expiration
 *   RemainingDay             → data.Dates.RemainingDays (or derived)
 *   NameServerList.NameServer → data.NameServers
 *   AdditionalAttributes.KeyValueOfstringstring → data.Additional
 *   ChildNameServerInfo.ChildNameServerInfo[]   → data.ChildNameServers
 *
 * @param {Object|null} data  Raw SOAP domain object
 * @returns {Object}
 */
function parseSoapDomainInfo(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return {
      result: RESULT_ERROR,
      error: {
        Code:    DEFAULT_ERRORS.RESPONSE.code,
        Message: DEFAULT_ERRORS.RESPONSE.message,
        Details: DEFAULT_ERRORS.RESPONSE.description,
      },
    };
  }

  // --- NameServers ---
  // SOAP wraps as NameServerList: { NameServer: 'ns1' }  (single)
  //                          or  { NameServer: ['ns1', 'ns2'] }  (multiple)
  // PHP iterates over the values of NameServerList; each value is either an
  // array (flattened) or a scalar (appended directly).
  const nameServers = [];
  if (data.NameServerList && typeof data.NameServerList === 'object') {
    for (const nsVal of Object.values(data.NameServerList)) {
      if (Array.isArray(nsVal)) {
        for (const nsItem of nsVal) {
          nameServers.push(String(nsItem));
        }
      } else if (nsVal != null) {
        nameServers.push(String(nsVal));
      }
    }
  }

  // --- ChildNameServers ---
  // SOAP: ChildNameServerInfo: { ChildNameServerInfo: [{ ChildNameServer, IpAddress: {string} }] }
  // PHP bug: when IpAddress.string is an array, each iteration OVERWRITES
  // $IpAddresses (no push) → only the last IP survives.  We replicate this.
  const childNameServers = [];
  const cnsOuter = data.ChildNameServerInfo;
  if (
    cnsOuter &&
    Array.isArray(cnsOuter.ChildNameServerInfo) &&
    cnsOuter.ChildNameServerInfo.length > 0
  ) {
    for (const attr of cnsOuter.ChildNameServerInfo) {
      if (!attr || attr.ChildNameServer === undefined || attr.IpAddress === undefined) {
        continue;
      }
      const ns = typeof attr.ChildNameServer === 'string' ? attr.ChildNameServer : '';
      let ip = '';
      const ipStr = attr.IpAddress && attr.IpAddress.string;
      if (Array.isArray(ipStr)) {
        // PHP overwrites each time → last IP wins
        for (const i of ipStr) {
          if (typeof i === 'string') ip = i;
        }
      } else if (typeof ipStr === 'string') {
        ip = ipStr;
      }
      childNameServers.push({ ns, ip });
    }
  }

  // --- Additional Attributes ---
  const additional = flattenKeyValues(data.AdditionalAttributes);

  return {
    result: RESULT_OK,
    data: {
      'ID':                      toIntOrDefault(data.Id, 0),
      'Status':                  normalizeDomainStatus(data.Status != null ? data.Status : ''),
      'DomainName':              String(data.DomainName || ''),
      'AuthCode':                typeof data.Auth === 'string' ? data.Auth : '',
      'LockStatus':              data.LockStatus ? 'true' : 'false',
      'PrivacyProtectionStatus': data.PrivacyProtectionStatus ? 'true' : 'false',
      'IsChildNameServer':       data.IsChildNameServer ? 'true' : 'false',
      'Contacts': {
        'Billing':        { ID: toIntOrDefault(data.BillingContactId,        0) },
        'Technical':      { ID: toIntOrDefault(data.TechnicalContactId,      0) },
        'Administrative': { ID: toIntOrDefault(data.AdministrativeContactId, 0) },
        'Registrant':     { ID: toIntOrDefault(data.RegistrantContactId,     0) },
      },
      'Dates': {
        'Start':         formatApiDate(data.StartDate      || null),
        'Expiration':    formatApiDate(data.ExpirationDate || null),
        // Prefer the server-supplied remaining-day count; fall back to derivation.
        'RemainingDays': data.RemainingDay !== undefined
          ? toIntOrDefault(data.RemainingDay, 0)
          : remainingDaysFromDate(data.ExpirationDate || null),
      },
      'NameServers':      nameServers,
      'Additional':       additional,
      'ChildNameServers': childNameServers,
    },
  };
}

// ---------------------------------------------------------------------------
// parseSoapContactInfo
// PHP: DNASoap.php lines 1623–1666
// ---------------------------------------------------------------------------
/**
 * Map a raw SOAP contact object (PascalCase keys) → the same flat contact
 * shape that REST `parseContactInfo` produces.
 *
 * SOAP input keys → output field:
 *   Id               → ID          (numeric when valid, '' otherwise)
 *   Status           → Status
 *   Auth             → AuthCode
 *   FirstName        → FirstName
 *   LastName         → LastName
 *   Company          → Company
 *   EMail            → EMail
 *   Type             → Type
 *   AddressLine1     → Address.Line1
 *   AddressLine2     → Address.Line2
 *   AddressLine3     → Address.Line3
 *   State            → Address.State
 *   City             → Address.City
 *   Country          → Address.Country
 *   ZipCode          → Address.ZipCode
 *   Phone            → Phone.Phone.Number
 *   PhoneCountryCode → Phone.Phone.CountryCode
 *   Fax              → Phone.Fax.Number
 *   FaxCountryCode   → Phone.Fax.CountryCode
 *   AdditionalAttributes.KeyValueOfstringstring → Additional
 *
 * @param {Object|null} data  Raw SOAP contact object
 * @returns {Object}
 */
function parseSoapContactInfo(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return {};
  }

  // ID: only numeric values are accepted (mirrors PHP `is_numeric` check).
  const rawId = data.Id;
  const idVal = (rawId != null && !isNaN(parseInt(rawId, 10))) ? parseInt(rawId, 10) : '';

  const additional = flattenKeyValues(data.AdditionalAttributes);

  return {
    'ID':        idVal,
    'Status':    data.Status    != null ? data.Status    : '',
    'AuthCode':  data.Auth      != null ? data.Auth      : '',
    'FirstName': data.FirstName != null ? data.FirstName : '',
    'LastName':  data.LastName  != null ? data.LastName  : '',
    'Company':   data.Company   != null ? data.Company   : '',
    'EMail':     data.EMail     != null ? data.EMail     : '',
    'Type':      data.Type      != null ? data.Type      : '',
    'Address': {
      'Line1':   data.AddressLine1 != null ? data.AddressLine1 : '',
      'Line2':   data.AddressLine2 != null ? data.AddressLine2 : '',
      'Line3':   data.AddressLine3 != null ? data.AddressLine3 : '',
      'State':   data.State        != null ? data.State        : '',
      'City':    data.City         != null ? data.City         : '',
      'Country': data.Country      != null ? data.Country      : '',
      'ZipCode': data.ZipCode      != null ? data.ZipCode      : '',
    },
    'Phone': {
      'Phone': {
        'Number':      data.Phone            != null ? data.Phone            : '',
        'CountryCode': data.PhoneCountryCode != null ? data.PhoneCountryCode : '',
      },
      'Fax': {
        'Number':      data.Fax            != null ? data.Fax            : '',
        'CountryCode': data.FaxCountryCode != null ? data.FaxCountryCode : '',
      },
    },
    'Additional': additional,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  parseSoapDomainInfo,
  parseSoapContactInfo,
};
