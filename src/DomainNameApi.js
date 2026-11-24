'use strict';

const { VERSION, BUSINESS_METHODS } = require('./shared');
const DNARest = require('./DNARest');

class DomainNameApi {
  static VERSION = VERSION;

  /**
   * @param {string} resellerId  Reseller ID (UUID)
   * @param {string} apiKey      API Key
   * @param {boolean|{ testMode?: boolean, telemetry?: boolean, sentryDsn?: string, clientInfo?: { app: string, version?: string } }} [optionsOrTestMode=false]
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
      const { testMode: tm = false, telemetry, sentryDsn, clientInfo } = optionsOrTestMode;
      testMode = Boolean(tm);
      if (telemetry !== undefined) options.telemetry = telemetry;
      if (sentryDsn !== undefined) options.sentryDsn = sentryDsn;
      if (clientInfo !== undefined) options.clientInfo = clientInfo;
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

  /**
   * Identify the integration that uses the library: every API request then
   * carries X-App (lowercase application name) and X-Version (its version,
   * digits and dots only). Without this call: X-App: nodejs and the library version.
   *
   * Example: api.setClientInfo('wisecp', '2.0.20');
   *
   * @param {string} app
   * @param {string} [version]
   * @returns {this}
   */
  setClientInfo(app, version = '') {
    this.client.setClientInfo(app, version);
    return this;
  }

  /**
   * The X-App and X-Version values sent with every request.
   * @returns {{ app: string, version: string }}
   */
  getClientInfo() {
    return this.client.getClientInfo();
  }
}

// Delegate every public method to the REST client.
for (const name of BUSINESS_METHODS) {
  DomainNameApi.prototype[name] = function delegate(...args) {
    return this.client[name](...args);
  };
}

module.exports = DomainNameApi;
