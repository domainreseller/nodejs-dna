const DomainNameAPI = require('./index');

// Create an instance of your API class
const api = new DomainNameAPI('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-api-key');

const contacts = {
  Administrative: {
    AddressLine1    : '123 Main St',
    AddressLine2    : 'Apt 4B',
    City            : 'Istanbul',
    Company         : 'MyCompany Ltd.',
    Country         : 'TR',
    EMail           : 'admin@domain.com',
    Fax             : '5554445452',
    FaxCountryCode  : '90',
    FirstName       : 'John',
    LastName        : 'Doe',
    Phone           : '5554445452',
    PhoneCountryCode: '90',
    State           : 'Istanbul',
    Type            : 'Contact',
    ZipCode         : '34000',
  },
  Billing       : {
    AddressLine1    : '456 Market St',
    AddressLine2    : 'Suite 9',
    City            : 'Ankara',
    Company         : 'Billing Co.',
    Country         : 'TR',
    EMail           : 'billing@domain.com',
    Fax             : '5554445452',
    FaxCountryCode  : '90',
    FirstName       : 'Jane',
    LastName        : 'Smith',
    Phone           : '5554445452',
    PhoneCountryCode: '90',
    State           : 'Ankara',
    Type            : 'Contact',
    ZipCode         : '06000',
  },
  Technical     : {
    AddressLine1    : '789 Tech Rd',
    AddressLine2    : '',
    City            : 'Izmir',
    Company         : 'Tech Solutions',
    Country         : 'TR',
    EMail           : 'tech@domain.com',
    Fax             : '5554445452',
    FaxCountryCode  : '90',
    FirstName       : 'Alice',
    LastName        : 'Johnson',
    Phone           : '5554445452',
    PhoneCountryCode: '90',
    State           : 'Izmir',
    Type            : 'Contact',
    ZipCode         : '35000',
  },
  Registrant    : {
    AddressLine1    : '101 Business Blvd',
    AddressLine2    : '',
    City            : 'Bursa',
    Company         : 'Registrant Corp.',
    Country         : 'TR',
    EMail           : 'registrant@domain.com',
    Fax             : '5554445452',
    FaxCountryCode  : '90',
    FirstName       : 'Bob',
    LastName        : 'Brown',
    Phone           : '5554445452',
    PhoneCountryCode: '90',
    State           : 'Bursa',
    Type            : 'Contact',
    ZipCode         : '16000',
  },
};

const nameServers = ['ns1.mydomain.com', 'ns2.mydomain.com'];
const domainName = 'test92839.site';
const period = 1; // 1 year registration
const eppLock = true;
const privacyLock = false;
const additionalAttributes = {};

try {
  const response =  api.RegisterWithContactInfo(domainName, period, contacts, nameServers, eppLock, privacyLock, additionalAttributes);
  console.log('Domain registration successful:', response);
}
catch (error) {
  console.error('Error registering domain:', error);
}