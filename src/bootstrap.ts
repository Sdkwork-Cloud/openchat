/**
 * 应用程序启动引导
 *
 * 提供健壮的服务启动流程：
 * 1. 环境验证
 * 2. 依赖服务健康检查
 * 3. 优雅启动
 * 4. 错误恢复
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, RedisOptions } from 'ioredis';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

const logger = new Logger('Bootstrap');

/**
 * 启动配置接口
 */
interface BootstrapConfig {
  port: number;
  host: string;
  nodeEnv: string;
  isProduction: boolean;
}

/**
 * 健康检查结果
 */
interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: {
    host: string;
    port: number | string;
    database?: string;
  };
}

/**
 * 验证环境变量
 */
function validateEnvironment(): boolean {
  const criticalEnvVars = [
    'JWT_SECRET',
  ];

  const missing = criticalEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    logger.error(`Missing critical environment variables: ${missing.join(', ')}`);
    logger.warn('Please set these variables in .env file');
    return false;
  }

  // 警告性检查（有默认值，但生产环境建议设置）
  const warningEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const unset = warningEnvVars.filter(varName => !process.env[varName]);
  if (unset.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn(`Using default values for: ${unset.join(', ')}`);
    logger.warn('Consider setting these explicitly in production');
  }

  return true;
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const host = configService.get('DB_HOST', 'localhost');
  const port = configService.get('DB_PORT', 5432);
  const database = configService.get('DB_NAME', 'openchat');
  const user = configService.get('DB_USER', 'openchat');

  logger.log(`正在连接数据库: ${host}:${port}/${database}`);

  try {
    const { DataSource } = await import('typeorm');
    const dataSource = new DataSource({
      type: 'postgres',
      host,
      port,
      username: user,
      password: configService.get('DB_PASSWORD'),
      database,
      connectTimeoutMS: 5000,
    });

    await dataSource.initialize();
    await dataSource.destroy();

    const latency = Date.now() - startTime;
    logger.log(`✓ 数据库连接成功 (${latency}ms) - postgres://${user}@${host}:${port}/${database}`);

    return {
      service: 'Database',
      status: 'healthy',
      latency,
      details: { host, port, database },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`✗ 数据库连接失败: ${message}`);
    logger.error(`  连接信息: postgres://${user}@${host}:${port}/${database}`);

    return {
      service: 'Database',
      status: 'unhealthy',
      message,
      latency: Date.now() - startTime,
      details: { host, port, database },
    };
  }
}

/**
 * 检查 Redis 连接（临时连接，检查后立即关闭）
 */
async function checkRedisConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let redis: Redis | null = null;
  const host = configService.get('REDIS_HOST', 'localhost');
  const port = configService.get('REDIS_PORT', 6379);
  const db = configService.get('REDIS_DB', 0);

  logger.log(`正在连接 Redis: ${host}:${port}/${db}`);

  try {
    const redisOptions: RedisOptions = {
      host,
      port,
      db,
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    };

    const password = configService.get('REDIS_PASSWORD');
    if (password && password.trim()) {
      redisOptions.password = password;
    }

    redis = new Redis(redisOptions);
    await redis.connect();
    await redis.ping();

    const latency = Date.now() - startTime;
    logger.log(`✓ Redis 连接成功 (${latency}ms) - redis://${host}:${port}/${db}`);

    return {
      service: 'Redis',
      status: 'healthy',
      latency,
      details: { host, port, database: String(db) },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`✗ Redis 连接失败: ${message}`);
    logger.error(`  连接信息: redis://${host}:${port}/${db}`);

    return {
      service: 'Redis',
      status: 'unhealthy',
      message,
      latency: Date.now() - startTime,
      details: { host, port, database: String(db) },
    };
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * 执行健康检查
 */
async function performHealthChecks(configService: ConfigService): Promise<HealthCheckResult[]> {
  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('                    服务连接检查                            ');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');

  const results = await Promise.all([
    checkDatabaseConnection(configService),
    checkRedisConnection(configService),
  ]);

  const healthy = results.filter(r => r.status === 'healthy');
  const unhealthy = results.filter(r => r.status === 'unhealthy');

  logger.log('');
  logger.log('───────────────────────────────────────────────────────────');
  logger.log(`连接检查完成: ${healthy.length} 个成功, ${unhealthy.length} 个失败`);
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');

  return results;
}

// 全局共享的 Redis 适配器客户端
let sharedPubClient: Redis | null = null;
let sharedSubClient: Redis | null = null;

/**
 * Redis WebSocket 适配器
 */
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private isConnected = false;

  async connectToRedis(configService: ConfigService): Promise<boolean> {
    try {
      // 复用已存在的连接
      if (sharedPubClient && sharedSubClient) {
        this.adapterConstructor = createAdapter(sharedPubClient, sharedSubClient, {
          key: 'openchat:socket.io',
          requestsTimeout: 5000,
        });
        this.isConnected = true;
        logger.log('✓ Redis WebSocket 适配器初始化成功 (复用现有连接)');
        return true;
      }

      const host = configService.get('REDIS_HOST', 'localhost');
      const port = configService.get('REDIS_PORT', 6379);
      const db = configService.get('REDIS_DB', 0);

      const redisOptions: RedisOptions = {
        host,
        port,
        db,
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error('Redis adapter connection retry exhausted');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        keepAlive: 10000,
        enableReadyCheck: true,
      };

      const password = configService.get('REDIS_PASSWORD');
      if (password && password.trim()) {
        redisOptions.password = password;
      }

      logger.log(`初始化 Redis WebSocket 适配器: ${host}:${port}/${db}`);

      sharedPubClient = new Redis(redisOptions);
      sharedSubClient = sharedPubClient.duplicate();

      // 等待连接成功
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis pub connection timeout'));
          }, 10000);

          sharedPubClient!.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
          sharedPubClient!.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }),
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis sub connection timeout'));
          }, 10000);

          sharedSubClient!.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });
          sharedSubClient!.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }),
      ]);

      this.adapterConstructor = createAdapter(sharedPubClient, sharedSubClient, {
        key: 'openchat:socket.io',
        requestsTimeout: 5000,
      });

      this.isConnected = true;
      logger.log('✓ Redis WebSocket 适配器初始化成功');
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`✗ Redis WebSocket 适配器初始化失败: ${message}`);
      logger.warn('  使用单实例模式运行');
      this.isConnected = false;
      return false;
    }
  }

  createIOServer(port: number, options?: Record<string, unknown>) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor && typeof server.adapter === 'function') {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

/**
 * 配置 Swagger 文档
 */
function setupSwagger(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

  if (isProduction) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('OpenChat API')
    .setDescription('OpenChat 即时通讯服务端 API 文档')
    .setVersion('1.0.0')
    .addTag('auth', '认证相关接口')
    .addTag('users', '用户管理接口')
    .addTag('friends', '好友关系接口')
    .addTag('messages', '消息管理接口')
    .addTag('groups', '群组管理接口')
    .addTag('conversations', '会话管理接口')
    .addTag('contacts', '联系人管理接口')
    .addTag('rtc', '实时音视频接口')
    .addTag('iot', 'IoT设备管理接口')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '请输入 JWT Token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'OpenChat API 文档',
  });

  logger.log('✓ Swagger API 文档: /api/docs');
}

/**
 * 配置安全中间件
 */
function setupSecurity(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Helmet 安全头
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );

  // 压缩响应
  app.use(compression());

  // CORS 配置
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = configService
        .get<string>('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
        .split(',');

      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn(`CORS rejected for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  });

  logger.log('✓ 安全中间件配置完成');
}

/**
 * 配置全局管道和过滤器
 */
function setupGlobalPipes(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  logger.log('✓ 全局管道和过滤器配置完成');
}

/**
 * 配置 WebSocket 适配器
 */
async function setupWebSocketAdapter(app: INestApplication, configService: ConfigService) {
  const enableRedis = configService.get<boolean>('ENABLE_REDIS_ADAPTER', true);

  if (!enableRedis) {
    logger.log('Redis 适配器已禁用');
    return;
  }

  const redisAdapter = new RedisIoAdapter(app);
  const connected = await redisAdapter.connectToRedis(configService);

  if (connected) {
    app.useWebSocketAdapter(redisAdapter);
  }
}

/**
 * 初始化 IM Provider
 */
async function initializeIMProvider(app: INestApplication, configService: ConfigService) {
  try {
    const { IMProviderService } = await import('./modules/im-provider/im-provider.service');
    const imProviderService = app.get(IMProviderService);

    const provider = configService.get('IM_PROVIDER', 'wukongim');
    const endpoint = configService.get('WUKONGIM_API_URL', 'http://localhost:5001');

    await imProviderService.initializeProvider(provider, {
      provider,
      endpoint,
      timeout: 10000,
    });

    logger.log(`✓ IM Provider 初始化成功: ${provider}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`✗ IM Provider 初始化失败: ${message}`);
    logger.warn('  继续运行，但不使用 IM 集成');
  }
}

/**
 * 设置优雅关闭
 */
function setupGracefulShutdown(app: INestApplication) {
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    logger.log('');
    logger.log(`${signal} 收到信号，开始优雅关闭...`);

    try {
      // 关闭共享的 Redis 连接
      if (sharedPubClient) {
        await sharedPubClient.quit();
        sharedPubClient = null;
      }
      if (sharedSubClient) {
        await sharedSubClient.quit();
        sharedSubClient = null;
      }

      await app.close();
      logger.log('✓ 优雅关闭完成');
      process.exit(0);
    } catch (error) {
      logger.error('✗ 优雅关闭出错:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('未捕获异常:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的 Promise 拒绝:', promise, '原因:', reason);
  });
}

/**
 * 打印启动信息
 */
function printStartupInfo(config: BootstrapConfig) {
  const { port, host, nodeEnv } = config;

  logger.log('');
  logger.log('╔══════════════════════════════════════════════════════════╗');
  logger.log('║                                                          ║');
  logger.log('║           🚀 OpenChat Server 启动成功!                   ║');
  logger.log('║                                                          ║');
  logger.log('╠══════════════════════════════════════════════════════════╣');
  logger.log(`║  环境:      ${nodeEnv.padEnd(43)}║`);
  logger.log(`║  服务地址:  http://${host}:${port.toString().padEnd(31)}║`);
  logger.log(`║  API文档:   http://${host}:${port}/api/docs${' '.repeat(18)}║`);
  logger.log(`║  API前缀:   /im/api/v1${' '.repeat(28)}║`);
  logger.log(`║  WebSocket: ws://${host}:${port}/chat-v2${' '.repeat(21)}║`);
  logger.log('║                                                          ║');
  logger.log('╚══════════════════════════════════════════════════════════╝');
  logger.log('');
}

/**
 * 主启动函数
 */
export async function bootstrap() {
  const startTime = Date.now();

  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('                 OpenChat Server 启动中...                 ');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');

  // 1. 验证环境变量
  if (!validateEnvironment()) {
    throw new Error('环境变量验证失败');
  }
  logger.log('✓ 环境变量验证通过');

  // 2. 创建应用
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // 3. 获取配置
  const config: BootstrapConfig = {
    port: configService.get<number>('PORT', 3000),
    host: configService.get<string>('HOST', '0.0.0.0'),
    nodeEnv: configService.get<string>('NODE_ENV', 'development'),
    isProduction: configService.get('NODE_ENV') === 'production',
  };

  // 4. 执行健康检查
  const healthResults = await performHealthChecks(configService);
  const allHealthy = healthResults.every(r => r.status === 'healthy');

  if (!allHealthy && config.isProduction) {
    throw new Error('健康检查失败，无法在生产环境启动');
  }

  // 5. 配置安全中间件
  setupSecurity(app, configService);

  // 6. 配置全局管道和过滤器
  setupGlobalPipes(app, configService);

  // 7. 配置 Swagger
  setupSwagger(app, configService);

  // 8. 设置全局前缀
  app.setGlobalPrefix('im/api/v1', {
    exclude: ['/health', '/ws', '/chat', '/chat-v2', '/metrics'],
  });

  // 9. 配置 WebSocket 适配器
  await setupWebSocketAdapter(app, configService);

  // 10. 设置优雅关闭
  setupGracefulShutdown(app);

  // 11. 启动服务
  await app.listen(config.port, config.host);

  // 12. 初始化 IM Provider
  await initializeIMProvider(app, configService);

  // 13. 打印启动信息
  printStartupInfo(config);

  const startupTime = Date.now() - startTime;
  logger.log(`启动耗时: ${startupTime}ms`);
  logger.log('');

  return app;
}

// 启动应用
if (require.main === module) {
  // 捕获启动期间的未处理错误
  process.on('uncaughtException', (error) => {
    if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      logger.error('');
      logger.error('═══════════════════════════════════════════════════════════');
      logger.error('✗ 数据库连接失败');
      logger.error(`  错误码: ${error.message}`);
      logger.error('  请检查:');
      logger.error('  1. 数据库服务是否已启动');
      logger.error('  2. 网络连接是否正常');
      logger.error('  3. 数据库配置是否正确');
      logger.error('═══════════════════════════════════════════════════════════');
      logger.error('');
    } else {
      logger.error('未捕获异常:', error);
    }
    process.exit(1);
  });

  bootstrap().catch((error) => {
    logger.error('应用启动失败:', error);
    process.exit(1);
  });
}
