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
import { Redis } from 'ioredis';
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
}

/**
 * 验证环境变量
 */
function validateEnvironment(): boolean {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const { DataSource } = require('typeorm');
    const dataSource = new DataSource({
      type: 'postgres',
      host: configService.get('DB_HOST'),
      port: configService.get('DB_PORT'),
      username: configService.get('DB_USER'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
    });

    await dataSource.initialize();
    await dataSource.destroy();

    return {
      service: 'Database',
      status: 'healthy',
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      service: 'Database',
      status: 'unhealthy',
      message: error.message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 检查 Redis 连接
 */
async function checkRedisConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const redisOptions: any = {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
    };

    const password = configService.get('REDIS_PASSWORD');
    if (password) {
      redisOptions.password = password;
    }

    const redis = new Redis(redisOptions);
    await redis.ping();
    await redis.quit();

    return {
      service: 'Redis',
      status: 'healthy',
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      service: 'Redis',
      status: 'unhealthy',
      message: error.message,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 执行健康检查
 */
async function performHealthChecks(configService: ConfigService): Promise<HealthCheckResult[]> {
  logger.log('Performing health checks...');

  const results = await Promise.all([
    checkDatabaseConnection(configService),
    checkRedisConnection(configService),
  ]);

  const healthy = results.filter(r => r.status === 'healthy');
  const unhealthy = results.filter(r => r.status === 'unhealthy');

  logger.log(`Health checks completed: ${healthy.length} healthy, ${unhealthy.length} unhealthy`);

  for (const result of results) {
    const icon = result.status === 'healthy' ? '✓' : '✗';
    const latency = result.latency ? `(${result.latency}ms)` : '';
    logger.log(`  ${icon} ${result.service}: ${result.status} ${latency}`);
    if (result.message) {
      logger.warn(`    ${result.message}`);
    }
  }

  return results;
}

/**
 * Redis WebSocket 适配器
 */
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private isConnected = false;

  async connectToRedis(configService: ConfigService): Promise<boolean> {
    try {
      const redisOptions: any = {
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        db: configService.get('REDIS_DB', 0),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      };

      const password = configService.get('REDIS_PASSWORD');
      if (password && password.trim()) {
        redisOptions.password = password;
      }

      const pubClient = new Redis(redisOptions);
      const subClient = pubClient.duplicate();

      // 等待连接成功
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.on('connect', () => resolve());
          pubClient.on('error', (err) => reject(err));
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        }),
        new Promise<void>((resolve, reject) => {
          subClient.on('connect', () => resolve());
          subClient.on('error', (err) => reject(err));
          setTimeout(() => reject(new Error('Redis sub connection timeout')), 5000);
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient, {
        key: 'openchat:socket.io',
        requestsTimeout: 5000,
      });

      this.isConnected = true;
      logger.log('✓ Redis adapter initialized successfully');
      return true;
    } catch (error: any) {
      logger.warn(`✗ Failed to initialize Redis adapter: ${error.message}`);
      logger.warn('  Running in single-instance mode');
      this.isConnected = false;
      return false;
    }
  }

  createIOServer(port: number, options?: any) {
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

  logger.log('✓ Swagger API docs available at /api/docs');
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

  logger.log('✓ Security middleware configured');
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

  logger.log('✓ Global pipes and filters configured');
}

/**
 * 配置 WebSocket 适配器
 */
async function setupWebSocketAdapter(app: INestApplication, configService: ConfigService) {
  const enableRedis = configService.get<boolean>('ENABLE_REDIS_ADAPTER', true);

  if (!enableRedis) {
    logger.log('Redis adapter disabled by configuration');
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

    logger.log(`✓ IM Provider initialized with ${provider}`);
  } catch (error: any) {
    logger.warn(`✗ Failed to initialize IM Provider: ${error.message}`);
    logger.warn('  Continuing without IM integration');
  }
}

/**
 * 设置优雅关闭
 */
function setupGracefulShutdown(app: INestApplication) {
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    logger.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
      await app.close();
      logger.log('✓ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('✗ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

/**
 * 打印启动信息
 */
function printStartupInfo(config: BootstrapConfig) {
  const { port, host, nodeEnv } = config;

  logger.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║           🚀 OpenChat Server Started!                  ║
  ║                                                        ║
  ╠════════════════════════════════════════════════════════╣
  ║  Environment: ${nodeEnv.padEnd(38)} ║
  ║  Server:      http://${host}:${port.toString().padEnd(26)} ║
  ║  API Docs:    http://${host}:${port}/api/docs${' '.repeat(13)} ║
  ║  WebSocket:   ws://${host}:${port}/chat-v2${' '.repeat(16)} ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
}

/**
 * 主启动函数
 */
export async function bootstrap() {
  const startTime = Date.now();

  logger.log('Starting OpenChat Server...');

  // 1. 验证环境变量
  if (!validateEnvironment()) {
    throw new Error('Environment validation failed');
  }
  logger.log('✓ Environment variables validated');

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
    throw new Error('Health checks failed, cannot start in production mode');
  }

  // 5. 配置安全中间件
  setupSecurity(app, configService);

  // 6. 配置全局管道和过滤器
  setupGlobalPipes(app, configService);

  // 7. 配置 Swagger
  setupSwagger(app, configService);

  // 8. 设置全局前缀
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/ws', '/chat', '/chat-v2'],
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
  logger.log(`✓ Server started in ${startupTime}ms`);

  return app;
}

// 启动应用
if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}
