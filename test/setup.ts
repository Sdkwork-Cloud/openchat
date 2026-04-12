import { jest } from '@jest/globals';
import { applyTestEnvironmentDefaults } from './support/apply-test-env-defaults';

jest.setTimeout(30000);

applyTestEnvironmentDefaults(process.env);
