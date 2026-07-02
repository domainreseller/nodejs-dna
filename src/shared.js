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

module.exports = {
  VERSION, APPLICATION_NAME, SOAP_URL, REST_URL_PROD, REST_URL_OTE, looksLikeUuid, BUSINESS_METHODS,
};
