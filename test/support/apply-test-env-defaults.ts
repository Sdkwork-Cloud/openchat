const TEST_ENV_DEFAULTS: Readonly<Record<string, string>> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-key-for-testing-purpose-only',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
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
};

export function applyTestEnvironmentDefaults(
  env: NodeJS.ProcessEnv,
  defaults: Readonly<Record<string, string>> = TEST_ENV_DEFAULTS,
): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
}
