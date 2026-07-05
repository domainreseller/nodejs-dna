'use strict';

const { looksLikeUuid, VERSION, BUSINESS_METHODS } = require('./shared');
const DNASoap = require('./DNASoap');
const DNARest = require('./DNARest');

class DomainNameApi {
  static VERSION = VERSION;

  /**
   * @param {string} userName
   * @param {string} password
   * @param {boolean|{ testMode?: boolean, telemetry?: boolean, sentryDsn?: string }} [optionsOrTestMode=false]
   *   Passing a boolean is legacy shorthand for `{ testMode: <value> }`.
   */
  constructor(userName = 'ownername', password = 'ownerpass', optionsOrTestMode = false) {
    userName = String(userName).trim();
    password = String(password).trim();

    let testMode = false;
    let options = {};

    if (typeof optionsOrTestMode === 'boolean') {
      // Legacy positional: new DomainNameApi('u', 'p', true)
      testMode = optionsOrTestMode;
    } else if (optionsOrTestMode !== null && typeof optionsOrTestMode === 'object') {
      // Options object: new DomainNameApi('u', 'p', { testMode, telemetry, sentryDsn })
      const { testMode: tm = false, telemetry, sentryDsn } = optionsOrTestMode;
      testMode = Boolean(tm);
      if (telemetry !== undefined) options.telemetry = telemetry;
      if (sentryDsn !== undefined) options.sentryDsn = sentryDsn;
    }

    if (looksLikeUuid(userName)) {
      this.client = new DNARest(userName, password, testMode, options);
      this._transport = 'REST';
    } else {
      this.client = new DNASoap(userName, password, testMode, options);
      this._transport = 'SOAP';
    }
  }

  getActiveTransport() {
    return this._transport;
  }

  /**
   * Enable or disable error reporting on the underlying transport client.
   * @param {boolean} enabled
   * @returns {this}
   */
  setErrorReportingEnabled(enabled) {
    this.client.setErrorReportingEnabled(enabled);
    return this;
  }
}

// Delegate every public method to the active client.
for (const name of BUSINESS_METHODS) {
  DomainNameApi.prototype[name] = function delegate(...args) {
    return this.client[name](...args);
  };
}

module.exports = DomainNameApi;
