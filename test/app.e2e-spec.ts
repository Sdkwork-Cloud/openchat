import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response as SupertestResponse } from 'supertest';
import { Client } from 'pg';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';

describe('Application (e2e)', () => {
  let app: INestApplication;
  let accessToken = '';
  let userId = '';

  async function registerUser(prefix: string): Promise<{ token: string; userId: string }> {
    const identitySuffix = `${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const response = await request(app.getHttpServer())
      .post('/im/v3/auth/register')
      .send({
        username: `${prefix}_${identitySuffix}`,
        password: 'TestPassword123!',
        nickname: 'Test User',
        email: `${prefix}_${identitySuffix}@example.com`,
        code: '123456',
      })
      .expect(201);

    return {
      token: response.body.token as string,
      userId: response.body.user?.id as string,
    };
  }

  async function verifyDatabasePrerequisite(): Promise<void> {
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT || '5432');
    const user = process.env.DB_USERNAME;
    const database = process.env.DB_NAME;
    const client = new Client({
      host,
      port,
      user,
      password: process.env.DB_PASSWORD,
      database,
      connectionTimeoutMillis: 2000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
    } catch (error) {
      const endpoint = `${host}:${port}/${database}`;
      const causeMessage = error instanceof Error ? error.message : String(error);
      const isCredentialMismatch = causeMessage.includes('password authentication failed');

      throw Object.assign(
        new Error(
          isCredentialMismatch
            ? `E2E database prerequisite failed for ${endpoint}. PostgreSQL rejected user "${user}", which usually means the running service does not match .env.test. Run \`npm run test:env:status\`, stop the conflicting database, or align DB_* credentials before retrying.`
            : `E2E database prerequisite failed for ${endpoint}. Start dependencies with \`npm run test:env:up\`, initialize schema with \`npm run db:init:test -- --yes --seed\`, or fix DB_* credentials.`,
        ),
        { cause: error },
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  async function verifyRedisPrerequisite(): Promise<void> {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || '6379');
    const db = Number(process.env.REDIS_DB || '10');
    const redis = new Redis({
      host,
      port,
      db,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      await redis.ping();
    } catch (error) {
      throw Object.assign(
        new Error(
          `E2E Redis prerequisite failed for ${host}:${port}/db${db}. Start dependencies with \`npm run test:env:up\` or fix REDIS_* configuration.`,
        ),
        { cause: error },
      );
    } finally {
      await redis.quit().catch(() => {
        redis.disconnect();
      });
    }
  }

  beforeAll(async () => {
    await verifyDatabasePrerequisite();
    await verifyRedisPrerequisite();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('/health/detailed (GET)', () => {
    it('should return detailed health status', () => {
      return request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('services');
          expect(res.body.services).toHaveProperty('database');
          expect(res.body.services).toHaveProperty('redis');
        });
    });
  });

  describe('/metrics (GET)', () => {
    it('should return prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.text).toBeDefined();
        });
    });
  });

  describe('Authentication (e2e)', () => {
    it('should register a new user', async () => {
      const registration = await registerUser('auth_user');

      expect(registration.token).toBeTruthy();
      expect(registration.userId).toBeTruthy();
      accessToken = registration.token;
      userId = registration.userId;
    });

    it('should return current user info', () => {
      return request(app.getHttpServer())
        .get('/im/v3/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/im/v3/auth/me').expect(401);
    });
  });

  describe('/im/v3/messages (POST)', () => {
    it('should send a message', () => {
      return request(app.getHttpServer())
        .post('/im/v3/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fromUserId: userId,
          toUserId: 'user-recipient',
          content: { text: 'Hello World' },
          type: 'text',
        })
        .expect(201);
    });
  });
});
