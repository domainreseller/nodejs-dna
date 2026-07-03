'use strict';

const https = require('node:https');
const axios = require('axios');
const { REST_URL_PROD, REST_URL_OTE, BUSINESS_METHODS, DEFAULT_TIMEOUT, setError, RESULT_OK } = require('./shared');
const { parseDomainInfo, parseContactInfo } = require('./rest-normalize');

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
