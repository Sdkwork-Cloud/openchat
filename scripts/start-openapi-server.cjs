process.env.OPENAPI_SCHEMA_ONLY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'openapi-schema-only-secret';

require('ts-node/register');
require('tsconfig-paths/register');
require('../src/main.ts');
