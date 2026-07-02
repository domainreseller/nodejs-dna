'use strict';

// Public entry point. The real implementation lives in src/ (facade + clients),
// mirroring php-dna's structure. Kept as a thin re-export so `require('nodejs-dna')`
// continues to return the DomainNameApi class.
module.exports = require('./src/DomainNameApi');