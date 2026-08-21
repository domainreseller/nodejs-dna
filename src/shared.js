'use strict';

const VERSION = '3.0.2';
const APPLICATION_NAME = 'DomainNameAPI-NodeJS';

const SOAP_URL = 'https://whmcs.domainnameapi.com/DomainApi.svc?singlewsdl';
const REST_URL_PROD = 'https://api.domainresellerapi.com/api/v1';
const REST_URL_OTE = 'https://ote.domainresellerapi.com/api/v1';

// UUID username → REST; anything else → SOAP. Trim first so a copy-pasted,
// space-padded UUID still routes to REST (parity with php-dna).
function looksLikeUuid(value) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    String(value).trim(),
  );
}

// Single source of truth for the public PascalCase method surface. DNARest
// (Task 3) and the facade (Task 4) both build their delegations from this list.
const BUSINESS_METHODS = [
  'AddChildNameServer', 'DeleteChildNameServer', 'ModifyChildNameServer', 'GetContacts',
  'SaveContacts', 'Transfer', 'CancelTransfer', 'ApproveTransfer', 'RejectTransfer', 'Renew',
  'RegisterWithContactInfo', 'ModifyPrivacyProtectionStatus', 'SyncFromRegistry',
  'GetCurrentBalance', 'CheckAvailability', 'GetList', 'GetTldList', 'GetDetails', 'GetResellerDetails',
  // Phase 3 additions (Task 3): 4 new API methods + 2 pure utilities
  'ModifyNameServer', 'EnableTheftProtectionLock', 'DisableTheftProtectionLock', 'CheckTransfer',
  'ValidateContact', 'IsTrTLD',
];

const RESULT_OK = 'OK';
const RESULT_ERROR = 'ERROR';
const RESULT_SUCCESS = 'SUCCESS';
const DEFAULT_TIMEOUT = 30;
const DEFAULT_NAMESERVERS = ['ns1.domainnameapi.com', 'ns2.domainnameapi.com'];
const DEFAULT_REASON = 'Owner request';

const DOMAIN_STATUS_MAP = {
  0: 'Active', 1: 'WaitingForRegistration', 2: 'WaitingForDocument',
  3: 'WaitingForIncomingTransfer', 4: 'TransferredOut', 7: 'PendingDelete',
  8: 'Deleted', 9: 'ConfirmationEmailSend', 11: 'WaitingForOutgoingTransfer',
  12: 'PendingHold', 15: 'ModificationPending', 18: 'InCase', 19: 'PendingRestore',
};

// Ported verbatim from php-dna SharedApiConfigAndUtilsTrait.php $DEFAULT_ERRORS
const DEFAULT_ERRORS = {
  DOMAIN_DETAILS: {
    code: 'DOMAIN_DETAILS',
    message: 'Invalid domain details! Details format is not valid',
    description: 'The provided domain details are not in the expected format',
  },
  CREDENTIALS: {
    code: 'CREDENTIALS',
    message: 'Invalid username and password',
    description: 'The provided API credentials are invalid',
  },
  DOMAIN_LIST: {
    code: 'DOMAIN_LIST',
    message: 'The domain list is invalid or contains multiple entries!',
    description: 'The domain list response format is incorrect or unexpected',
  },
  TLD_LIST: {
    code: 'TLD_LIST',
    message: 'TLD info is not a valid array or more than one TLD info has returned!',
    description: 'The TLD list response is not in the expected format',
  },
  RESPONSE: {
    code: 'RESPONSE',
    message: 'Invalid response received from server! Response is empty.',
    description: 'The API response is empty or null',
  },
  RESPONSE_FORMAT: {
    code: 'RESPONSE_FORMAT',
    message: 'Invalid response received from server! Response format is not valid.',
    description: 'The API response format is not in the expected structure',
  },
  RESPONSE_COUNT: {
    code: 'RESPONSE_COUNT',
    message: 'Invalid parameters passed to function! Response data contains more than one result!',
    description: 'The API response contains multiple results when only one was expected',
  },
  RESPONSE_CODE: {
    code: 'RESPONSE_CODE',
    message: 'Invalid parameters passed to function! Operation result or Error code not received from server',
    description: 'The API response is missing required operation result or error code fields',
  },
  RESPONSE_SOAP: {
    code: 'RESPONSE_SOAP',
    message: 'Invalid parameters passed to function! Soap return is not a valid array!',
    description: 'The SOAP response is not in a valid array format',
  },
  RESPONSE_REST: {
    code: 'RESPONSE_REST',
    message: 'Invalid parameters passed to function! REST return is not a valid array!',
    description: 'The REST response is not in a valid array format',
  },
  CONTACT_INFO: {
    code: 'CONTACT_INFO',
    message: 'Invalid response received from server! Contact info is not a valid array or more than one contact info has returned!',
    description: 'The contact information response is not in the expected format',
  },
  CONTACT_SAVE: {
    code: 'CONTACT_SAVE',
    message: 'Invalid response received from server! Contact info could not be saved!',
    description: 'The contact information could not be saved on the server',
  },
  DOMAIN_TRANSFER_REQUEST: {
    code: 'DOMAIN_TRANSFER_REQUEST',
    message: 'Invalid response received from server! Domain transfer request could not be completed!',
    description: 'The domain transfer request failed to complete',
  },
  DOMAIN_RENEW: {
    code: 'DOMAIN_RENEW',
    message: 'Invalid response received from server! Domain renew request could not be completed!',
    description: 'The domain renewal request failed to complete',
  },
  DOMAIN_REGISTER: {
    code: 'DOMAIN_REGISTER',
    message: 'Invalid response received from server! Domain register request could not be completed!',
    description: 'The domain registration request failed to complete',
  },
  DOMAIN_SYNC: {
    code: 'DOMAIN_SYNC',
    message: 'Invalid response received from server! Domain sync request could not be completed!',
    description: 'The domain synchronization request failed to complete',
  },
};

// ---------------------------------------------------------------------------
// isTrTLD — ported from DNARest.php lines 1783–1786 (REST version, simpler).
// SOAP version (lines 1859–1864) is equivalent: preg_match('/\.tr$/', domain).
// ---------------------------------------------------------------------------
function isTrTLD(domain) {
  return String(domain).toLowerCase().endsWith('.tr');
}

// ---------------------------------------------------------------------------
// validateContact — ported verbatim from DNASoap.php lines 1785–1850 /
// DNARest.php lines 1844–1909 (code is byte-for-byte identical in both).
// Fills missing / empty fields with Turkish-locale defaults and normalises
// the phone number. Returns the mutated contact object — never errors.
// ---------------------------------------------------------------------------
const VALIDATE_CONTACT_DEFAULTS = {
  FirstName:        'Isimyok',
  LastName:         'Isimyok',
  AddressLine1:     'Addres yok',
  City:             'ISTANBUL',
  Country:          'TR',
  ZipCode:          '34000',
  Phone:            '5555555555',
  PhoneCountryCode: '90',
};

function validateContact(contact) {
  const defaults = VALIDATE_CONTACT_DEFAULTS;

  // Fill missing keys with default values
  for (const [key, value] of Object.entries(defaults)) {
    if (contact[key] == null) {
      contact[key] = value;
    }
  }

  // Check empty values and fill with defaults
  if (String(contact.FirstName).trim().length === 0) {
    contact.FirstName = defaults.FirstName;
  }
  if (String(contact.LastName).trim().length === 0) {
    contact.LastName = contact.FirstName;
  }
  if (String(contact.AddressLine1).trim().length === 0) {
    contact.AddressLine1 = defaults.AddressLine1;
  }
  if (String(contact.City).trim().length === 0) {
    contact.City = defaults.City;
  }
  if (String(contact.Country).trim().length === 0) {
    contact.Country = defaults.Country;
  }
  if (String(contact.ZipCode).trim().length === 0) {
    contact.ZipCode = defaults.ZipCode;
  }

  // Phone number processing — strip non-digits, then split country code
  const tmpPhone = contact.Phone != null
    ? String(contact.Phone).replace(/[^0-9]/g, '')
    : '';

  if (tmpPhone.length === 10) {
    contact.PhoneCountryCode = '';
    contact.Phone = tmpPhone;
  } else if (tmpPhone.length === 11 && tmpPhone.charAt(0) === '9') {
    contact.PhoneCountryCode = tmpPhone.substring(0, 2);
    contact.Phone = tmpPhone.substring(2);
  } else if (tmpPhone.length === 12 && tmpPhone.substring(0, 2) === '90') {
    contact.PhoneCountryCode = tmpPhone.substring(0, 2);
    contact.Phone = tmpPhone.substring(2);
  } else {
    contact.PhoneCountryCode = defaults.PhoneCountryCode;
    contact.Phone = tmpPhone || defaults.Phone;
  }

  if (String(contact.PhoneCountryCode).trim().length === 0) {
    contact.PhoneCountryCode = defaults.PhoneCountryCode;
  }
  if (String(contact.Phone).trim().length === 0) {
    contact.Phone = defaults.Phone;
  }

  return contact;
}

function formatErrorCode(code) {
  return typeof code === 'number' || /^\d+$/.test(String(code)) ? `API_${code}` : String(code);
}

function setError(code, message = '', details = '') {
  const known = DEFAULT_ERRORS[code];
  if (known) {
    return { result: RESULT_ERROR, error: { Code: known.code, Message: known.message, Details: known.description } };
  }
  return { result: RESULT_ERROR, error: { Code: formatErrorCode(code), Message: message, Details: details } };
}

module.exports = {
  VERSION, APPLICATION_NAME, SOAP_URL, REST_URL_PROD, REST_URL_OTE, looksLikeUuid, BUSINESS_METHODS,
  RESULT_OK, RESULT_ERROR, RESULT_SUCCESS,
  DEFAULT_TIMEOUT, DEFAULT_NAMESERVERS, DEFAULT_REASON,
  DOMAIN_STATUS_MAP, DEFAULT_ERRORS,
  formatErrorCode, setError,
  isTrTLD, validateContact, VALIDATE_CONTACT_DEFAULTS,
};
