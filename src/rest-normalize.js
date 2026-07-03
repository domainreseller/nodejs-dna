'use strict';
/**
 * Pure normalization helpers — ported from DNARest.php (php-dna).
 *
 * All functions are stateless and exported for use by DNARest method
 * implementations and their unit tests.
 *
 * PHP source references are noted per function (§A4 of the port map).
 */

const { DOMAIN_STATUS_MAP, RESULT_OK, RESULT_ERROR, DEFAULT_ERRORS } = require('./shared');

// ---------------------------------------------------------------------------
// normalizeDomainStatus
// PHP: DNARest.php lines 1615–1621
// ---------------------------------------------------------------------------
/**
 * Normalize a gateway domain status to its textual label.
 * Numeric values are resolved via DOMAIN_STATUS_MAP; unknown numerics fall
 * through as their string form; label strings are returned untouched.
 *
 * @param {number|string} value
 * @returns {string}
 */
function normalizeDomainStatus(value) {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
    const key = parseInt(value, 10);
    return DOMAIN_STATUS_MAP[key] !== undefined ? DOMAIN_STATUS_MAP[key] : String(value);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// formatApiDate
// PHP: SharedApiConfigAndUtilsTrait.php lines 304–311
// ---------------------------------------------------------------------------
/**
 * API date string → 'YYYY-MM-DDTHH:mm:ss' (local-time ISO-like).
 * Returns '' if value is null, empty, or unparseable.
 *
 * @param {string|null} value
 * @returns {string}
 */
function formatApiDate(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const d = new Date(String(value));
  if (isNaN(d.getTime())) {
    return '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  // PHP's date('Y-m-d\TH:i:s', $ts) uses local time.
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) +
    ':' + pad(d.getMinutes()) +
    ':' + pad(d.getSeconds())
  );
}

// ---------------------------------------------------------------------------
// remainingDaysFromDate
// PHP: SharedApiConfigAndUtilsTrait.php lines 318–328
// ---------------------------------------------------------------------------
/**
 * Days remaining until an API-supplied date, floored at 0.
 * Returns 0 when date is missing or unparseable.
 *
 * @param {string|null} value
 * @returns {number}
 */
function remainingDaysFromDate(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const d = new Date(String(value));
  if (isNaN(d.getTime())) {
    return 0;
  }
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

// ---------------------------------------------------------------------------
// normalizeCountryCode
// PHP: DNARest.php lines 1374–1394
// ---------------------------------------------------------------------------
/**
 * Full country name → 2-char ISO code; already-2-char → upper-cased.
 *
 * @param {string} country
 * @returns {string}
 */
function normalizeCountryCode(country) {
  country = String(country == null ? '' : country).trim();
  if (country === '') {
    return '';
  }
  if (country.length === 2) {
    return country.toUpperCase();
  }

  const map = {
    'turkey': 'TR', 'türkiye': 'TR', 'turkiye': 'TR',
    'united states': 'US', 'united states of america': 'US', 'usa': 'US',
    'united kingdom': 'GB', 'great britain': 'GB', 'england': 'GB',
    'germany': 'DE', 'deutschland': 'DE', 'france': 'FR', 'spain': 'ES',
    'italy': 'IT', 'netherlands': 'NL', 'india': 'IN', 'china': 'CN',
    'russia': 'RU', 'canada': 'CA', 'australia': 'AU', 'brazil': 'BR',
  };
  const key = country.toLowerCase();
  return map[key] !== undefined ? map[key] : country;
}

// ---------------------------------------------------------------------------
// stringifyAttributes
// PHP: DNARest.php lines 1346–1362
// ---------------------------------------------------------------------------
/**
 * Coerce all tldAttributes values to strings (REST gateway requires string dict).
 * Booleans → 'true'/'false', null → '', arrays/objects → JSON-encoded.
 *
 * @param {Object} attrs
 * @returns {Object}
 */
function stringifyAttributes(attrs) {
  const out = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'boolean') {
      out[key] = value ? 'true' : 'false';
    } else if (value === null || value === undefined) {
      out[key] = '';
    } else if (typeof value === 'object') {
      // Arrays/objects are not valid attribute values; encode defensively.
      out[key] = JSON.stringify(value);
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// humanizeValidationMember
// PHP: DNARest.php lines 1451–1478
// ---------------------------------------------------------------------------
/**
 * Turn a gateway validation member path into a readable field label.
 * e.g. "$.administrativeContact.postalCode" => "Admin PostalCode"
 *      "$.tldAttributes.TRABISCOUNTRYID"    => "TldAttributes TRABISCOUNTRYID"
 *
 * @param {string} member
 * @returns {string}
 */
function humanizeValidationMember(member) {
  member = String(member == null ? '' : member).trim();
  if (member === '') {
    return '';
  }
  // Drop JSONPath root "$."
  member = member.replace(/^\$\./, '');
  // Drop array indexes like [0]
  member = member.replace(/\[\d+\]/g, '');
  // Split on . or /
  const segments = member.split(/[./]+/).filter(Boolean);
  if (segments.length === 0) {
    return '';
  }

  const roles = {
    'administrativecontact': 'Admin', 'administrative': 'Admin',
    'technicalcontact': 'Tech', 'technical': 'Tech',
    'registrantcontact': 'Registrant', 'registrant': 'Registrant',
    'billingcontact': 'Billing', 'billing': 'Billing',
  };

  const out = segments.map((seg) => {
    const key = seg.toLowerCase();
    return roles[key] !== undefined ? roles[key] : seg.charAt(0).toUpperCase() + seg.slice(1);
  });

  return out.join(' ').trim();
}

// ---------------------------------------------------------------------------
// flattenValidationErrors
// PHP: DNARest.php lines 1406–1441
// ---------------------------------------------------------------------------
/**
 * Flatten REST gateway's [{members, message}] validation errors into a
 * readable string, e.g. "Admin PostalCode - 'PostalCode' is required".
 *
 * @param {Array} validationErrors
 * @returns {string}
 */
function flattenValidationErrors(validationErrors) {
  const parts = [];
  for (const ve of validationErrors) {
    if (typeof ve === 'string') {
      if (ve.trim() !== '') {
        parts.push(ve.trim());
      }
      continue;
    }
    if (!ve || typeof ve !== 'object') {
      continue;
    }

    const message = ve.message != null ? String(ve.message).trim() : '';
    const members = [];
    if (Array.isArray(ve.members)) {
      for (const m of ve.members) {
        const label = humanizeValidationMember(String(m));
        if (label !== '') {
          members.push(label);
        }
      }
    }

    if (members.length > 0 && message !== '') {
      parts.push(members.join(', ') + ' - ' + message);
    } else if (members.length > 0) {
      parts.push(members.join(', '));
    } else if (message !== '') {
      parts.push(message);
    }
  }

  // Unique entries (same as PHP's array_unique)
  return [...new Set(parts)].join(' | ');
}

// ---------------------------------------------------------------------------
// normalizeTrAttributes
// PHP: DNARest.php lines 1490–1532
// ---------------------------------------------------------------------------
/**
 * Normalize legacy .tr TRABIS attributes to the REST gateway schema.
 * Drops unsupported keys; maps typo TRABISCITIZIENID → TRABISCITIZENID;
 * normalizes TRABISDOMAINCATEGORY values.
 *
 * @param {Object|null} attrs
 * @returns {Object}
 */
function normalizeTrAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') {
    return [];
  }
  if (Array.isArray(attrs) && attrs.length === 0) {
    return attrs;
  }
  if (Object.keys(attrs).length === 0) {
    return attrs;
  }

  const keyMap = {
    'TRABISDOMAINCATEGORY': 'TRABISDOMAINCATEGORY',
    'TRABISCITIZENID':      'TRABISCITIZENID',
    'TRABISCITIZIENID':     'TRABISCITIZENID', // long-standing typo → canonical
    'TRABISTAXOFFICE':      'TRABISTAXOFFICE',
    'TRABISTAXNUMBER':      'TRABISTAXNUMBER',
  };

  const normalized = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (!keyMap[key]) {
      continue;
    }
    // The canonical TRABISCITIZENID always wins over the typo'd variant.
    if (key === 'TRABISCITIZIENID' && Object.prototype.hasOwnProperty.call(normalized, 'TRABISCITIZENID')) {
      continue;
    }
    normalized[keyMap[key]] = value;
  }

  // Value map for the TRABISDOMAINCATEGORY dropdown: 1 => Owner, 0 => Corporate.
  if (Object.prototype.hasOwnProperty.call(normalized, 'TRABISDOMAINCATEGORY')) {
    const cat = String(normalized['TRABISDOMAINCATEGORY']).toLowerCase().trim();
    if (['1', 'owner', 'personal', 'individual'].includes(cat)) {
      normalized['TRABISDOMAINCATEGORY'] = 'Owner';
    } else if (['0', 'corporate', 'company'].includes(cat)) {
      normalized['TRABISDOMAINCATEGORY'] = 'Corporate';
    }
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// parseContactIds
// PHP: DNARest.php lines 1582–1601
// ---------------------------------------------------------------------------
/**
 * Extract {Billing, Technical, Administrative, Registrant}: {ID: ...} from
 * a contacts array.
 *
 * @param {Array} contacts
 * @returns {Object}
 */
function parseContactIds(contacts) {
  const result = {
    'Billing':        { ID: 0 },
    'Technical':      { ID: 0 },
    'Administrative': { ID: 0 },
    'Registrant':     { ID: 0 },
  };
  if (!Array.isArray(contacts)) {
    return result;
  }

  const typeMap = {
    'Billing': 'Billing', 'Tech': 'Technical',
    'Admin': 'Administrative', 'Registrant': 'Registrant',
  };
  for (const c of contacts) {
    const apiType = c.ContactType || c.contactType || '';
    const soapKey = typeMap[apiType] || null;
    if (soapKey) {
      result[soapKey].ID = c.handle !== undefined ? c.handle : (c.id !== undefined ? c.id : 0);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// parseContactInfo
// PHP: DNARest.php lines 1687–1722
// ---------------------------------------------------------------------------
/**
 * Map raw gateway contact object → normalized contact with nested Address/Phone.
 *
 * @param {Object|null} data
 * @returns {Object}
 */
function parseContactInfo(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return {};
  }
  return {
    'ID':         data.handle !== undefined ? data.handle : (data.id !== undefined ? data.id : ''),
    'Status':     data.status || 'Active',
    'AuthCode':   data.authCode || '',
    'FirstName':  data.firstName || '',
    'LastName':   data.lastName || '',
    'Company':    data.companyName || data.organizationName || data.company || '',
    'EMail':      data.eMail || data.emailAddress || data.email || '',
    'Type':       data.type || '',
    'Address': {
      'Line1':   data.address || data.addressLine1 || '',
      'Line2':   data.addressLine2 || '',
      'Line3':   data.addressLine3 || '',
      'State':   data.state || data.stateOrProvince || '',
      'City':    data.city || '',
      'Country': data.country || data.countryCode || '',
      'ZipCode': data.postalCode || data.zipCode || '',
    },
    'Phone': {
      'Phone': {
        'Number':      data.phone || data.phoneNumber || '',
        'CountryCode': data.phoneCountryCode || '',
      },
      'Fax': {
        'Number':      data.fax || data.faxNumber || '',
        'CountryCode': data.faxCountryCode || '',
      },
    },
    'Additional': data.additionalAttributes || [],
  };
}

// ---------------------------------------------------------------------------
// parseContact
// PHP: DNARest.php lines 1730–1776
// ---------------------------------------------------------------------------
/**
 * Convert inbound SOAP-style contact array to REST API request body.
 *
 * @param {Object} contact
 * @param {string} type
 * @returns {Object}
 */
function parseContact(contact, type) {
  const typeMap = {
    'Administrative': 'Admin',
    'Technical':      'Tech',
    'Billing':        'Billing',
    'Registrant':     'Registrant',
  };
  const apiType = typeMap[type] !== undefined ? typeMap[type] : type;

  // Input can be flat (AddressLine1) or nested (Address.Line1)
  let address = contact.AddressLine1 || (contact.Address && contact.Address.Line1) || '';
  const line2 = contact.AddressLine2 || (contact.Address && contact.Address.Line2) || '';
  if (line2) {
    address += ' ' + line2;
  }

  let phone   = contact.Phone || (contact.Phone && contact.Phone.Phone && contact.Phone.Phone.Number) || '';
  let phoneCc = contact.PhoneCountryCode || (contact.Phone && contact.Phone.Phone && contact.Phone.Phone.CountryCode) || '';
  let fax     = contact.Fax || (contact.Phone && contact.Phone.Fax && contact.Phone.Fax.Number) || '';
  let faxCc   = contact.FaxCountryCode || (contact.Phone && contact.Phone.Fax && contact.Phone.Fax.CountryCode) || '';

  // If Phone is an object (nested format), unwrap it
  if (phone && typeof phone === 'object') {
    phoneCc = (phone.Phone && phone.Phone.CountryCode) || '';
    phone   = (phone.Phone && phone.Phone.Number) || '';
  }
  if (fax && typeof fax === 'object') {
    faxCc = (fax.Fax && fax.Fax.CountryCode) || '';
    fax   = (fax.Fax && fax.Fax.Number) || '';
  }

  return {
    'contactType':      apiType,
    'firstName':        contact.FirstName || '',
    'lastName':         contact.LastName || '',
    'companyName':      contact.Company || '',
    'eMail':            contact.EMail || '',
    'address':          address,
    'city':             contact.City || (contact.Address && contact.Address.City) || '',
    'state':            contact.State || (contact.Address && contact.Address.State) || '',
    'country':          normalizeCountryCode(contact.Country || (contact.Address && contact.Address.Country) || ''),
    'postalCode':       contact.ZipCode || (contact.Address && contact.Address.ZipCode) || '',
    'phoneCountryCode': String(phoneCc),
    'phone':            String(phone),
    'faxCountryCode':   String(faxCc),
    'fax':              String(fax),
    // Required non-nullable bool in the gateway ContactLiteDto.
    'isHidden':         Boolean(contact.IsHidden || false),
  };
}

// ---------------------------------------------------------------------------
// parseDomainInfo
// PHP: DNARest.php lines 1628–1680
// ---------------------------------------------------------------------------
/**
 * Map raw gateway domain object → normalized {result, data:{...}} envelope.
 *
 * @param {Object|null} data
 * @returns {Object}
 */
function parseDomainInfo(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return {
      result: RESULT_ERROR,
      error: {
        Code: DEFAULT_ERRORS.RESPONSE.code,
        Message: DEFAULT_ERRORS.RESPONSE.message,
        Details: DEFAULT_ERRORS.RESPONSE.description,
      },
    };
  }
  return {
    result: RESULT_OK,
    data: {
      'ID':                      parseInt(data.id) || 0,
      'Status':                  normalizeDomainStatus(data.status ?? ''),
      'DomainName':              String(data.domainName || data.name || ''),
      'AuthCode':                String(data.authCode || data.eppCode || ''),
      'LockStatus':              data.lockStatus ? 'true' : 'false',
      'PrivacyProtectionStatus': data.privacyProtectionStatus ? 'true' : 'false',
      'IsChildNameServer':       data.hosts && data.hosts.length > 0 ? 'true' : 'false',
      'Contacts':                parseContactIds(data.contacts || []),
      'Dates': {
        'Start':         formatApiDate(data.startDate || null),
        'Expiration':    formatApiDate(data.expirationDate || null),
        // Prefer server-supplied remainingDay; derive from expirationDate if absent
        'RemainingDays': data.remainingDay !== undefined
          ? parseInt(data.remainingDay)
          : remainingDaysFromDate(data.expirationDate || null),
      },
      'NameServers':      Array.isArray(data.nameservers) ? data.nameservers.map(String) : [],
      'Additional':       data.additionalAttributes ? Object.assign({}, data.additionalAttributes) : [],
      'ChildNameServers': Array.isArray(data.hosts)
        ? data.hosts.map((ns) => {
            const ips = (ns.ipAddresses || []).map((ip) => ip.ipAddress);
            return {
              ns: ns.name,
              ip: ips.length > 0 ? ips[ips.length - 1] : '',
            };
          })
        : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  parseDomainInfo,
  parseContactInfo,
  parseContact,
  parseContactIds,
  normalizeDomainStatus,
  formatApiDate,
  remainingDaysFromDate,
  normalizeCountryCode,
  normalizeTrAttributes,
  stringifyAttributes,
  flattenValidationErrors,
  humanizeValidationMember,
};
