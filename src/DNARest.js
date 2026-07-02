'use strict';

const { REST_URL_PROD, REST_URL_OTE, BUSINESS_METHODS } = require('./shared');

class DNARest {
  constructor(resellerId, token, testMode = false) {
    this.resellerId = resellerId;
    this.token = token;
    this.serviceUrl = testMode ? REST_URL_OTE : REST_URL_PROD;
    this.lastRequest = null;
    this.lastResponse = null;
  }
}

// Install skeletons that throw until Phase 2 fills them in.
for (const name of BUSINESS_METHODS) {
  DNARest.prototype[name] = function notImplemented() {
    throw new Error(`DNARest.${name}() is not implemented yet (Phase 2)`);
  };
}

module.exports = DNARest;
