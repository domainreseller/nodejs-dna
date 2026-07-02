'use strict';

const { looksLikeUuid, VERSION, BUSINESS_METHODS } = require('./shared');
const DNASoap = require('./DNASoap');
const DNARest = require('./DNARest');

class DomainNameApi {
  static VERSION = VERSION;

  constructor(userName = 'ownername', password = 'ownerpass', testMode = false) {
    userName = String(userName).trim();
    password = String(password).trim();
    if (looksLikeUuid(userName)) {
      this.client = new DNARest(userName, password, testMode);
      this._transport = 'REST';
    } else {
      this.client = new DNASoap(userName, password, testMode);
      this._transport = 'SOAP';
    }
  }

  getActiveTransport() {
    return this._transport;
  }
}

// Delegate every public method to the active client.
for (const name of BUSINESS_METHODS) {
  DomainNameApi.prototype[name] = function delegate(...args) {
    return this.client[name](...args);
  };
}

module.exports = DomainNameApi;
