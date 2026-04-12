import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

function parseEnvValue(content: string, key: string): string {
  const line = content
    .split(/\r?\n/u)
    .find((entry) => entry.startsWith(`${key}=`));

  if (!line) {
    throw new Error(`Missing ${key} in env fixture`);
  }

  return line.slice(`${key}=`.length);
}

describe('run-with-env', () => {
  test('loads the requested environment file before launching child commands', () => {
    const envTest = readFileSync(path.join(process.cwd(), '.env.test'), 'utf8');
    const expectedDbPort = parseEnvValue(envTest, 'DB_PORT');
    const expectedRedisPort = parseEnvValue(envTest, 'REDIS_PORT');
    const expectedJwtSecret = parseEnvValue(envTest, 'JWT_SECRET');

    const result = spawnSync(
      process.execPath,
      [
        path.join('scripts', 'run-with-env.cjs'),
        'test',
        process.execPath,
        path.join('test', 'fixtures', 'print-env.cjs'),
        'NODE_ENV',
        'DB_PORT',
        'REDIS_PORT',
        'JWT_SECRET',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);

    const payload = JSON.parse(result.stdout) as Record<string, string>;
    expect(payload).toMatchObject({
      NODE_ENV: 'test',
      DB_PORT: expectedDbPort,
      REDIS_PORT: expectedRedisPort,
      JWT_SECRET: expectedJwtSecret,
    });
  });
});
