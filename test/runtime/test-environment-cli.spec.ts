import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const { parseCommand } = require('../../scripts/lib/node/cli.cjs') as {
  parseCommand: (argv: string[]) => Record<string, unknown>;
};

describe('test environment cli', () => {
  test('parses shared cross-platform test environment commands', () => {
    expect(parseCommand(['test-env', 'up'])).toMatchObject({
      kind: 'test-environment',
      command: 'up',
      environment: 'test',
    });

    expect(parseCommand(['test-env', 'status'])).toMatchObject({
      kind: 'test-environment',
      command: 'status',
      environment: 'test',
    });

    expect(parseCommand(['test-env', 'down'])).toMatchObject({
      kind: 'test-environment',
      command: 'down',
      environment: 'test',
    });
  });

  test('test profile is isolated from default development ports and service names', () => {
    const envTest = readFileSync(path.join(process.cwd(), '.env.test'), 'utf8');
    const compose = readFileSync(path.join(process.cwd(), 'docker-compose.yml'), 'utf8');

    expect(envTest).toContain('DB_PORT=55432');
    expect(envTest).toContain('REDIS_PORT=56379');
    expect(envTest).toContain('POSTGRES_CONTAINER_NAME=openchat-test-postgres');
    expect(envTest).toContain('REDIS_CONTAINER_NAME=openchat-test-redis');
    expect(envTest).toContain('POSTGRES_VOLUME_NAME=openchat_test_postgres_data');
    expect(envTest).toContain('REDIS_VOLUME_NAME=openchat_test_redis_data');
    expect(envTest).toContain('NETWORK_NAME=openchat-test-network');

    expect(compose).toContain('container_name: ${POSTGRES_CONTAINER_NAME:-openchat-postgres}');
    expect(compose).toContain('container_name: ${REDIS_CONTAINER_NAME:-openchat-redis}');
    expect(compose).toContain('- postgres_data:/var/lib/postgresql/data');
    expect(compose).toContain('- redis_data:/data');
    expect(compose).toContain('name: ${POSTGRES_VOLUME_NAME:-postgres_data}');
    expect(compose).toContain('name: ${REDIS_VOLUME_NAME:-redis_data}');
  });
});
