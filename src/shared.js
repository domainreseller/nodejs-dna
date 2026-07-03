'use strict';

const VERSION = '3.0.0';
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
};
