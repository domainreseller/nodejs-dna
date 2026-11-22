/* 
  NodeJS-DNA: Domainnameapi Adapter for TypeScript
  
  Created by: Jhonatan Corella
  
  This TypeScript adapter integrates the functionality of the `nodejs-dna` library (Domainnameapi) 
  with enhanced type safety and compatibility for TypeScript applications. 
  
  By adapting the library to TypeScript, this implementation ensures better development experience with 
  type-checking and ensures smoother interactions with external services.

*/

import { soap } from 'strong-soap';


class DomainNameAPI {
  static VERSION: string = '2.0.14';

  serviceUsername: string;
  servicePassword: string;
  serviceUrl: string;
  soapClientPromise: Promise<any>;

  constructor(
      userName: string = 'ownername', 
      password: string = 'ownerpass', 
      _testMode: boolean = false
  ) {
    this.serviceUsername = userName;
    this.servicePassword = password;
    this.serviceUrl = 'https://whmcs.domainnameapi.com/DomainApi.svc?singlewsdl';
    this.soapClientPromise = this.createSoapClient();
  }

  createSoapClient(): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        strictSSL: false,
        wsdl_options: {
          timeout: 20000,
        },
      };

      soap.createClient(this.serviceUrl, options, (err: Error, client: any) => {
        if (err) {
          console.error('SOAP Client Creation Error:', err);
          reject(new Error(`SOAP Connection Error: ${err.message}`));
        } else {
          resolve(client);
        }
      });
    });
  }

  async AddChildNameServer(domainName: string, nameServer: string, ipAddress: string): Promise<{ data: { NameServer: string; IPAdresses: string[] }; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName,
        ChildNameServer: nameServer,
        IpAddressList: [ipAddress]
      }
    };

    return this.callApiFunction('AddChildNameServer', parameters).then((response: any) => {
      return {
        data: {
          NameServer: parameters.request.ChildNameServer,
          IPAdresses: parameters.request.IpAddressList
        },
        result: true
      };
    });
  }

  async DeleteChildNameServer(domainName: string, nameServer: string): Promise<{ data: { NameServer: string }; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName,
        ChildNameServer: nameServer
      }
    };

    return this.callApiFunction('DeleteChildNameServer', parameters).then((response: any) => {
      return {
        data: {
          NameServer: parameters.request.ChildNameServer
        },
        result: true
      };
    });
  }

  async ModifyChildNameServer(domainName: string, nameServer: string, ipAddress: string): Promise<{ data: { NameServer: string; IPAdresses: string[] }; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName,
        ChildNameServer: nameServer,
        IpAddressList: [ipAddress]
      }
    };

    return this.callApiFunction('ModifyChildNameServer', parameters).then((response: any) => {
      return {
        data: {
          NameServer: parameters.request.ChildNameServer,
          IPAdresses: parameters.request.IpAddressList
        },
        result: true
      };
    });
  }

  async GetContacts(domainName: string): Promise<{ data: any; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName
      }
    };

    return this.callApiFunction('GetContacts', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];

      let result: { data: any; result: boolean } = { data: null, result: false };

      if (data.AdministrativeContact && typeof data.AdministrativeContact === 'object' &&
          data.TechnicalContact && typeof data.TechnicalContact === 'object' &&
          data.RegistrantContact && typeof data.RegistrantContact === 'object' &&
          data.BillingContact && typeof data.BillingContact === 'object') {

        result = {
          data: {
            contacts: {
              Administrative: this.parseContactInfo(data.AdministrativeContact),
              Billing: this.parseContactInfo(data.BillingContact),
              Registrant: this.parseContactInfo(data.RegistrantContact),
              Technical: this.parseContactInfo(data.TechnicalContact),
            }
          },
          result: true
        };
      } else {
        result = data;
      }

      return result;
    });
  }

  async SaveContacts(domainName: string, contacts: any): Promise<{ result: boolean; data?: any }> {
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

    return this.callApiFunction('SaveContacts', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];

      let result: { result: boolean; data?: any } = { result: false };

      if (data.OperationResult === 'SUCCESS') {
        result = {
          result: true
        };
      } else {
        result = data;
      }

      return result;
    });
  }

  async Transfer(domainName: string, eppCode: string, period: string): Promise<{ result: boolean; data?: any }> {
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

    return this.callApiFunction('Transfer', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];
      let result: { result: boolean; data?: any } = { result: false };

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

  async CancelTransfer(domainName: string): Promise<{ result: boolean; data: { DomainName: string } }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName
      }
    };

    return this.callApiFunction('CancelTransfer', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];

      return {
        result: data.result,
        data: {
          DomainName: parameters.request.DomainName
        }
      };
    });
  }

  async ApproveTransfer(domainName: string): Promise<{ result: boolean; data: { DomainName: string } }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName
      }
    };

    return this.callApiFunction('ApproveTransfer', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];

      return {
        result: data.result,
        data: {
          DomainName: parameters.request.DomainName
        }
      };
    });
  }

  async RejectTransfer(domainName: string): Promise<{ result: boolean; data: { DomainName: string } }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName
      }
    };

    return this.callApiFunction('RejectTransfer', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];

      return {
        result: data.result,
        data: {
          DomainName: parameters.request.DomainName
        }
      };
    });
  }

  async Renew(domainName: string, period: number): Promise<{ result: boolean; data?: { ExpirationDate: string } }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName,
        Period: period
      }
    };

    return this.callApiFunction('Renew', parameters).then((response: any) => {
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

  async RegisterWithContactInfo(domainName: string, period: number, contacts: any, nameServers: string[] = ["dns.domainnameapi.com", "web.domainnameapi.com"], eppLock: boolean = true, privacyLock: boolean = false, additionalAttributes: any = {}): Promise<{ result: boolean; data?: any }> {
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
        RegistrantContact: contacts.Registrant,
        AdditionalAttributes: {} // Add this line to define the property
      }
    };

    if (Object.keys(additionalAttributes).length > 0) {
      parameters.request.AdditionalAttributes = {
        KeyValueOfstringstring: Object.entries(additionalAttributes).map(([key, value]) => ({
          Key: key,
          Value: value
        }))
      };
    }

    return this.callApiFunction('RegisterWithContactInfo', parameters).then((response: any) => {
      const data = response[Object.keys(response)[0]];
      let result: { result: boolean; data?: any } = { result: false };

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

  async ModifyPrivacyProtectionStatus(domainName: string, status: boolean, reason: string = "Owner request"): Promise<{ data: { PrivacyProtectionStatus: boolean }; result: boolean }> {
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

    return this.callApiFunction('ModifyPrivacyProtectionStatus', parameters).then((response: any) => {
      return {
        data: {
          PrivacyProtectionStatus: parameters.request.ProtectPrivacy
        },
        result: true
      };
    });
  }

  async SyncFromRegistry(domainName: string): Promise<{ data: any; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName
      }
    };

    return this.callApiFunction('SyncFromRegistry', parameters).then((response: any) => {
      const data = response;

      let result: { data: any; result: boolean } = { data: null, result: false };

      if (data.DomainInfo && typeof data.DomainInfo === 'object') {
        result = {
          data: this.parseDomainInfo(data.DomainInfo),
          result: true
        };
      } else {
        result = data;
      }

      return result;
    });
  }

  async GetCurrentBalance(currencyId: string | number = 2): Promise<any> {
    if (currencyId.toString().toUpperCase() === 'USD') {
      currencyId = 2;
    } else if (['TRY', 'TL', '1'].includes(currencyId.toString().toUpperCase())) {
      currencyId = 1;
    } else {
      currencyId = 2;
    }

    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        CurrencyId: currencyId
      }
    };

    return this.callApiFunction('GetCurrentBalance', parameters).then((response: any) => {
      return response;
    });
  }

  async CheckAvailability(domains: string[], extensions: string[], period: number = 1, command: string = 'create'): Promise<Array<any>> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainNameList: {
          string: domains,
        },
        TldList: {
          string: extensions,
        },
        Period: period,
        Commad: command,
      },
    };

    return this.callApiFunction('CheckAvailability', parameters).then((response: any) => {
      const data = response;
      const available: Array<any> = [];

      if (data.DomainAvailabilityInfoList?.DomainAvailabilityInfo?.Tld) {
        const buffer = data.DomainAvailabilityInfoList.DomainAvailabilityInfo;
        data.DomainAvailabilityInfoList = {
          DomainAvailabilityInfo: [buffer]
        };
      }

      data.DomainAvailabilityInfoList.DomainAvailabilityInfo.forEach((value: { Tld: any; DomainName: any; Status: any; Command: any; Period: any; IsFee: any; Price: any; Currency: any; Reason: any; }) => {
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

  async GetList(extraParameters: any = {}): Promise<{ data: { domains: any[] }; result: boolean; totalCount?: number }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        ...extraParameters
      }
    };

    return this.callApiFunction('GetList', parameters).then((response: any) => {
      const data = response;
      let result: { data: { domains: any[] }; result: boolean; totalCount?: number } = { data: { domains: [] }, result: false };

      if (data.TotalCount && Number.isInteger(data.TotalCount)) {
        result.data = { domains: [] };

        if (data.DomainInfoList?.DomainInfo?.Id) {
          result.data.domains.push(data.DomainInfoList.DomainInfo);
        } else {
          data.DomainInfoList.DomainInfo.forEach((domainInfo: any) => {
            result.data.domains.push(this.parseDomainInfo(domainInfo));
          });
        }

        result.result = true;
        result.totalCount = data.TotalCount;
      } else {
        result = data;
      }

      return result;
    });
  }

  async GetTldList(count: number = 20): Promise<{ data: any; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        IncludePriceDefinitions: 1,
        PageSize: count
      }
    };

    return this.callApiFunction('GetTldList', parameters).then((response: any) => {
      const data = response;
      let result: { data: any; result: boolean } = { data: null, result: false };

      if (data.TldInfoList.TldInfo.length > 0) {
        const extensions = data.TldInfoList.TldInfo.map((v: { PriceInfoList: { TldPriceInfo: any[]; }; Id: any; Status: any; MaxCharacterCount: any; MaxRegistrationPeriod: any; MinCharacterCount: any; MinRegistrationPeriod: any; Name: any; }) => {
          const pricing: any = {};
          const currencies: any = {};

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
        result = data;
      }

      return result;
    });
  }

  async GetDetails(domainName: string): Promise<{ data: any; result: boolean }> {
    const parameters = {
      request: {
        Password: this.servicePassword,
        UserName: this.serviceUsername,
        DomainName: domainName,
      },
    };

    return this.callApiFunction('GetDetails', parameters).then((response: any) => {
      const data = response;
      let result: { data: any; result: boolean } = { data: null, result: false };

      if (data.DomainInfo && typeof data.DomainInfo === 'object') {
        result.data = this.parseDomainInfo(data.DomainInfo);
        result.result = true;
      } else {
        result = data;
      }

      return result;
    });
  }

  async GetResellerDetails(): Promise<{ result: boolean; name: string; active: boolean; id: string; balance?: number; currency?: string; symbol?: string; balances?: any[] }> {
    const parameters = {
      request: {
        UserName: this.serviceUsername,
        Password: this.servicePassword,
        CurrencyId: 2,
      },
    };

    return this.callApiFunction('GetResellerDetails', parameters).then((data: any) => {
      if (data && data.ResellerInfo) {
        let resp: { result: boolean; id: any; active: boolean; name: any; balance?: number; currency?: string; symbol?: string; balances?: any[] } = {
          result: true,
          id: data.ResellerInfo.Id,
          active: data.ResellerInfo.Status === 'Active',
          name: data.ResellerInfo.Name,
        };

        let activeCurrency = data.ResellerInfo.BalanceInfoList.BalanceInfo[0];
        let balances: any[] = [];

        data.ResellerInfo.BalanceInfoList.BalanceInfo.forEach((v: any) => {
          if (v.CurrencyName === data.ResellerInfo.CurrencyInfo.Code) {
            activeCurrency = v;
          }

          balances.push({
            balance: v.Balance,
            currency: v.CurrencyName,
            symbol: v.CurrencySymbol,
          });
        });

        resp.balance = activeCurrency.Balance;
        resp.currency = activeCurrency.CurrencyName;
        resp.symbol = activeCurrency.CurrencySymbol;
        resp.balances = balances;

        return resp;
      } else {
        return { result: false, ...data };
      }
    });
  }

  parseDomainInfo(data: any): any {
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
          data.AdditionalAttributes.KeyValueOfstringstring.reduce((acc: any, attr: any) => {
            if (attr.Key && attr.Value) acc[attr.Key] = attr.Value;
            return acc;
          }, {}) :
          { [data.AdditionalAttributes.KeyValueOfstringstring.Key]: data.AdditionalAttributes.KeyValueOfstringstring.Value }) : {},
      ChildNameServers: data.ChildNameServerInfo ?
        (Array.isArray(data.ChildNameServerInfo) ?
          data.ChildNameServerInfo.map((server: any) => ({
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

  parseContactInfo(data: any): any {
    return {
      ID: data.Id || '',
      Status: data.Status || '',
      Address: {
        Line1: data.AddressLine1 || '',
        Line2: data.AddressLine2 || '',
        Line3: data.AddressLine3 || '',
        State: data.State || '',
        City: data.City || '',
        Country: data.Country || '',
        ZipCode: data.ZipCode || '',
      },
      Phone: {
        Number: data.Phone || '',
        CountryCode: data.PhoneCountryCode || '',
      },
      Fax: {
        Number: data.Fax || '',
        CountryCode: data.FaxCountryCode || '',
      },
      AuthCode: data.Auth || '',
      FirstName: data.FirstName || '',
      LastName: data.LastName || '',
      Company: data.Company || '',
      EMail: data.EMail || '',
      Type: data.Type || '',
    };
  }

  async callApiFunction(apiFunctionName: string, parameters: any): Promise<any> {
    try {
      const client = await this.soapClientPromise;

      const result = await client[`${apiFunctionName}`](parameters);

      const responseKey = `${apiFunctionName}Result`;
      let data = result[responseKey] || null;

      if (!data) {
        const firstKey = Object.keys(result)[0];
        if (result[firstKey] && result[firstKey][responseKey]) {
          data = result[firstKey][responseKey];
        }
      }

      if (!data || typeof data !== 'object') {
        return { result: false, level: 'fatal', message: 'No data returned' };
      }
      if (data.faultcode) {
        return { result: false, level: 'fault', message: data.faultstring };
      }

      data.result = data.OperationResult === 'SUCCESS';

      if (data.result === false) {
        data.message = data.OperationMessage;
        data.level = 'error';
      }

      return data;

    } catch (error) {
      return { result: false, level: 'exception' };
    }
  }
}

export default DomainNameAPI;
