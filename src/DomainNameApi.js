'use strict';

const { VERSION, BUSINESS_METHODS } = require('./shared');
const DNARest = require('./DNARest');

class DomainNameApi {
  static VERSION = VERSION;

  /**
   * @param {string} resellerId  Reseller ID (UUID)
   * @param {string} apiKey      API Key
   * @param {boolean|{ testMode?: boolean, telemetry?: boolean, sentryDsn?: string }} [optionsOrTestMode=false]
   *   Passing a boolean is legacy shorthand for `{ testMode: <value> }`.
   */
  constructor(resellerId = '', apiKey = '', optionsOrTestMode = false) {
    resellerId = String(resellerId).trim();
    apiKey = String(apiKey).trim();

    let testMode = false;
    let options = {};

    if (typeof optionsOrTestMode === 'boolean') {
      // Legacy positional: new DomainNameApi(resellerId, apiKey, true)
      testMode = optionsOrTestMode;
    } else if (optionsOrTestMode !== null && typeof optionsOrTestMode === 'object') {
      // Options object: new DomainNameApi(resellerId, apiKey, { testMode, telemetry, sentryDsn })
      const { testMode: tm = false, telemetry, sentryDsn } = optionsOrTestMode;
      testMode = Boolean(tm);
      if (telemetry !== undefined) options.telemetry = telemetry;
      if (sentryDsn !== undefined) options.sentryDsn = sentryDsn;
    }

    this.client = new DNARest(resellerId, apiKey, testMode, options);
  }

  /**
   * Always 'REST' — kept for backward compatibility.
   * @returns {'REST'}
   */
  getActiveTransport() {
    return 'REST';
  }

  /**
   * Enable or disable error reporting on the underlying client.
   * @param {boolean} enabled
   * @returns {this}
   */
  setErrorReportingEnabled(enabled) {
    this.client.setErrorReportingEnabled(enabled);
    return this;
  }
}

// Delegate every public method to the REST client.
for (const name of BUSINESS_METHODS) {
  DomainNameApi.prototype[name] = function delegate(...args) {
    return this.client[name](...args);
  };
}

module.exports = DomainNameApi;
