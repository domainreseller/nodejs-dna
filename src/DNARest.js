'use strict';

const https = require('node:https');
const axios = require('axios');
const { REST_URL_PROD, REST_URL_OTE, BUSINESS_METHODS, DEFAULT_TIMEOUT, setError, formatErrorCode, RESULT_OK } = require('./shared');
const { parseDomainInfo, parseContactInfo, normalizeDomainStatus, formatApiDate } = require('./rest-normalize');

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
