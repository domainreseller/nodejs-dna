'use strict';

const https = require('node:https');
const axios = require('axios');
const { REST_URL_PROD, REST_URL_OTE, BUSINESS_METHODS, DEFAULT_TIMEOUT, setError, formatErrorCode, RESULT_OK } = require('./shared');
const { parseDomainInfo, parseContactInfo, parseContact, normalizeDomainStatus, formatApiDate } = require('./rest-normalize');

// Module-level axios instance: never throws on non-2xx; SSL verification off.
const _httpsAgent = new https.Agent({ rejectUnauthorized: false });
const _axiosInstance = axios.create({
  validateStatus: () => true,
  httpsAgent: _httpsAgent,
});

class DNARest {
  constructor(resellerId, token, testMode = false) {
    this.resellerId = resellerId;
    this.token = token;
    this.serviceUrl = testMode ? REST_URL_OTE : REST_URL_PROD;
    this.lastRequest = null;
    this.lastResponse = null;
    this.lastResponseHeaders = null;
    this.lastParsedResponse = null;
    // Exposed so tests can inject a fake callable.
    this._axios = _axiosInstance;
  }

  /**
   * Core HTTP method. All business methods delegate here (directly or via
   * the get/post/put/delete wrappers).
   *
   * @param {string} method   HTTP verb — 'GET'|'POST'|'PUT'|'DELETE'
   * @param {string} endpoint Path relative to serviceUrl (leading slash optional)
   * @param {object} data     Query params (GET/DELETE) or JSON body (POST/PUT)
   * @returns {Promise<object>} Parsed response body on 2xx
   */
  async request(method, endpoint, data = {}) {
    const url = `${this.serviceUrl}/${endpoint.replace(/^\//, '')}`;

    const config = {
      method,
      url,
      headers: {
        'X-API-KEY': this.token,
        '__reseller': this.resellerId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT * 1000,
    };

    // GET and DELETE pass data as query params; POST and PUT send JSON body.
    const upperMethod = method.toUpperCase();
    if (upperMethod === 'GET' || upperMethod === 'DELETE') {
      config.params = data;
    } else {
      config.data = data;
    }

    this.lastRequest = { method, url, data };

    let response;
    try {
      response = await this._axios(config);
    } catch (err) {
      // Network-level error (no response received).
      const code = err.code || err.errno || 'UNKNOWN';
      this.lastParsedResponse = setError(`CURL_${code}`, err.message, '');
      return {};
    }

    const status = response.status;
    this.lastResponse = response.data;
    this.lastResponseHeaders = response.headers;

    // 301/302 — treat as bad credentials (mirrors php-dna redirect behaviour).
    if (status === 301 || status === 302) {
      return { message: 'Invalid API credentials', code: 'CREDENTIALS', details: '' };
    }

    // 2xx — happy path.
    if (status >= 200 && status < 300) {
      return response.data;
    }

    // Non-2xx — throw so business methods can catch and map to error envelopes.
    const err = new Error(`HTTP ${status}`);
    err.statusCode = status;
    throw err;
  }

  /** Convenience wrapper: GET request */
  get(url, params = {}) {
    return this.request('GET', url, params);
  }

  /** Convenience wrapper: POST request */
  post(url, params = {}) {
    return this.request('POST', url, params);
  }

  /** Convenience wrapper: PUT request */
  put(url, params = {}) {
    return this.request('PUT', url, params);
  }

  /** Convenience wrapper: DELETE request */
  delete(url, params = {}) {
    return this.request('DELETE', url, params);
  }
}

// ---------------------------------------------------------------------------
// Task 4: Domain info group — GetDetails, SyncFromRegistry, GetContacts
// PHP source: DNARest.php lines 819–832 (#6), 1572–1575 (#19), 1024–1066 (#10)
// These must be assigned BEFORE the skeleton loop so the guard skips them.
// ---------------------------------------------------------------------------

/**
 * Fetch full domain info for a single domain.
 * GET domains/info {DomainName} → parseDomainInfo(raw)
 */
DNARest.prototype.GetDetails = async function GetDetails(domainName) {
  try {
    const raw = await this.request('GET', 'domains/info', { DomainName: domainName });
    return parseDomainInfo(raw);
  } catch (err) {
    return setError(err.statusCode || 'DOMAIN_DETAILS', err.message, '');
  }
};

/**
 * Sync domain info from registry — pure passthrough to GetDetails.
 * PHP: return $this->getDetails($domainName);  (lines 1572–1575)
 */
DNARest.prototype.SyncFromRegistry = async function SyncFromRegistry(domainName) {
  return this.GetDetails(domainName);
};

/**
 * Get contacts for a domain.
 * GET domains/info {DomainName}; extract contacts array; map REST contactType
 * (Admin→Administrative, Tech→Technical, Billing→Billing, Registrant→Registrant);
 * call parseContactInfo per contact; return ordered Administrative, Billing,
 * Registrant, Technical.
 */
DNARest.prototype.GetContacts = async function GetContacts(domainName) {
  try {
    const domainInfo = await this.request('GET', 'domains/info', { DomainName: domainName });

    const typeMap = {
      'Admin':      'Administrative',
      'Billing':    'Billing',
      'Tech':       'Technical',
      'Registrant': 'Registrant',
    };

    const contacts = {};
    if (Array.isArray(domainInfo.contacts)) {
      for (const contactItem of domainInfo.contacts) {
        const apiType = contactItem.contactType || '';
        const soapKey = typeMap[apiType] !== undefined
          ? typeMap[apiType]
          : (apiType.charAt(0).toUpperCase() + apiType.slice(1).toLowerCase());
        contacts[soapKey] = parseContactInfo(Object.assign({}, contactItem, { type: soapKey }));
      }
    }

    const orderedContacts = {};
    for (const key of ['Administrative', 'Billing', 'Registrant', 'Technical']) {
      if (contacts[key] !== undefined) {
        orderedContacts[key] = contacts[key];
      }
    }

    return {
      result: RESULT_OK,
      data: { contacts: orderedContacts },
    };
  } catch (err) {
    return setError(err.statusCode || 'GET_CONTACTS', err.message, '');
  }
};

// ---------------------------------------------------------------------------
// Task 5: Reseller account group — GetResellerDetails, GetCurrentBalance
// PHP source: DNARest.php lines 507–554 (#1), 561–603 (#2)
// Both hit GET deposit/accounts/me; they use distinct response envelopes.
// ---------------------------------------------------------------------------

/**
 * Fetch reseller account details (id, name, balances).
 * GET deposit/accounts/me — no query params.
 * PHP lines 507–554.
 */
DNARest.prototype.GetResellerDetails = async function GetResellerDetails() {
  try {
    const resp = await this.request('GET', 'deposit/accounts/me', {});

    if (resp != null && resp.resellerId !== undefined) {
      return {
        result:   RESULT_OK,
        id:       resp.resellerId,
        active:   true,
        name:     resp.resellerName ?? '',
        balance:  String(resp.usdBalance ?? 0),
        currency: 'USD',
        symbol:   '$',
        balances: [
          { balance: String(resp.usdBalance ?? 0), currency: 'USD', symbol: '$' },
          { balance: String(resp.tryBalance ?? 0), currency: 'TL',  symbol: 'TL' },
        ],
      };
    }

    // resellerId absent — treat as bad credentials (mirrors PHP line 541–544).
    return setError('CREDENTIALS', 'Invalid response format',
      'Response does not contain required fields');

  } catch (err) {
    return setError(
      err.statusCode || 'RESELLER_DETAILS',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

// Currency lookup table: mirrors PHP lines 566–571.
const _CURRENCY_MAP = {
  USD: { id: 2, name: 'USD', symbol: '$'  },
  TRY: { id: 1, name: 'TL',  symbol: 'TL' },
  EUR: { id: 3, name: 'EUR', symbol: '€'  },
  GBP: { id: 4, name: 'GBP', symbol: '£'  },
};

/**
 * Get current balance for the given currency.
 * GET deposit/accounts/me {currency: <UPPERCASED>}
 * Returns a DISTINCT envelope (not {result:'OK'}), matching SOAP parity.
 * PHP lines 561–603.
 *
 * number_format(x, 2, '.', '') → JS: parseFloat(x || 0).toFixed(2)
 * (2 decimal places, dot separator, no thousands separator — identical output)
 *
 * @param {string} [currencyId='USD']
 */
DNARest.prototype.GetCurrentBalance = async function GetCurrentBalance(currencyId = 'USD') {
  const currencyName = String(currencyId).toUpperCase();
  const mapped = _CURRENCY_MAP[currencyName] || { id: 0, name: currencyName, symbol: '' };

  try {
    const resp = await this.request('GET', 'deposit/accounts/me', { currency: currencyName });

    // Build balance key: strtolower($currencyId).'Balance' (PHP line 577).
    const balanceKey = String(currencyId).toLowerCase() + 'Balance';
    const rawBalance = parseFloat(resp[balanceKey] ?? 0) || 0;

    return {
      ErrorCode:        0,
      OperationMessage: 'Command completed succesfully.',
      OperationResult:  'SUCCESS',
      Balance:          rawBalance.toFixed(2),
      CurrencyId:       mapped.id,
      CurrencyInfo:     null,
      CurrencyName:     mapped.name,
      CurrencySymbol:   mapped.symbol,
    };
  } catch (err) {
    // Error envelope preserves the same shape — OperationResult signals failure.
    // PHP line 593: formatErrorCode($e->getCode()) ?: 'BALANCE'
    return {
      ErrorCode:        formatErrorCode(err.statusCode) || 'BALANCE',
      OperationMessage: err.message,
      OperationResult:  'FAILED',
      Balance:          '0.00',
      CurrencyId:       mapped.id,
      CurrencyInfo:     null,
      CurrencyName:     mapped.name,
      CurrencySymbol:   mapped.symbol,
    };
  }
};

// ---------------------------------------------------------------------------
// Task 6: Search / list group — CheckAvailability, GetList, GetTldList
// PHP source: DNARest.php lines 613–665 (#3), 672–725 (#4), 732–812 (#5)
// ---------------------------------------------------------------------------

/**
 * Check domain availability for a cartesian product of names × extensions.
 * POST domains/bulk-search
 * Returns a DIRECT ARRAY (not a {result:'OK'} envelope) on success.
 * PHP lines 613–665.
 *
 * @param {string[]} domains     e.g. ['example', 'test']
 * @param {string[]} extensions  e.g. ['com', '.net']
 * @param {number}   period      default period when API item has none
 * @param {string}   [command]   'create' by default
 * @returns {Promise<Array|{result:'ERROR', error:{...}}>}
 */
DNARest.prototype.CheckAvailability = async function CheckAvailability(
  domains, extensions, period, command = 'create',
) {
  try {
    const queries = [];
    for (const domain of domains) {
      for (const tld of extensions) {
        queries.push({ domainName: domain + '.' + tld.replace(/^\./, '') });
      }
    }

    if (queries.length === 0) {
      return setError('AVAILABILITY', 'Domain names not found.', 'No domain names provided for availability check');
    }

    const response = await this.request('POST', 'domains/bulk-search', queries);

    const availabilityData = [];
    const items = (response && response.infos) ? response.infos : response;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const rawTld = item.tld != null
          ? String(item.tld).toLowerCase()
          : (() => {
              const dn = String(item.domainName || '');
              const idx = dn.lastIndexOf('.');
              return idx >= 0 ? dn.slice(idx + 1).toLowerCase() : '';
            })();

        const domainRaw = String(item.domainName || '').toLowerCase();
        const domainName = rawTld ? domainRaw.replace('.' + rawTld, '') : domainRaw;

        const status = String(item.status != null ? item.status : '').toLowerCase();
        const isAvailable = ['available', '1', 'true'].includes(status);

        const rawPrice = item.price != null ? parseFloat(item.price) : null;

        availabilityData.push({
          TLD:        rawTld,
          DomainName: domainName,
          Status:     isAvailable ? 'available' : 'notavailable',
          Command:    command,
          Period:     item.period != null ? item.period : period,
          IsFee:      item.isPremium != null ? item.isPremium : false,
          Price:      rawPrice != null ? rawPrice.toFixed(4) : null,
          Currency:   item.currency != null ? item.currency : null,
          Reason:     item.reason != null ? item.reason : null,
        });
      }
    }

    return availabilityData;
  } catch (err) {
    return setError(
      formatErrorCode(err.statusCode) || 'AVAILABILITY',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Get list of domains in the reseller account.
 * GET domains {MaxResultCount:200, SkipCount:0, ...extra_parameters}
 * PHP lines 672–725.
 *
 * @param {Object} [extra_parameters={}]
 * @returns {Promise<{result:string, TotalCount:number, data:{Domains:Array}}>}
 */
DNARest.prototype.GetList = async function GetList(extra_parameters = {}) {
  try {
    const params = Object.assign({ MaxResultCount: 200, SkipCount: 0 }, extra_parameters);
    const response = await this.request('GET', 'domains', params);

    const domains = Array.isArray(response && response.items)
      ? response.items.map((item) => {
          // Prefer statusCode label > statusText > numeric status resolution.
          let status;
          if (item.statusCode != null && String(item.statusCode) !== '' && !/^\d+$/.test(String(item.statusCode))) {
            status = String(item.statusCode);
          } else if (item.statusText != null && String(item.statusText) !== '' && !/^\d+$/.test(String(item.statusText))) {
            status = String(item.statusText);
          } else {
            status = normalizeDomainStatus(item.status != null ? item.status : '');
          }

          return {
            ID:                      parseInt(item.id) || 0,
            Status:                  status,
            DomainName:              item.domainName != null ? String(item.domainName) : '',
            AuthCode:                item.authCode != null ? String(item.authCode) : '',
            LockStatus:              item.lockStatus ? 'true' : 'false',
            PrivacyProtectionStatus: item.privacyProtectionStatus ? 'true' : 'false',
            IsChildNameServer:       (item.hosts && item.hosts.length > 0) ? 'true' : 'false',
            Contacts: {
              Billing:        { ID: '' },
              Technical:      { ID: '' },
              Administrative: { ID: '' },
              Registrant:     { ID: '' },
            },
            Dates: {
              Start:         formatApiDate(item.startDate != null ? item.startDate : null),
              Expiration:    formatApiDate(item.expirationDate != null ? item.expirationDate : null),
              RemainingDays: parseInt(item.remainingDay) || 0,
            },
            NameServers:      Array.isArray(item.nameServers) ? item.nameServers : [],
            Additional:       [],
            ChildNameServers: [],
          };
        })
      : [];

    return {
      result:     RESULT_OK,
      TotalCount: parseInt((response && response.totalCount) || 0) || 0,
      data: { Domains: domains },
    };
  } catch (err) {
    return setError(
      formatErrorCode(err.statusCode) || 'DOMAIN_LIST',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Get TLD list with pricing matrix.
 * GET products/tlds {MaxResultCount:count, SkipCount:0}
 * PHP lines 732–812.
 *
 * Pricing: built from prices[0][apiType]; period 0 → 1; sorted ascending.
 * Source key typo 'maxLenght' (missing 't') preserved verbatim.
 *
 * @param {number} [count=20]
 * @returns {Promise<{result:string, data:Array}>}
 */
DNARest.prototype.GetTldList = async function GetTldList(count = 20) {
  try {
    const response = await this.get('products/tlds', { MaxResultCount: count, SkipCount: 0 });

    const priceTypeMap = {
      register:  'registration',
      renew:     'renew',
      transfer:  'transfer',
      restore:   'restore',
      refund:    'refund',
      backorder: 'backorder',
    };

    const tldData = [];
    let idCounter = 1;

    if (response && Array.isArray(response.items)) {
      for (const tld of response.items) {
        const pricing    = {};
        const currencies = {};

        const pricesArr = tld.prices && tld.prices[0];
        if (pricesArr && typeof pricesArr === 'object') {
          for (const [apiType, outType] of Object.entries(priceTypeMap)) {
            const apiValue = pricesArr[apiType];
            if (apiValue == null) continue;

            if (Array.isArray(apiValue) && apiValue[0] != null) {
              // Array of price objects
              for (const priceInfo of apiValue) {
                if (!priceInfo || typeof priceInfo !== 'object') continue;
                let p = parseInt(priceInfo.period != null ? priceInfo.period : 1) || 1;
                if (p < 1) p = 1;
                const price = priceInfo.price != null ? parseFloat(priceInfo.price).toFixed(4) : '0.0000';
                if (!pricing[outType]) pricing[outType] = {};
                pricing[outType][p] = price;
                currencies[outType] = priceInfo.currency != null ? priceInfo.currency : '';
              }
            } else if (apiValue && typeof apiValue === 'object') {
              // Single price object
              let p = parseInt(apiValue.period != null ? apiValue.period : 1) || 1;
              if (p < 1) p = 1;
              const price = apiValue.price != null ? parseFloat(apiValue.price).toFixed(4) : '0.0000';
              if (!pricing[outType]) pricing[outType] = {};
              pricing[outType][p] = price;
              currencies[outType] = apiValue.currency != null ? apiValue.currency : '';
            }
          }
        }

        // Sort pricing by period key numerically (SOAP ascending order)
        for (const outType of Object.keys(pricing)) {
          const sorted = {};
          for (const k of Object.keys(pricing[outType]).map(Number).sort((a, b) => a - b)) {
            sorted[k] = pricing[outType][k];
          }
          pricing[outType] = sorted;
        }

        tldData.push({
          id:        idCounter++,
          status:    tld.status != null ? tld.status : 'Active',
          maxchar:   (tld.constraints && tld.constraints.maxLenght != null) ? tld.constraints.maxLenght : 63,
          maxperiod: tld.maxRegistrationPeriod != null ? tld.maxRegistrationPeriod : 10,
          minchar:   (tld.constraints && tld.constraints.minLength != null) ? tld.constraints.minLength : 1,
          minperiod: tld.minRegistrationPeriod != null ? tld.minRegistrationPeriod : 1,
          tld:       tld.name,
          pricing,
          currencies,
        });
      }
    }

    return { result: RESULT_OK, data: tldData };
  } catch (err) {
    return setError(
      formatErrorCode(err.statusCode) || 'TLD_LIST',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

// ---------------------------------------------------------------------------
// Task 7: Child nameserver group — AddChildNameServer, DeleteChildNameServer,
//         ModifyChildNameServer
// PHP source: DNARest.php lines 919–948 (#7), 956–978 (#8), 987–1017 (#9)
// All three hit endpoint domains/dns/host with different HTTP verbs.
// ---------------------------------------------------------------------------

/**
 * Add a child nameserver to a domain.
 * POST domains/dns/host
 * PHP lines 919–948.
 *
 * ipVersion: 'v6' if ipAddress contains ':', else 'v4' (mirrors PHP
 * filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ? 'v4' : 'v6').
 * Note: response key 'IPAdresses' carries a one-'d' typo — preserved verbatim.
 *
 * @param {string} domainName
 * @param {string} nameServer  hostname of the child nameserver (e.g. ns1.example.com)
 * @param {string} ipAddress   IPv4 or IPv6 address
 */
DNARest.prototype.AddChildNameServer = async function AddChildNameServer(domainName, nameServer, ipAddress) {
  try {
    const ipVersion = ipAddress.includes(':') ? 'v6' : 'v4';
    const payload = {
      domainName,
      hostName:    nameServer,
      ipAddresses: [{ ipAddress, ipVersion }],
    };
    await this.request('POST', 'domains/dns/host', payload);
    return {
      result: RESULT_OK,
      data: {
        NameServer: nameServer,
        IPAdresses: [ipAddress],   // one-'d' typo preserved from PHP line 938
      },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'ADD_CHILD_NS',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Delete a child nameserver from a domain.
 * DELETE domains/dns/host (params sent as query string)
 * PHP lines 956–978.
 *
 * @param {string} domainName
 * @param {string} nameServer  hostname of the child nameserver to remove
 */
DNARest.prototype.DeleteChildNameServer = async function DeleteChildNameServer(domainName, nameServer) {
  try {
    const payload = {
      domainName,
      hostName: nameServer,
    };
    await this.request('DELETE', 'domains/dns/host', payload);
    return {
      result: RESULT_OK,
      data: { NameServer: nameServer },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'DELETE_CHILD_NS',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Modify the IP address of an existing child nameserver.
 * PUT domains/dns/host
 * PHP lines 987–1017.
 *
 * newHostName is set to the same value as hostName (rename not supported here).
 * Response fallbacks: NameServer → response.hostName ?? nameServer,
 *                     IPAdresses → response.ipAddresses ?? [ipAddress]
 * Note: 'IPAdresses' typo preserved verbatim (one 'd').
 *
 * @param {string} domainName
 * @param {string} nameServer  existing hostname
 * @param {string} ipAddress   new IP address
 */
DNARest.prototype.ModifyChildNameServer = async function ModifyChildNameServer(domainName, nameServer, ipAddress) {
  try {
    const ipVersion = ipAddress.includes(':') ? 'v6' : 'v4';
    const payload = {
      domainName,
      hostName:    nameServer,
      newHostName: nameServer,
      ipAddresses: [{ ipAddress, ipVersion }],
    };
    const response = await this.request('PUT', 'domains/dns/host', payload);
    return {
      result: RESULT_OK,
      data: {
        NameServer: (response && response.hostName != null ? response.hostName : null) ?? nameServer,
        IPAdresses: (response && response.ipAddresses != null ? response.ipAddresses : null) ?? [ipAddress],
      },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'MODIFY_CHILD_NS',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

// ---------------------------------------------------------------------------
// Task 8: Transfer group — Transfer, CancelTransfer, ApproveTransfer, RejectTransfer
// PHP source: DNARest.php lines 1111–1138 (#12), 1145–1164 (#13), 1171–1190 (#14), 1197–1216 (#15)
// ---------------------------------------------------------------------------

/**
 * Initiate a domain transfer.
 * POST domains/transfer
 * PHP lines 1111–1138.
 *
 * contacts mirrors PHP's associative array: { Administrative: {...}, Technical: {...}, ... }
 * Each entry is mapped via parseContact(details, ucfirst(strtolower(type))) before
 * being sent to the gateway, matching the PHP foreach loop exactly.
 * An empty array (default) sends an empty contacts array in the payload.
 *
 * @param {string}       domainName
 * @param {string}       eppCode     EPP/auth code for the transfer
 * @param {number}       period      Registration period in years
 * @param {Object|Array} [contacts=[]]  Contact objects keyed by type
 */
DNARest.prototype.Transfer = async function Transfer(domainName, eppCode, period, contacts = []) {
  try {
    const payloadContacts = [];
    const hasContacts = Array.isArray(contacts) ? contacts.length > 0 : Object.keys(contacts).length > 0;
    if (hasContacts) {
      // Support both object { Administrative: {...} } and array [{ type, ... }] forms.
      const entries = Array.isArray(contacts)
        ? contacts.map((c) => { const { type = 'Registrant', ...rest } = c; return [type, rest]; })
        : Object.entries(contacts);
      for (const [type, details] of entries) {
        // PHP: ucfirst(strtolower($type)) — first char upper, rest lower
        const normalized = String(type).charAt(0).toUpperCase() + String(type).slice(1).toLowerCase();
        payloadContacts.push(parseContact(details, normalized));
      }
    }

    const payload = {
      domainName,
      authCode: eppCode,
      period,
      contacts: payloadContacts,
    };

    const response = await this.request('POST', 'domains/transfer', payload);
    return parseDomainInfo(response);
  } catch (err) {
    return setError(
      err.statusCode || 'TRANSFER_DOMAIN',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Cancel a pending incoming transfer.
 * POST domains/transfers/cancel
 * PHP lines 1145–1164.
 *
 * @param {string} domainName
 */
DNARest.prototype.CancelTransfer = async function CancelTransfer(domainName) {
  try {
    const response = await this.request('POST', 'domains/transfers/cancel', { domainName });
    return {
      result: RESULT_OK,
      data: {
        DomainName: domainName,
        Status:     response.status ?? 'Cancelled',
      },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'CANCEL_TRANSFER',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Approve a pending outgoing transfer.
 * POST domains/transfers/approve
 * PHP lines 1171–1190.
 *
 * @param {string} domainName
 */
DNARest.prototype.ApproveTransfer = async function ApproveTransfer(domainName) {
  try {
    const response = await this.request('POST', 'domains/transfers/approve', { domainName });
    return {
      result: RESULT_OK,
      data: {
        DomainName: domainName,
        Status:     response.status ?? 'Approved',
      },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'APPROVE_TRANSFER',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Reject a pending outgoing transfer.
 * POST domains/transfers/reject
 * PHP lines 1197–1216.
 *
 * @param {string} domainName
 */
DNARest.prototype.RejectTransfer = async function RejectTransfer(domainName) {
  try {
    const response = await this.request('POST', 'domains/transfers/reject', { domainName });
    return {
      result: RESULT_OK,
      data: {
        DomainName: domainName,
        Status:     response.status ?? 'Rejected',
      },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'REJECT_TRANSFER',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

// ---------------------------------------------------------------------------
// Task 9: Lifecycle group — Renew, ModifyPrivacyProtectionStatus, SaveContacts
// PHP source: DNARest.php lines 1224–1251 (#16), 1541–1565 (#18), 1074–1101 (#11)
// ---------------------------------------------------------------------------

/**
 * Renew a domain registration.
 * POST domains/renew
 * PHP lines 1224–1251.
 *
 * If the response contains a truthy expirationDate, return success with
 * ExpirationDate formatted via formatApiDate. If expirationDate is falsy,
 * return the DOMAIN_RENEW error (mirrors PHP line 1237–1242 else-branch).
 *
 * @param {string} domainName
 * @param {number} period  Renewal period in years
 */
DNARest.prototype.Renew = async function Renew(domainName, period) {
  try {
    const response = await this.request('POST', 'domains/renew', { domainName, period });

    if (response && response.expirationDate) {
      return {
        result: RESULT_OK,
        data: { ExpirationDate: formatApiDate(response.expirationDate) },
      };
    }

    // Falsy expirationDate — mirrors PHP line 1237–1242
    return setError('DOMAIN_RENEW');
  } catch (err) {
    return setError(
      err.statusCode || 'RENEW_DOMAIN',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Modify privacy protection status for a domain.
 * POST domains/privacy
 * PHP lines 1541–1565.
 *
 * $reason is accepted but NOT sent to the API (ignored — matches PHP).
 * PrivacyProtectionStatus in the success response is the INPUT $status,
 * not the API response value (mirrors PHP line 1554).
 * privacyStatus in the payload uses strict boolean coercion (PHP: $status===true).
 *
 * @param {string}  domainName
 * @param {boolean} status
 * @param {string}  [reason='Owner request']  Accepted but ignored
 */
DNARest.prototype.ModifyPrivacyProtectionStatus = async function ModifyPrivacyProtectionStatus(
  domainName, status, reason = 'Owner request',
) {
  // reason accepted but not sent (PHP line 1544–1547: only used as default-fill,
  // never forwarded to the API payload).
  void reason;
  try {
    const payload = { domainName, privacyStatus: Boolean(status) };
    await this.request('POST', 'domains/privacy', payload);

    return {
      result: RESULT_OK,
      data: { PrivacyProtectionStatus: status },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'MODIFY_PRIVACY',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

/**
 * Update contacts for a domain.
 * PUT domains/contacts/update
 * PHP lines 1074–1101.
 *
 * Input contacts must be in associative-object form: { Administrative: {...}, ... }.
 * Each entry is mapped via parseContact(details, ucfirst(strtolower(type))) before
 * sending (PHP line 1079).
 * Response contacts (array) are keyed by ucfirst(strtolower(contact.type)) and
 * each parsed via parseContactInfo (PHP line 1086).
 *
 * @param {string} domainName
 * @param {Object} contacts  Associative: { Administrative: {...}, Technical: {...}, ... }
 */
DNARest.prototype.SaveContacts = async function SaveContacts(domainName, contacts) {
  try {
    // Map input contacts: { Type: details } → REST array via parseContact
    const payloadContacts = [];
    for (const [type, details] of Object.entries(contacts)) {
      // PHP: ucfirst(strtolower($type)) — lowercase all then uppercase first char
      const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      payloadContacts.push(parseContact(details, normalized));
    }

    const response = await this.request('PUT', 'domains/contacts/update', {
      domainName,
      contacts: payloadContacts,
    });

    // Map response contacts array → keyed object via parseContactInfo
    const parsedContacts = {};
    if (response && Array.isArray(response.contacts)) {
      for (const contact of response.contacts) {
        // PHP: ucfirst(strtolower($contact['type']))
        const rawType = String(contact.type || contact.contactType || '');
        const typeKey = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
        parsedContacts[typeKey] = parseContactInfo(contact);
      }
    }

    return {
      result: RESULT_OK,
      data: { contacts: parsedContacts },
    };
  } catch (err) {
    return setError(
      err.statusCode || 'SAVE_CONTACTS',
      err.message,
      (this.lastParsedResponse && this.lastParsedResponse.Details) ||
        (this.lastResponse && this.lastResponse.raw_response) ||
        err.message,
    );
  }
};

// ---------------------------------------------------------------------------

// Install skeletons that throw until the method-specific task fills them in.
// The loop only writes to names NOT already defined on the prototype, so the
// real methods above (request, get, post, put, delete) are never overwritten.
for (const name of BUSINESS_METHODS) {
  if (!(name in DNARest.prototype)) {
    DNARest.prototype[name] = function notImplemented() {
      throw new Error(`DNARest.${name}() is not implemented yet (Phase 2)`);
    };
  }
}

module.exports = DNARest;
