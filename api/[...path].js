'use strict';

// Vercel sends unmatched /api/* routes here; the same request handler also powers local Node hosting.
module.exports = require('../server');
