import { applyTestEnvironmentDefaults } from '../support/apply-test-env-defaults';

describe('test environment defaults', () => {
  test('preserves values that were already injected from the environment file', () => {
    const env = {
      NODE_ENV: 'test',
      DB_PORT: '55432',
      REDIS_PORT: '56379',
      JWT_SECRET: 'loaded-from-env-file',
    } as NodeJS.ProcessEnv;

    applyTestEnvironmentDefaults(env);

    expect(env).toMatchObject({
      NODE_ENV: 'test',
      DB_PORT: '55432',
      REDIS_PORT: '56379',
      JWT_SECRET: 'loaded-from-env-file',
    });
  });

  test('fills in missing defaults for test helpers without overriding provided values', () => {
    const env = {} as NodeJS.ProcessEnv;

    applyTestEnvironmentDefaults(env);

    expect(env).toMatchObject({
      NODE_ENV: 'test',
      DB_HOST: '127.0.0.1',
      DB_PORT: '55432',
      DB_NAME: 'openchat_test',
      DB_USERNAME: 'openchat',
      DB_PASSWORD: 'openchat_password',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '56379',
      REDIS_DB: '10',
      REDIS_QUEUE_DB: '11',
      WUKONGIM_ENABLED: 'false',
      ENABLE_REDIS_ADAPTER: 'false',
      QUEUE_ENABLED: 'false',
      LOG_LEVEL: 'warn',
    });
  });
});
