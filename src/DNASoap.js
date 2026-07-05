const soap = require('strong-soap').soap;
const { SOAP_URL, VERSION, BUSINESS_METHODS, validateContact, isTrTLD, setError, RESULT_OK, RESULT_ERROR, DEFAULT_NAMESERVERS } = require('./shared');
const { parseSoapDomainInfo, parseSoapContactInfo } = require('./soap-normalize');
const { normalizeDomainStatus, formatApiDate } = require('./rest-normalize');
const telemetry = require('./telemetry');
const { DEFAULT_SENTRY_DSN } = telemetry;

class DNASoap {
  static VERSION = VERSION;

  constructor(
      userName = 'ownername', password = 'ownerpass', testMode = false, options = {}) {
    this.serviceUsername = userName;
    this.servicePassword = password;
    this.serviceUrl = SOAP_URL;
    // Telemetry state
    this.errorReportingEnabled = options.telemetry !== false;
    this.sentryDsn = options.sentryDsn || DEFAULT_SENTRY_DSN;
    this.startAt = Date.now();
    // Request tracking (populated by callApiFunction)
    this.lastRequest = null;
    this.lastResponse = null;
    this.lastFunction = null;
  }

  /**
   * Enable or disable error reporting for this client instance.
   * @param {boolean} enabled
   * @returns {this}
   */
  setErrorReportingEnabled(enabled) {
    this.errorReportingEnabled = Boolean(enabled);
    return this;
  }

  /**
   * Fire-and-forget telemetry report. Never throws.
   * @param {Error} error
   */
  _reportError(error) {
    try {
      telemetry.reportError({
        dsn: this.sentryDsn,
        enabled: this.errorReportingEnabled,
        version: VERSION,
        application: 'CORE',
        environment: process.env.NODE_ENV || 'production',
        transport: 'SOAP',
        reseller: this.serviceUsername,
        lastRequest: this.lastRequest,
        lastResponse: this.lastResponse,
        lastFunction: this.lastFunction,
        startAt: this.startAt,
      }, error);
    } catch {
      // Swallow — telemetry must never surface to the host app.
    }
  }

  createSoapClient() {
    return new Promise((resolve, reject) => {
      const options = {
        strictSSL   : false,
        wsdl_options: {
          timeout: 20000,
        },
      };

      soap.createClient(this.serviceUrl, options, (err, client) => {
        if (err) {
          console.error('SOAP Client Creation Error:', err);
          reject(new Error(`SOAP Connection Error: ${err.message}`));
        }
        else {
          resolve(client);
        }
      });
    });
  }

  /**
   * Add a child nameserver to a domain.
   * PHP: DNASoap.php lines 692–714 (#7)
   * SOAP operation: addChildNameServer
   *
   * @param {string} domainName
   * @param {string} nameServer  hostname of the child nameserver
   * @param {string} ipAddress   IP address for the child nameserver
   * @returns {Promise<{result:'OK', data:{NameServer, IPAdresses:[string]}}>}
   */
  async AddChildNameServer(domainName, nameServer, ipAddress) {
    const parameters = {
      request: {
        Password        : this.servicePassword,
        UserName        : this.serviceUsername,
        DomainName      : domainName,
        ChildNameServer : nameServer,
        IpAddressList   : [ipAddress],
      },
    };

    return this.callApiFunction('AddChildNameServer', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'ADD_CHILD_NS', response.message || '', '');
      }
      return {
        result: RESULT_OK,
        data  : {
          NameServer: nameServer,
          IPAdresses: [ipAddress],   // one-'d' typo preserved from PHP source
        },
      };
    });
  }


  /**
   * Delete a child nameserver from a domain.
   * PHP: DNASoap.php lines 725–745 (#8)
   * SOAP operation: deleteChildNameServer
   *
   * @param {string} domainName
   * @param {string} nameServer  hostname of the child nameserver to delete
   * @returns {Promise<{result:'OK', data:{NameServer}}>}
   */
  async DeleteChildNameServer(domainName, nameServer) {
    const parameters = {
      request: {
        Password        : this.servicePassword,
        UserName        : this.serviceUsername,
        DomainName      : domainName,
        ChildNameServer : nameServer,
      },
    };

    return this.callApiFunction('DeleteChildNameServer', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'DELETE_CHILD_NS', response.message || '', '');
      }
      return {
        result: RESULT_OK,
        data  : { NameServer: nameServer },
      };
    });
  }


  /**
   * Modify the IP address of an existing child nameserver.
   * PHP: DNASoap.php lines 757–780 (#9)
   * SOAP operation: modifyChildNameServer
   *
   * @param {string} domainName
   * @param {string} nameServer  hostname of the child nameserver
   * @param {string} ipAddress   new IP address
   * @returns {Promise<{result:'OK', data:{NameServer, IPAdresses:[string]}}>}
   */
  async ModifyChildNameServer(domainName, nameServer, ipAddress) {
    const parameters = {
      request: {
        Password        : this.servicePassword,
        UserName        : this.serviceUsername,
        DomainName      : domainName,
        ChildNameServer : nameServer,
        IpAddressList   : [ipAddress],
      },
    };

    return this.callApiFunction('ModifyChildNameServer', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'MODIFY_CHILD_NS', response.message || '', '');
      }
      return {
        result: RESULT_OK,
        data  : {
          NameServer: nameServer,
          IPAdresses: [ipAddress],   // one-'d' typo preserved from PHP source
        },
      };
    });
  }

/**
 * Get Contacts for domain, Administrative, Billing, Technical, Registrant
 * segments will be returned.
 * PHP: DNASoap.php lines 791–833 (#10)
 * @param {string} domainName
 * @return {Promise<Object>}
 */
async GetContacts(domainName) {
    const parameters = {
        request: {
            Password : this.servicePassword,
            UserName : this.serviceUsername,
            DomainName: domainName,
        },
    };

    // callApiFunction already unwraps GetContactsResult; response IS the payload.
    return this.callApiFunction('GetContacts', parameters).then((response) => {
        if (
            response.AdministrativeContact && typeof response.AdministrativeContact === 'object' &&
            response.TechnicalContact      && typeof response.TechnicalContact      === 'object' &&
            response.RegistrantContact     && typeof response.RegistrantContact     === 'object' &&
            response.BillingContact        && typeof response.BillingContact        === 'object'
        ) {
            return {
                result: RESULT_OK,
                data  : {
                    contacts: {
                        Administrative: parseSoapContactInfo(response.AdministrativeContact),
                        Billing       : parseSoapContactInfo(response.BillingContact),
                        Registrant    : parseSoapContactInfo(response.RegistrantContact),
                        Technical     : parseSoapContactInfo(response.TechnicalContact),
                    },
                },
            };
        }
        return setError('CONTACT_INFO', response.message || '', '');
    });
}

  /**
   * Save contacts for a domain (Administrative, Billing, Technical, Registrant).
   * PHP: DNASoap.php lines 844–880 (#11)
   * SOAP operation: saveContacts
   *
   * NOTE: SOAP transport returns {result:'OK'} with NO data key on success.
   * This intentionally differs from REST SaveContacts which returns
   * {result:'OK', data:{contacts:{...}}}. The SOAP contract follows the PHP
   * DNASoap.php implementation (parseCall callback line 863–865).
   *
   * @param {string} domainName
   * @param {Object} contacts  { Administrative, Billing, Technical, Registrant }
   * @returns {Promise<{result:'OK'}>}
   */
  async SaveContacts(domainName, contacts) {
    const parameters = {
      request: {
        Password              : this.servicePassword,
        UserName              : this.serviceUsername,
        DomainName            : domainName,
        AdministrativeContact : contacts != null ? contacts.Administrative : undefined,
        BillingContact        : contacts != null ? contacts.Billing        : undefined,
        TechnicalContact      : contacts != null ? contacts.Technical      : undefined,
        RegistrantContact     : contacts != null ? contacts.Registrant     : undefined,
      },
    };

    return this.callApiFunction('SaveContacts', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'CONTACT_SAVE', response.message || '', '');
      }
      // SOAP SaveContacts success envelope has NO data key (PHP line 863-865).
      return { result: RESULT_OK };
    });
  }


/**
 * Transfer domain with EPP code and period.
 * PHP: DNASoap.php lines 891–932 (#12)
 * SOAP operation: transfer
 *
 * @param {string} domainName
 * @param {string} eppCode    EPP/auth code for the transfer
 * @param {number} period     Transfer period in years
 * @returns {Promise<{result:'OK', data:{...parseSoapDomainInfo}}>}
 */
async Transfer(domainName, eppCode, period) {
  const parameters = {
    request: {
      Password             : this.servicePassword,
      UserName             : this.serviceUsername,
      DomainName           : domainName,
      AuthCode             : eppCode,
      AdditionalAttributes : {
        KeyValueOfstringstring: [
          { Key: 'TRANSFERPERIOD', Value: period },
        ],
      },
    },
  };

  return this.callApiFunction('Transfer', parameters).then((response) => {
    // callApiFunction already unwraps TransferResult and sets result:bool.
    // Do NOT re-unwrap with response[Object.keys(response)[0]].
    if (!response.result) {
      return setError(
        response.ErrorCode || 'DOMAIN_TRANSFER_REQUEST',
        response.message   || '',
        '',
      );
    }
    if (response.DomainInfo && typeof response.DomainInfo === 'object') {
      return parseSoapDomainInfo(response.DomainInfo);
    }
    // DomainInfo absent on a nominal success → structural error.
    return setError('DOMAIN_TRANSFER_REQUEST');
  });
}


/**
 * Cancel a pending incoming transfer.
 * PHP: DNASoap.php lines 942–963 (#13)
 * SOAP operation: cancelTransfer
 *
 * Success envelope matches REST CancelTransfer:
 *   { result:'OK', data:{ DomainName, Status: <resp.Status> ?? 'Cancelled' } }
 *
 * @param {string} domainName
 * @returns {Promise<{result:'OK', data:{DomainName:string, Status:string}}>}
 */
async CancelTransfer(domainName) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
    },
  };

  return this.callApiFunction('CancelTransfer', parameters).then((response) => {
    if (!response.result) {
      return setError(
        response.ErrorCode || 'CANCEL_TRANSFER',
        response.message   || '',
        '',
      );
    }
    return {
      result: RESULT_OK,
      data  : {
        DomainName: domainName,
        Status    : response.Status != null ? response.Status : 'Cancelled',
      },
    };
  });
}



/**
 * Approve a pending outgoing transfer.
 * PHP: DNASoap.php lines 973–994 (#14)
 * SOAP operation: approveTransfer
 *
 * Success envelope matches REST ApproveTransfer:
 *   { result:'OK', data:{ DomainName, Status: <resp.Status> ?? 'Approved' } }
 *
 * @param {string} domainName
 * @returns {Promise<{result:'OK', data:{DomainName:string, Status:string}}>}
 */
async ApproveTransfer(domainName) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
    },
  };

  return this.callApiFunction('ApproveTransfer', parameters).then((response) => {
    if (!response.result) {
      return setError(
        response.ErrorCode || 'APPROVE_TRANSFER',
        response.message   || '',
        '',
      );
    }
    return {
      result: RESULT_OK,
      data  : {
        DomainName: domainName,
        Status    : response.Status != null ? response.Status : 'Approved',
      },
    };
  });
}


/**
 * Reject a pending outgoing transfer.
 * PHP: DNASoap.php lines 1003–1024 (#15)
 * SOAP operation: rejectTransfer
 *
 * Success envelope matches REST RejectTransfer:
 *   { result:'OK', data:{ DomainName, Status: <resp.Status> ?? 'Rejected' } }
 *
 * @param {string} domainName
 * @returns {Promise<{result:'OK', data:{DomainName:string, Status:string}}>}
 */
async RejectTransfer(domainName) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
    },
  };

  return this.callApiFunction('RejectTransfer', parameters).then((response) => {
    if (!response.result) {
      return setError(
        response.ErrorCode || 'REJECT_TRANSFER',
        response.message   || '',
        '',
      );
    }
    return {
      result: RESULT_OK,
      data  : {
        DomainName: domainName,
        Status    : response.Status != null ? response.Status : 'Rejected',
      },
    };
  });
}

  /**
   * Renew a domain registration.
   * PHP: DNASoap.php lines 1035–1064 (#16)
   * SOAP operation: renew
   *
   * Falsy ExpirationDate → setError('DOMAIN_RENEW') — mirrors PHP and REST Renew.
   * ExpirationDate is formatted via formatApiDate for REST-parity.
   *
   * @param {string} domainName
   * @param {number} period  Renewal period in years
   * @returns {Promise<{result:'OK', data:{ExpirationDate:string}}>}
   */
  async Renew(domainName, period) {
    const parameters = {
      request: {
        Password  : this.servicePassword,
        UserName  : this.serviceUsername,
        DomainName: domainName,
        Period    : period,
      },
    };

    return this.callApiFunction('Renew', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'DOMAIN_RENEW', response.message || '', '');
      }
      if (response.ExpirationDate) {
        return {
          result: RESULT_OK,
          data  : { ExpirationDate: formatApiDate(response.ExpirationDate) },
        };
      }
      // Missing ExpirationDate → mirrors PHP line 1055–1059 and REST Renew
      return setError('DOMAIN_RENEW');
    });
  }


  /**
   * Register a new domain with full contact information.
   * PHP: DNASoap.php lines 1080–1192 (#17)
   * SOAP operation: registerWithContactInfo
   *
   * Mirrors PHP exactly:
   *  1. Strip blank/empty nameservers; fall back to DEFAULT_NAMESERVERS.
   *  2. Validate all 4 contacts via validateContact().
   *  3. .tr domains: auto-inject TRABIS* additional attributes if absent.
   *  4. Build AdditionalAttributes as KeyValueOfstringstring array.
   *  5. Response: parse DomainInfo via parseSoapDomainInfo.
   *
   * @param {string}       domainName
   * @param {number}       period
   * @param {Object}       contacts              { Administrative, Billing, Technical, Registrant }
   * @param {string[]}     [nameServers=[]]       Desired name-servers (empty → DEFAULT_NAMESERVERS)
   * @param {boolean}      [eppLock=true]
   * @param {boolean}      [privacyLock=false]
   * @param {Object|Array} [additionalAttributes=[]]  TLD-specific attributes
   * @returns {Promise<{result:'OK', data:{...parseSoapDomainInfo}}>}
   */
  async RegisterWithContactInfo(
    domainName, period, contacts, nameServers = [], eppLock = true, privacyLock = false, additionalAttributes = [],
  ) {
    // Rule 1: strip blank/empty entries, then fall back to DEFAULT_NAMESERVERS.
    const filteredNS = Array.isArray(nameServers)
      ? nameServers.filter((ns) => typeof ns === 'string' && ns.trim().length > 0)
      : [];
    const finalNS = filteredNS.length > 0 ? filteredNS : DEFAULT_NAMESERVERS;

    // Rule 2: validate all 4 contacts (PHP calls $this->validateContact() on each).
    // Defensive: guard against null/missing contact sub-objects.
    const safeContacts = contacts != null && typeof contacts === 'object' ? contacts : {};
    const adminContact      = validateContact(Object.assign({}, safeContacts.Administrative || {}));
    const billingContact    = validateContact(Object.assign({}, safeContacts.Billing        || {}));
    const technicalContact  = validateContact(Object.assign({}, safeContacts.Technical      || {}));
    const registrantContact = validateContact(Object.assign({}, safeContacts.Registrant     || {}));

    const parameters = {
      request: {
        Password              : this.servicePassword,
        UserName              : this.serviceUsername,
        DomainName            : domainName,
        Period                : period,
        NameServerList        : { string: finalNS },
        LockStatus            : eppLock,
        PrivacyProtectionStatus: privacyLock,
        AdministrativeContact : adminContact,
        BillingContact        : billingContact,
        TechnicalContact      : technicalContact,
        RegistrantContact     : registrantContact,
      },
    };

    // Rule 3: build additionalAttributes object from input.
    let attrsObj = {};
    if (Array.isArray(additionalAttributes) && additionalAttributes.length === 0) {
      attrsObj = {};
    } else if (Array.isArray(additionalAttributes)) {
      attrsObj = Object.assign({}, additionalAttributes);
    } else if (additionalAttributes && typeof additionalAttributes === 'object') {
      attrsObj = Object.assign({}, additionalAttributes);
    }

    // Rule 3a: .tr domains — auto-inject TRABIS* attributes (PHP lines 1123–1155).
    if (isTrTLD(domainName)) {
      if (!attrsObj.TRABISDOMAINCATEGORY) {
        attrsObj.TRABISDOMAINCATEGORY = '1';
      }
      if (!attrsObj.TRABISCOUNTRYID) {
        attrsObj.TRABISCOUNTRYID   = 215;
        attrsObj.TRABISCOUNTRYNAME = 'TR';
        attrsObj.TRABISCITYNAME    = 'Istanbul';
        attrsObj.TRABISCITIYID     = 34;
      }
      if (String(attrsObj.TRABISDOMAINCATEGORY) === '1') {
        if (!attrsObj.TRABISNAMESURNAME) {
          attrsObj.TRABISNAMESURNAME = `${registrantContact.FirstName} ${registrantContact.LastName}`;
        }
        if (!attrsObj.TRABISCITIZIENID) {
          attrsObj.TRABISCITIZIENID = '11111111111';
        }
        delete attrsObj.TRABISORGANIZATION;
        delete attrsObj.TRABISTAXOFFICE;
        delete attrsObj.TRABISTAXNUMBER;
      } else {
        if (!attrsObj.TRABISORGANIZATION) {
          attrsObj.TRABISORGANIZATION = registrantContact.Company || '';
        }
        if (!attrsObj.TRABISTAXOFFICE) {
          attrsObj.TRABISTAXOFFICE = 'Istanbul';
        }
        if (!attrsObj.TRABISTAXNUMBER) {
          attrsObj.TRABISTAXNUMBER = '1111111111';
        }
        delete attrsObj.TRABISNAMESURNAME;
        delete attrsObj.TRABISCITIZIENID;
      }
    }

    // Rule 4: serialize attrs into SOAP KeyValueOfstringstring format.
    if (Object.keys(attrsObj).length > 0) {
      parameters.request.AdditionalAttributes = {
        KeyValueOfstringstring: Object.entries(attrsObj).map(([key, value]) => ({
          Key  : key,
          Value: String(value),
        })),
      };
    }

    return this.callApiFunction('RegisterWithContactInfo', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'DOMAIN_REGISTER', response.message || '', '');
      }
      // callApiFunction already extracts RegisterWithContactInfoResult;
      // response IS that object, so DomainInfo is a direct property.
      if (response.DomainInfo && typeof response.DomainInfo === 'object') {
        return parseSoapDomainInfo(response.DomainInfo);
      }
      return setError('DOMAIN_REGISTER');
    });
  }


  /**
   * Modify privacy protection status of a domain.
   * PHP: DNASoap.php lines 1204–1222 (#18)
   * SOAP operation: modifyPrivacyProtectionStatus
   *
   * PrivacyProtectionStatus in the response echoes back the INPUT status
   * (PHP line 1217 — does not inspect response body). Matches REST parity.
   *
   * @param {string}  domainName
   * @param {boolean} status
   * @param {string}  [reason='Owner request']
   * @returns {Promise<{result:'OK', data:{PrivacyProtectionStatus:boolean}}>}
   */
  async ModifyPrivacyProtectionStatus(domainName, status, reason = 'Owner request') {
    if (typeof reason === 'string' && reason.trim() === '') {
      reason = 'Owner request';
    }

    const parameters = {
      request: {
        Password      : this.servicePassword,
        UserName      : this.serviceUsername,
        DomainName    : domainName,
        ProtectPrivacy: status,
        Reason        : reason,
      },
    };

    return this.callApiFunction('ModifyPrivacyProtectionStatus', parameters).then((response) => {
      if (!response.result) {
        return setError(response.ErrorCode || 'MODIFY_PRIVACY', response.message || '', '');
      }
      return {
        result: RESULT_OK,
        data  : { PrivacyProtectionStatus: status },
      };
    });
  }


/**
 * Sync from registry — domain information will be updated from registry.
 * PHP: DNASoap.php lines 1232–1261 (#19)
 * @param {string} domainName
 * @return {Promise<Object>}
 */
async SyncFromRegistry(domainName) {
    const parameters = {
        request: {
            Password  : this.servicePassword,
            UserName  : this.serviceUsername,
            DomainName: domainName,
        },
    };

    return this.callApiFunction('SyncFromRegistry', parameters).then((response) => {
        if (response.DomainInfo && typeof response.DomainInfo === 'object') {
            return parseSoapDomainInfo(response.DomainInfo);
        }
        return setError('DOMAIN_SYNC', response.message || '', '');
    });
}




/**
 * Get current primary balance for the account.
 * PHP: DNASoap.php lines 335–366 (#2)
 * Returns the raw SOAP GetCurrentBalanceResult fields — same flat shape as
 * REST GetCurrentBalance (transport-transparent, no {result:'OK',data:{}} wrapper).
 * @param {string|number} currencyId
 * @return {Promise<Object>}
 */
async GetCurrentBalance(currencyId = 2) {
    if (currencyId.toString().toUpperCase() === 'USD') {
        currencyId = 2;
    } else if (['TRY', 'TL', '1'].includes(currencyId.toString().toUpperCase())) {
        currencyId = 1;
    } else {
        currencyId = 2;
    }

    const parameters = {
        request: {
            Password  : this.servicePassword,
            UserName  : this.serviceUsername,
            CurrencyId: currencyId,
        },
    };

    return this.callApiFunction('GetCurrentBalance', parameters).then((response) => {
        // PHP returns $response['GetCurrentBalanceResult'] directly (pass-through).
        // callApiFunction already extracts that key; strip its added 'result' boolean
        // and return only the SOAP-native fields, matching REST's flat envelope.

        // Fatal / error path: callApiFunction sets result:false when no SOAP data is
        // available (level:'fatal'). Mirror REST GetCurrentBalance's catch block which
        // returns OperationResult:'FAILED' — not an empty string.
        if (response.result === false || response.level === 'fatal') {
            return {
                ErrorCode       : response.ErrorCode != null ? response.ErrorCode : 'BALANCE',
                OperationMessage: response.message   != null ? response.message   : '',
                OperationResult : 'FAILED',
                Balance         : '0.00',
                CurrencyId      : currencyId,
                CurrencyInfo    : null,
                CurrencyName    : '',
                CurrencySymbol  : '',
            };
        }

        return {
            ErrorCode       : response.ErrorCode        != null ? response.ErrorCode        : 0,
            OperationMessage: response.OperationMessage != null ? response.OperationMessage : '',
            OperationResult : response.OperationResult  != null ? response.OperationResult  : '',
            Balance         : response.Balance          != null ? response.Balance          : '0.00',
            CurrencyId      : response.CurrencyId       != null ? response.CurrencyId       : currencyId,
            CurrencyInfo    : response.CurrencyInfo     != null ? response.CurrencyInfo     : null,
            CurrencyName    : response.CurrencyName     != null ? response.CurrencyName     : '',
            CurrencySymbol  : response.CurrencySymbol   != null ? response.CurrencySymbol   : '',
        };
    });
}


/**
 * Check domain availability for a cartesian product of names × extensions.
 * PHP: DNASoap.php lines 379–429 (#3)
 * SOAP operation: checkAvailability (note: Commad typo in request — preserved)
 *
 * Returns a DIRECT ARRAY on success (same shape as REST CheckAvailability).
 * Returns setError(...) envelope on any failure — never throws.
 *
 * @param {string[]} domains    SLD parts, e.g. ['example', 'test']
 * @param {string[]} extensions TLD parts, e.g. ['com', '.net']
 * @param {number}   [period=1]
 * @param {string}   [command='create']
 * @returns {Promise<Array|{result:'ERROR', error:{...}}>}
 */
async CheckAvailability(domains, extensions, period = 1, command = 'create') {
  const parameters = {
    request: {
      Password      : this.servicePassword,
      UserName      : this.serviceUsername,
      DomainNameList: { string: domains },
      TldList       : { string: extensions },
      Period        : period,
      Commad        : command, // deliberate API typo — preserved verbatim
    },
  };

  return this.callApiFunction('CheckAvailability', parameters).then((response) => {
    // Error path: callApiFunction sets result:false for all failure modes.
    if (!response.result) {
      return setError(
        response.ErrorCode || 'AVAILABILITY',
        response.message   || '',
        '',
      );
    }

    // Guard: the response payload must include DomainAvailabilityInfoList.
    const infoList = response.DomainAvailabilityInfoList;
    if (!infoList || infoList.DomainAvailabilityInfo == null) {
      return setError('AVAILABILITY', 'No availability data in response', '');
    }

    // SOAP collapses a single-result list into a plain object (no array).
    // Detect this by checking for a scalar 'Tld' field directly on the value.
    let list = infoList.DomainAvailabilityInfo;
    if (!Array.isArray(list)) {
      if (list && typeof list === 'object') {
        list = [list];
      } else {
        return setError('AVAILABILITY', 'Unexpected availability response structure', '');
      }
    }

    const available = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;

      // Normalize status to 'available'/'notavailable' — matches REST output.
      const rawStatus   = String(item.Status != null ? item.Status : '').toLowerCase();
      const isAvailable = ['available', '1', 'true'].includes(rawStatus);

      // Price: format to 4 decimal places when non-null (mirrors REST).
      const rawPrice = item.Price != null ? parseFloat(item.Price) : null;

      available.push({
        TLD      : item.Tld      != null ? String(item.Tld).toLowerCase()      : '',
        DomainName: item.DomainName != null ? String(item.DomainName).toLowerCase() : '',
        Status   : isAvailable ? 'available' : 'notavailable',
        Command  : item.Command  != null ? item.Command  : command,
        Period   : item.Period   != null ? item.Period   : period,
        IsFee    : item.IsFee    != null ? item.IsFee    : false,
        Price    : rawPrice      != null ? rawPrice.toFixed(4) : null,
        Currency : item.Currency != null ? item.Currency : null,
        Reason   : item.Reason   != null ? item.Reason   : null,
      });
    }

    return available;
  });
}


/**
 * Get list of domains in the reseller account.
 * PHP: DNASoap.php lines 438–484 (#4)
 * SOAP operation: getList
 *
 * Returns {result:'OK', TotalCount, data:{Domains:[...]}} — same envelope as
 * REST GetList.  Each domain item uses the REST-equivalent shape:
 *   - normalizeDomainStatus for numeric Status values
 *   - LockStatus / PrivacyProtectionStatus / IsChildNameServer as 'true'/'false' strings
 *   - Contacts with empty-string IDs (list endpoint does not provide them)
 *   - Dates.Start / Dates.Expiration formatted via formatApiDate
 * Handles the SOAP single-domain collapse (DomainInfo is an object, not array).
 *
 * @param {Object} [extraParameters={}]
 * @returns {Promise<{result:string, TotalCount:number, data:{Domains:Array}}>}
 */
async GetList(extraParameters = {}) {
  const parameters = {
    request: {
      Password: this.servicePassword,
      UserName: this.serviceUsername,
      ...extraParameters,
    },
  };

  return this.callApiFunction('GetList', parameters).then((response) => {
    // Error path.
    if (!response.result) {
      return setError('DOMAIN_LIST', response.message || '', '');
    }

    // TotalCount must be present (even 0 is valid).
    if (response.TotalCount == null) {
      return setError('DOMAIN_LIST', 'Invalid domain list response', '');
    }

    // Collect the raw domain objects.
    // Guard: DomainInfoList may be absent (empty account).
    let rawList = [];
    if (response.DomainInfoList && response.DomainInfoList.DomainInfo != null) {
      const di = response.DomainInfoList.DomainInfo;
      if (Array.isArray(di)) {
        rawList = di;
      } else if (di && typeof di === 'object') {
        // SOAP collapses single-domain account into a plain object.
        rawList = [di];
      }
    }

    // Map each raw SOAP domain item to the REST-equivalent shape.
    const domains = rawList.map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      // Resolve NameServers from NameServerList.NameServer (string or array).
      const nameServers = [];
      if (item.NameServerList && typeof item.NameServerList === 'object') {
        for (const nsVal of Object.values(item.NameServerList)) {
          if (Array.isArray(nsVal)) {
            for (const nsItem of nsVal) nameServers.push(String(nsItem));
          } else if (nsVal != null) {
            nameServers.push(String(nsVal));
          }
        }
      }

      return {
        ID                     : parseInt(item.Id) || 0,
        Status                 : normalizeDomainStatus(item.Status != null ? item.Status : ''),
        DomainName             : item.DomainName != null ? String(item.DomainName) : '',
        AuthCode               : item.Auth != null ? String(item.Auth) : '',
        LockStatus             : item.LockStatus ? 'true' : 'false',
        PrivacyProtectionStatus: item.PrivacyProtectionStatus ? 'true' : 'false',
        IsChildNameServer      : item.IsChildNameServer ? 'true' : 'false',
        // List endpoint does not supply contact IDs — use empty strings (REST parity).
        Contacts: {
          Billing       : { ID: '' },
          Technical     : { ID: '' },
          Administrative: { ID: '' },
          Registrant    : { ID: '' },
        },
        Dates: {
          Start        : formatApiDate(item.StartDate      != null ? item.StartDate      : null),
          Expiration   : formatApiDate(item.ExpirationDate != null ? item.ExpirationDate : null),
          RemainingDays: parseInt(item.RemainingDay) || 0,
        },
        NameServers     : nameServers,
        Additional      : [],
        ChildNameServers: [],
      };
    }).filter(Boolean); // drop any null placeholders from bad items

    return {
      result    : RESULT_OK,
      TotalCount: parseInt(response.TotalCount) || 0,
      data      : { Domains: domains },
    };
  });
}



/**
 * Get TLD list with pricing matrix.
 * PHP: DNASoap.php lines 493–551 (#5)
 * SOAP operation: getTldList
 *
 * Returns {result:'OK', data:[...]} — same envelope as REST GetTldList.
 * Each TLD entry uses the REST-equivalent shape:
 *   - id is sequential starting from 1 (REST parity; not the SOAP TLD Id)
 *   - TradeType mapped: 'register' → 'registration', others pass through lowercase
 *   - period 0 → normalized to 1
 *   - pricing periods sorted numerically ascending
 *   - price formatted to 4 decimal places
 * Handles SOAP single-TLD collapse (TldInfo is a plain object, not array).
 * Handles single TldPriceInfo entry (plain object, not array).
 *
 * @param {number} [count=20]
 * @returns {Promise<{result:string, data:Array}>}
 */
async GetTldList(count = 20) {
  const parameters = {
    request: {
      Password               : this.servicePassword,
      UserName               : this.serviceUsername,
      IncludePriceDefinitions: 1,
      PageSize               : count,
    },
  };

  // TradeType → output pricing key map (mirrors REST priceTypeMap).
  const tradeTypeMap = {
    register : 'registration',
    renew    : 'renew',
    transfer : 'transfer',
    restore  : 'restore',
    refund   : 'refund',
    backorder: 'backorder',
  };

  return this.callApiFunction('GetTldList', parameters).then((response) => {
    // Error path.
    if (!response.result) {
      return setError('TLD_LIST', response.message || '', '');
    }

    // Guard: TldInfoList must be present and contain TldInfo.
    if (!response.TldInfoList || response.TldInfoList.TldInfo == null) {
      return setError('TLD_LIST', 'No TLD list in response', '');
    }

    // Normalize TldInfo into an array (SOAP collapses single record).
    let tldInfoRaw = response.TldInfoList.TldInfo;
    if (!Array.isArray(tldInfoRaw)) {
      if (tldInfoRaw && typeof tldInfoRaw === 'object') {
        tldInfoRaw = [tldInfoRaw];
      } else {
        return setError('TLD_LIST', 'Invalid TLD list format', '');
      }
    }

    let idCounter = 1;
    const tldData = [];

    for (const v of tldInfoRaw) {
      if (!v || typeof v !== 'object') continue;

      const pricing    = {};
      const currencies = {};

      // Normalize PriceInfoList.TldPriceInfo into an array.
      let priceItems = [];
      if (v.PriceInfoList && v.PriceInfoList.TldPriceInfo != null) {
        const pp = v.PriceInfoList.TldPriceInfo;
        priceItems = Array.isArray(pp) ? pp : [pp];
      }

      for (const vp of priceItems) {
        if (!vp || typeof vp !== 'object') continue;

        const rawType = typeof vp.TradeType === 'string' ? vp.TradeType.toLowerCase() : '';
        const outType = tradeTypeMap[rawType] !== undefined ? tradeTypeMap[rawType] : rawType;

        // Period 0 → 1 (matches REST normalization).
        let p = parseInt(vp.Period != null ? vp.Period : 1) || 1;
        if (p < 1) p = 1;

        const price = vp.Price != null ? parseFloat(vp.Price).toFixed(4) : '0.0000';

        if (!pricing[outType]) pricing[outType] = {};
        pricing[outType][p] = price;
        currencies[outType]  = vp.CurrencyName != null ? vp.CurrencyName : '';
      }

      // Sort each pricing sub-object by period key numerically ascending.
      for (const outType of Object.keys(pricing)) {
        const sorted = {};
        for (const k of Object.keys(pricing[outType]).map(Number).sort((a, b) => a - b)) {
          sorted[k] = pricing[outType][k];
        }
        pricing[outType] = sorted;
      }

      tldData.push({
        id       : idCounter++,
        status   : v.Status                != null ? v.Status                : 'Active',
        maxchar  : v.MaxCharacterCount      != null ? v.MaxCharacterCount      : 63,
        maxperiod: v.MaxRegistrationPeriod  != null ? v.MaxRegistrationPeriod  : 10,
        minchar  : v.MinCharacterCount      != null ? v.MinCharacterCount      : 1,
        minperiod: v.MinRegistrationPeriod  != null ? v.MinRegistrationPeriod  : 1,
        tld      : v.Name                  != null ? v.Name                  : '',
        pricing,
        currencies,
      });
    }

    return { result: RESULT_OK, data: tldData };
  });
}

  /**
   * Get Domain details.
   * PHP: DNASoap.php lines 560–589 (#6)
   * @param {string} domainName
   * @return {Promise<Object>} {result:'OK', data:{...}} | {result:'ERROR', error:{...}}
   */
  async GetDetails(domainName) {
    const parameters = {
      request: {
        Password  : this.servicePassword,
        UserName  : this.serviceUsername,
        DomainName: domainName,
      },
    };

    return this.callApiFunction('GetDetails', parameters).then((response) => {
      if (response.DomainInfo && typeof response.DomainInfo === 'object') {
        return parseSoapDomainInfo(response.DomainInfo);
      }
      return setError('DOMAIN_DETAILS', response.message || '', '');
    });
  }

  /**
   * Get Reseller Details.
   * PHP: DNASoap.php lines 278–326 (#1)
   * Returns FLAT top-level keys (no data wrapper) — matches REST GetResellerDetails.
   * @returns {Promise<Object>}
   */
  async GetResellerDetails() {
    const parameters = {
      request: {
        UserName  : this.serviceUsername,
        Password  : this.servicePassword,
        CurrencyId: 2,
      },
    };

    return this.callApiFunction('GetResellerDetails', parameters).then((data) => {
      if (data && data.ResellerInfo) {
        const resp = {
          result: RESULT_OK,
          id    : data.ResellerInfo.Id,
          active: data.ResellerInfo.Status === 'Active',
          name  : data.ResellerInfo.Name,
        };

        // Guard: BalanceInfoList or BalanceInfo may be absent / empty.
        const balanceList = Array.isArray(
          data.ResellerInfo.BalanceInfoList && data.ResellerInfo.BalanceInfoList.BalanceInfo,
        )
          ? data.ResellerInfo.BalanceInfoList.BalanceInfo
          : [];

        // Guard: CurrencyInfo may be null — use optional chaining.
        const activeCurrencyCode = data.ResellerInfo.CurrencyInfo?.Code ?? null;

        let activeCurrency = balanceList[0] ?? null;
        const balances = [];

        for (const v of balanceList) {
          if (activeCurrencyCode !== null && v.CurrencyName === activeCurrencyCode) {
            activeCurrency = v;
          }
          balances.push({
            balance : v.Balance,
            currency: v.CurrencyName,
            symbol  : v.CurrencySymbol,
          });
        }

        // If no balance entries at all, produce empty/default fallback values.
        resp.balance  = activeCurrency != null ? activeCurrency.Balance      : '';
        resp.currency = activeCurrency != null ? activeCurrency.CurrencyName  : '';
        resp.symbol   = activeCurrency != null ? activeCurrency.CurrencySymbol : '';
        resp.balances = balances;

        return resp;
      }
      return setError('CREDENTIALS', (data && data.message) || '', '');
    });
  }


  async callApiFunction(apiFunctionName, parameters) {
    // Track context for telemetry
    this.lastFunction = apiFunctionName;
    this.lastRequest = parameters;
    try {
      if (!this.soapClientPromise) {
        this.soapClientPromise = this.createSoapClient();
      }
      const client = await this.soapClientPromise;



      // Dinamik olarak fonksiyon çağırma
      const result = await client[`${apiFunctionName}`](parameters);
      this.lastResponse = result;


      // Derinlik ne olursa olsun ...Result anahtarını bulalım
      const responseKey = `${apiFunctionName}Result`;
      let data = result[responseKey] || null; // İlk seviyede arar

      // Eğer ilk seviyede bulamazsak, ikinci seviyede ararız
      if (!data) {
        const firstKey = Object.keys(result)[0];
        if (result[firstKey] && result[firstKey][responseKey]) {
          data = result[firstKey][responseKey];
        }
      }

      if (!data || typeof data !== 'object') {
        return {result: false, level: 'fatal', message: 'No data returned'};
      }
      if (data.faultcode) {
        const faultErr = new Error(data.faultstring || 'SOAP Fault');
        faultErr.faultcode = data.faultcode;
        this._reportError(faultErr);
        return {result: false, level: 'fault', message: data.faultstring};
      }

      data.result = data.OperationResult === 'SUCCESS';

      if (data.result === false) {
        data.message = data.OperationMessage;
        data.level = 'error';
      }

      return data;

    }
    catch (error) {
      this._reportError(error instanceof Error ? error : new Error(String(error)));
      return {result: false, level: 'exception'};
    }
  }

}

// ---------------------------------------------------------------------------
// Phase 3 Task 3: Pure utility methods — delegate directly to shared functions.
// Defined on the prototype so the skeleton loop below skips them.
// ---------------------------------------------------------------------------

/**
 * Validate and normalise a contact object.
 * Pure synchronous function — no network call, no Promise.
 * Delegates to the shared validateContact() utility.
 *
 * @param {Object} contact
 * @returns {Object} The mutated contact with defaults applied
 */
DNASoap.prototype.ValidateContact = function ValidateContact(contact) {
  return validateContact(contact);
};

/**
 * Return true if the domain ends with '.tr'.
 * Pure synchronous function — no network call.
 * Delegates to the shared isTrTLD() utility.
 *
 * @param {string} domain
 * @returns {boolean}
 */
DNASoap.prototype.IsTrTLD = function IsTrTLD(domain) {
  return isTrTLD(domain);
};

// ---------------------------------------------------------------------------
// Phase 3 Task 3: Temporary skeletons for the 4 new API methods.
// These are defined BEFORE the skeleton loop so the loop skips them.
// Real implementations land in Phase 3 Task 8.
// ---------------------------------------------------------------------------

/**
 * Replace the full nameserver set for a domain.
 * PHP: DNASoap.php lines 599–621 (B1).
 * SOAP operation: modifyNameServer
 *
 * PHP callback echoes back parameters.request.NameServerList (does NOT
 * inspect the response body). Envelope matches REST ModifyNameServer:
 *   {result:'OK', data:{NameServers:[...]}}
 *
 * @param {string}   domainName
 * @param {string[]} nameServers  New nameserver list (re-indexed, PHP array_values)
 */
DNASoap.prototype.ModifyNameServer = function ModifyNameServer(domainName, nameServers) {
  const ns = Array.isArray(nameServers) ? [...nameServers] : [];
  const parameters = {
    request: {
      Password      : this.servicePassword,
      UserName      : this.serviceUsername,
      DomainName    : domainName,
      NameServerList: ns,
    },
  };
  return this.callApiFunction('ModifyNameServer', parameters).then((response) => {
    if (!response.result) {
      return setError(response.ErrorCode || 'MODIFY_NS', response.message || '', '');
    }
    return {
      result: RESULT_OK,
      data  : { NameServers: ns },
    };
  });
};

/**
 * Enable EPP/theft-protection lock on a domain.
 * PHP: DNASoap.php lines 631–650 (B2).
 * SOAP operation: enableTheftProtectionLock
 *
 * PHP callback ignores response body; hard-codes LockStatus:true.
 * Envelope matches REST EnableTheftProtectionLock:
 *   {result:'OK', data:{LockStatus:true}}
 *
 * @param {string} domainName
 */
DNASoap.prototype.EnableTheftProtectionLock = function EnableTheftProtectionLock(domainName) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
    },
  };
  return this.callApiFunction('EnableTheftProtectionLock', parameters).then((response) => {
    if (!response.result) {
      return setError(response.ErrorCode || 'ENABLE_LOCK', response.message || '', '');
    }
    return {
      result: RESULT_OK,
      data  : { LockStatus: true },
    };
  });
};

/**
 * Disable EPP/theft-protection lock on a domain.
 * PHP: DNASoap.php lines 660–680 (B3).
 * SOAP operation: disableTheftProtectionLock
 *
 * PHP callback ignores response body; hard-codes LockStatus:false.
 * Envelope matches REST DisableTheftProtectionLock:
 *   {result:'OK', data:{LockStatus:false}}
 *
 * @param {string} domainName
 */
DNASoap.prototype.DisableTheftProtectionLock = function DisableTheftProtectionLock(domainName) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
    },
  };
  return this.callApiFunction('DisableTheftProtectionLock', parameters).then((response) => {
    if (!response.result) {
      return setError(response.ErrorCode || 'DISABLE_LOCK', response.message || '', '');
    }
    return {
      result: RESULT_OK,
      data  : { LockStatus: false },
    };
  });
};

/**
 * Check domain transferability with EPP code.
 * PHP: DNASoap.php lines 1270–1285 (B4).
 * SOAP operation: checkTransfer
 *
 * TRANSPORT DIFFERENCE vs REST:
 *   SOAP returns BARE {result:'OK'} or {result:'ERROR'} — no data key.
 *   REST returns a richer envelope with TransferAvailabilityStatus and fields.
 *   This is the documented php-dna divergence; both transports are faithful
 *   to their respective PHP implementations.
 *
 * @param {string} domainName
 * @param {string} authcode  EPP/auth code
 */
DNASoap.prototype.CheckTransfer = function CheckTransfer(domainName, authcode) {
  const parameters = {
    request: {
      Password  : this.servicePassword,
      UserName  : this.serviceUsername,
      DomainName: domainName,
      AuthCode  : authcode,
    },
  };
  return this.callApiFunction('CheckTransfer', parameters).then((response) => {
    // PHP callback: return {result:'OK'} when OperationResult==='SUCCESS', else {result:'ERROR'}.
    // callApiFunction already maps OperationResult==='SUCCESS' → result:true.
    if (!response.result) {
      return { result: RESULT_ERROR };
    }
    return { result: RESULT_OK };
  });
};

// ---------------------------------------------------------------------------
// Install skeletons for any BUSINESS_METHODS not yet defined on the prototype.
// The loop only writes to names NOT already defined, so the real methods above
// and those defined in the class body are never overwritten.
// ---------------------------------------------------------------------------
for (const name of BUSINESS_METHODS) {
  if (!(name in DNASoap.prototype)) {
    DNASoap.prototype[name] = function notImplemented() {
      throw new Error(`DNASoap.${name}() is not implemented yet (Phase 2)`);
    };
  }
}

module.exports = DNASoap;
