const soap = require('strong-soap').soap;
const { SOAP_URL, VERSION, BUSINESS_METHODS, validateContact, isTrTLD, setError, RESULT_OK } = require('./shared');
const { parseSoapDomainInfo, parseSoapContactInfo } = require('./soap-normalize');

class DNASoap {
  static VERSION = VERSION;

  constructor(
      userName = 'ownername', password = 'ownerpass', testMode = false) {
    this.serviceUsername = userName;
    this.servicePassword = password;
    this.serviceUrl = SOAP_URL;
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

  async AddChildNameServer(domainName, nameServer, ipAddress) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            ChildNameServer: nameServer,
            IpAddressList: [ipAddress]
        }
    };

    // callApiFunction ile API çağrısı yapıyoruz
    return this.callApiFunction('AddChildNameServer', parameters).then((response) => {
        return {
            data: {
                NameServer: parameters.request.ChildNameServer,
                IPAdresses: parameters.request.IpAddressList
            },
            result: true
        };
    });
}


/**
 * Delete Child Name Server for domain
 * @param {string} domainName
 * @param {string} nameServer
 * @return {Promise<Object>}
 */
async DeleteChildNameServer(domainName, nameServer) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            ChildNameServer: nameServer
        }
    };

    // callApiFunction ile API çağrısı yapıyoruz
    return this.callApiFunction('DeleteChildNameServer', parameters).then((response) => {
        return {
            data: {
                NameServer: parameters.request.ChildNameServer
            },
            result: true
        };
    });
}


/**
 * Modify Child Name Server for domain
 * @param {string} domainName
 * @param {string} nameServer
 * @param {string} ipAddress
 * @return {Promise<Object>}
 */
async ModifyChildNameServer(domainName, nameServer, ipAddress) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            ChildNameServer: nameServer,
            IpAddressList: [ipAddress]
        }
    };

    // callApiFunction ile API çağrısı yapıyoruz
    return this.callApiFunction('ModifyChildNameServer', parameters).then((response) => {
        return {
            data: {
                NameServer: parameters.request.ChildNameServer,
                IPAdresses: parameters.request.IpAddressList
            },
            result: true
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
 * Save Contacts for domain, Contacts segments will be saved as Administrative,
 * Billing, Technical, Registrant.
 * @param {string} domainName
 * @param {Object} contacts
 * @return {Promise<Object>}
 */
async SaveContacts(domainName, contacts) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            AdministrativeContact: contacts.Administrative,
            BillingContact: contacts.Billing,
            TechnicalContact: contacts.Technical,
            RegistrantContact: contacts.Registrant
        }
    };

    return this.callApiFunction('SaveContacts', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];

        let result = {};

        if (data.OperationResult === 'SUCCESS') {
            result = {
                result: true
            };
        } else {
            // Hata durumunu ayarla
            result = data;

        }

        return result;
    });
}


/**
 * Transfer domain with EPP code and period
 * @param {string} domainName
 * @param {string} eppCode
 * @param {string} period
 * @return {Promise<Object>}
 */
async Transfer(domainName, eppCode, period) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            AuthCode: eppCode,
            AdditionalAttributes: {
                KeyValueOfstringstring: [
                    {
                        Key: 'TRANSFERPERIOD',
                        Value: period
                    }
                ]
            }
        }
    };

    return this.callApiFunction('Transfer', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];
        let result = {};

        // Eğer DomainInfo geçerli bir nesne ise
        if (data.DomainInfo && typeof data.DomainInfo === 'object') {
            // Domain bilgisini ayrıştır ve döndür
            result = {
                result: true,
                data: this.parseDomainInfo(data.DomainInfo)
            };
        } else {
            // Hata durumunu ayarla
            result = data;
        }

        return result;
    });
}


/**
 * Stops Incoming Transfer
 * @param {string} domainName
 * @return {Promise<Object>}
 */
async CancelTransfer(domainName) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName
        }
    };

    return this.callApiFunction('CancelTransfer', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];

        return {
            result: data.result ,
            data: {
                DomainName: parameters.request.DomainName
            }
        };
    });
}



/**
 * Approve Outgoing transfer
 * @param {string} domainName
 * @return {Promise<Object>}
 */
async ApproveTransfer(domainName) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName
        }
    };

    return this.callApiFunction('ApproveTransfer', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];

        return {
            result: data.result,
            data: {
                DomainName: parameters.request.DomainName
            }
        };
    });
}


/**
 * Reject Outgoing transfer
 * @param {string} domainName
 * @return {Promise<Object>}
 */
async RejectTransfer(domainName) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName
        }
    };

    return this.callApiFunction('RejectTransfer', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];

        return {
            result: data.result,
            data: {
                DomainName: parameters.request.DomainName
            }
        };
    });
}

/**
 * Renew domain
 * @param {string} domainName
 * @param {number} period
 * @return {Promise<Object>}
 */
async Renew(domainName, period) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            Period: period
        }
    };

    return this.callApiFunction('Renew', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];

        if (data.ExpirationDate) {
            return {
                result: true,
                data: {
                    ExpirationDate: data.ExpirationDate
                }
            };
        } else {
            return data;
        }
    });
}


/**
 * Register domain with contact information
 * @param {string} domainName
 * @param {number} period
 * @param {Object} contacts
 * @param {Array<string>} nameServers
 * @param {boolean} eppLock
 * @param {boolean} privacyLock
 * @param {Object} additionalAttributes
 * @return {Promise<Object>}
 */
async RegisterWithContactInfo(domainName, period, contacts, nameServers = ["dns.domainnameapi.com", "web.domainnameapi.com"], eppLock = true, privacyLock = false, additionalAttributes = {}) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            Period: period,
            NameServerList: {
                string: nameServers
            },
            LockStatus: eppLock,
            PrivacyProtectionStatus: privacyLock,
            AdministrativeContact: contacts.Administrative,
            BillingContact: contacts.Billing,
            TechnicalContact: contacts.Technical,
            RegistrantContact: contacts.Registrant
        }
    };

    // Eklenen AdditionalAttributes'i işle
    if (Object.keys(additionalAttributes).length > 0) {
        parameters.request.AdditionalAttributes = {
            KeyValueOfstringstring: Object.entries(additionalAttributes).map(([key, value]) => ({
                Key: key,
                Value: value
            }))
        };
    }


    return this.callApiFunction('RegisterWithContactInfo', parameters).then((response) => {
        const data = response[Object.keys(response)[0]];
        let result = {};

        // Eğer DomainInfo geçerli bir nesne ise
        if (data.DomainInfo && typeof data.DomainInfo === 'object') {
            result = {
                result: true,
                data: this.parseDomainInfo(data.DomainInfo)
            };
        } else {

            result = data;
        }

        return result;
    });
}


/**
 * Modify privacy protection status of domain
 * @param {string} domainName
 * @param {boolean} status
 * @param {string} [reason="Owner request"]
 * @return {Promise<Object>}
 */
async ModifyPrivacyProtectionStatus(domainName, status, reason = "Owner request") {
    // Eğer reason boşsa varsayılan değeri ayarla
    if (reason.trim() === "") {
        reason = "Owner request";
    }

    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            DomainName: domainName,
            ProtectPrivacy: status,
            Reason: reason
        }
    };

    // API çağrısı ve yanıt işleme
    return this.callApiFunction('ModifyPrivacyProtectionStatus', parameters).then((response) => {
        return {
            data: {
                PrivacyProtectionStatus: parameters.request.ProtectPrivacy
            },
            result: true
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
 * Check Availability, SLD and TLD must be in array
 * @param {Array<string>} domains
 * @param {Array<string>} extensions
 * @param {number} period
 * @param {string} command
 * @return {Promise<Array<Object>>}
 */
async CheckAvailability(domains, extensions, period=1, command='create') {
      const parameters = {
        request: {
          Password      : this.servicePassword,
          UserName      : this.serviceUsername,
          DomainNameList: {
            string: domains, // Array of domains
          },
          TldList       : {
            string: extensions, // Array of extensions
          },
          Period        : period,
          Commad       : command,
        },
      };

    return this.callApiFunction('CheckAvailability', parameters).then((response) => {
        const data = response;
        const available = [];

        if (data.DomainAvailabilityInfoList?.DomainAvailabilityInfo?.Tld) {
            const buffer = data.DomainAvailabilityInfoList.DomainAvailabilityInfo;
            data.DomainAvailabilityInfoList = {
                DomainAvailabilityInfo: [buffer]
            };
        }else{

        }

        data.DomainAvailabilityInfoList.DomainAvailabilityInfo.forEach(value => {
            available.push({
                TLD: value.Tld,
                DomainName: value.DomainName,
                Status: value.Status,
                Command: value.Command,
                Period: value.Period,
                IsFee: value.IsFee,
                Price: value.Price,
                Currency: value.Currency,
                Reason: value.Reason
            });
        });

        return available;
    });
}


/**
 * Get Domain List of your account
 * @param {Object} extraParameters
 * @return {Promise<Object>}
 */
async GetList(extraParameters = {}) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            ...extraParameters
        }
    };

    return this.callApiFunction('GetList', parameters).then((response) => {

        const data = response;
        let result = {};

        if (data.TotalCount && Number.isInteger(data.TotalCount)) {
            result.data = { domains: [] };

            if (data.DomainInfoList?.DomainInfo?.Id) {
                result.data.domains.push(data.DomainInfoList.DomainInfo);
            } else {
                data.DomainInfoList.DomainInfo.forEach(domainInfo => {
                    result.data.domains.push(this.parseDomainInfo(domainInfo));
                });
            }

            result.result = true;
            result.totalCount = data.TotalCount;
        } else {
            result= data;
        }

        return result;
    });
}



/**
 * Return tld list and pricing matrix
 * @param {number} count
 * @return {Promise<Object>}
 */
  async GetTldList(count = 20) {
    const parameters = {
        request: {
            Password: this.servicePassword,
            UserName: this.serviceUsername,
            IncludePriceDefinitions: 1,
            PageSize: count
        }
    };

    return this.callApiFunction('GetTldList', parameters).then((response) => {
        const data = response;
        let result = {};

        if (data.TldInfoList.TldInfo.length > 0) {
            const extensions = data.TldInfoList.TldInfo.map(v => {
                const pricing = {};
                const currencies = {};

                v.PriceInfoList.TldPriceInfo.forEach(vp => {
                    pricing[vp.TradeType.toLowerCase()] = {
                        [vp.Period]: vp.Price
                    };
                    currencies[vp.TradeType.toLowerCase()] = vp.CurrencyName;
                });

                return {
                    id: v.Id,
                    status: v.Status,
                    maxchar: v.MaxCharacterCount,
                    maxperiod: v.MaxRegistrationPeriod,
                    minchar: v.MinCharacterCount,
                    minperiod: v.MinRegistrationPeriod,
                    tld: v.Name,
                    pricing,
                    currencies
                };
            });

            result = { data: extensions, result: true };
        } else {
            result = data
        }

        return result;
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




  /**
   * Parse domain information
   * @param {Object} data
   * @return {Object}
   */
  parseDomainInfo(data) {
      const result = {
          ID: data.Id || "",
          Status: data.Status || "",
          DomainName: data.DomainName || "",
          AuthCode: data.Auth || "",
          LockStatus: typeof data.LockStatus === "boolean" ? data.LockStatus.toString() : "",
          PrivacyProtectionStatus: typeof data.PrivacyProtectionStatus === "boolean" ? data.PrivacyProtectionStatus.toString() : "",
          IsChildNameServer: typeof data.IsChildNameServer === "boolean" ? data.IsChildNameServer.toString() : "",
          Contacts: {
              Administrative: { ID: data.AdministrativeContactId || "" },
              Billing: { ID: data.BillingContactId || "" },
              Technical: { ID: data.TechnicalContactId || "" },
              Registrant: { ID: data.RegistrantContactId || "" }
          },
          Dates: {
              Start: data.StartDate || "",
              Expiration: data.ExpirationDate || "",
              RemainingDays: data.RemainingDay || ""
          },
          NameServers: data.NameServerList ? (Array.isArray(data.NameServerList) ? data.NameServerList : [data.NameServerList]) : [],
          Additional: (data.AdditionalAttributes && data.AdditionalAttributes.KeyValueOfstringstring) ?
              (Array.isArray(data.AdditionalAttributes.KeyValueOfstringstring) ?
                  data.AdditionalAttributes.KeyValueOfstringstring.reduce((acc, attr) => {
                      if (attr.Key && attr.Value) acc[attr.Key] = attr.Value;
                      return acc;
                  }, {}) :
                  { [data.AdditionalAttributes.KeyValueOfstringstring.Key]: data.AdditionalAttributes.KeyValueOfstringstring.Value }) : {},
          ChildNameServers: data.ChildNameServerInfo ?
              (Array.isArray(data.ChildNameServerInfo) ?
                  data.ChildNameServerInfo.map(server => ({
                      ns: server.ChildNameServer || "",
                      ip: Array.isArray(server.IpAddress?.string) ? server.IpAddress.string : [server.IpAddress?.string || ""]
                  })) :
                  [{
                      ns: data.ChildNameServerInfo.ChildNameServer || "",
                      ip: Array.isArray(data.ChildNameServerInfo.IpAddress?.string) ? data.ChildNameServerInfo.IpAddress.string : [data.ChildNameServerInfo.IpAddress?.string || ""]
                  }]) : []
      };

      return result;
  }

  /**
   * Parse contact information
   * @param {Object} data
   * @return {Object}
   */
  parseContactInfo(data) {
    return {
      ID       : data.Id || '',
      Status   : data.Status || '',
      Address  : {
        Line1  : data.AddressLine1 || '',
        Line2  : data.AddressLine2 || '',
        Line3  : data.AddressLine3 || '',
        State  : data.State || '',
        City   : data.City || '',
        Country: data.Country || '',
        ZipCode: data.ZipCode || '',
      },
      Phone    : {
        Number     : data.Phone || '',
        CountryCode: data.PhoneCountryCode || '',
      },
      Fax      : {
        Number     : data.Fax || '',
        CountryCode: data.FaxCountryCode || '',
      },
      AuthCode : data.Auth || '',
      FirstName: data.FirstName || '',
      LastName : data.LastName || '',
      Company  : data.Company || '',
      EMail    : data.EMail || '',
      Type     : data.Type || '',
    };
  }

  async callApiFunction(apiFunctionName, parameters) {
    try {
      if (!this.soapClientPromise) {
        this.soapClientPromise = this.createSoapClient();
      }
      const client = await this.soapClientPromise;



      // Dinamik olarak fonksiyon çağırma
      const result = await client[`${apiFunctionName}`](parameters);



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

DNASoap.prototype.ModifyNameServer = function ModifyNameServer() {
  throw new Error('DNASoap.ModifyNameServer() not implemented yet (Phase 3 Task 8)');
};

DNASoap.prototype.EnableTheftProtectionLock = function EnableTheftProtectionLock() {
  throw new Error('DNASoap.EnableTheftProtectionLock() not implemented yet (Phase 3 Task 8)');
};

DNASoap.prototype.DisableTheftProtectionLock = function DisableTheftProtectionLock() {
  throw new Error('DNASoap.DisableTheftProtectionLock() not implemented yet (Phase 3 Task 8)');
};

DNASoap.prototype.CheckTransfer = function CheckTransfer() {
  throw new Error('DNASoap.CheckTransfer() not implemented yet (Phase 3 Task 8)');
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
