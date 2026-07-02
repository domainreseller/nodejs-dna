# Domainnameapi Node.js Module

Welcome to the Domainnameapi Node.js module! This library allows you to interact seamlessly with the Domainnameapi service, providing a simple and efficient way to manage your domain-related tasks.

## Installation

To install the module, run:

```bash
npm install nodejs-dna
```

# Usage
Importing the Module

First, import the module into your project:

```javascript
const DomainNameAPI = require('nodejs-dna');

// Create an instance of your API class
const api = new DomainNameAPI('user', 'pass');
```

# Example Functions
Here are some examples of how to use the module:

### Get Reseller Details
    
```javascript
api.GetResellerDetails().then((res) => {
  console.log(res);
});
```

### Get Domain List
    
```javascript
api.GetList().then((res) => {
  console.log(res);
});
```

### Sync from Registry
        
```javascript
api.SyncFromRegistry().then((res) => {
  console.log(res);
});
```


### Modify Privacy Protection Status
        
```javascript
api.ModifyPrivacyProtectionStatus('test.site', 1).then((res) => {
  console.log(res);
});
```

### Features
* Fully Functional: All API functions are operational.
* Performance-Oriented: Optimized for speed and efficiency.
* Asynchronous Support: Built to handle asynchronous operations effectively.

### Contribution
Feel free to contribute by submitting issues or pull requests.

## License
This project is licensed under the [Apache License 2.0](./LICENSE). You are free to use, modify, distribute, and fork it, including for commercial purposes.

