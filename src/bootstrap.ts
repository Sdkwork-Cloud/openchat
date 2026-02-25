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
import * as net from 'net';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  ErrorCode,
  ErrorModule,
  ErrorSeverity,
  getErrorSolution,
  mapSystemErrorToErrorCode,
} from './common/constants/error-codes';

const logger = new Logger('Bootstrap');

interface BootstrapConfig {
  port: number;
  host: string;
  nodeEnv: string;
  isProduction: boolean;
}

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
 * 检查端口是否可用
 * @param port 端口号
 * @param host 主机地址
 * @returns 如果端口可用返回true，否则返回false
 */
function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, host);
  });
}

/**
 * 查找可用端口
 * @param startPort 起始端口
 * @param host 主机地址
 * @param maxAttempts 最大尝试次数
 * @returns 可用端口号
 */
async function findAvailablePort(startPort: number, host: string, maxAttempts: number = 100): Promise<number> {
  let port = startPort;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const available = await isPortAvailable(port, host);
    if (available) {
      if (port !== startPort) {
        logger.warn(`Port ${startPort} is in use, using port ${port} instead`);
      }
      return port;
    }
    port++;
    attempts++;
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

function printModuleSuccess(module: string, message: string, details?: Record<string, any>): void {
  const green = '\x1b[32m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const time = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

  let output = `\n${green}┌───────────────────────────────────────────────────────────────┐${reset}`;
  output += `\n${green}│${reset} ${bold}SUCCESS${reset} - ${time}`;
  output += `\n${green}├───────────────────────────────────────────────────────────────┤${reset}`;
  output += `\n${green}│${reset} ${cyan}Module:${reset}   ${module}`;
  output += `\n${green}│${reset} ${cyan}Message:${reset}  ${message}`;

  if (details && Object.keys(details).length > 0) {
    for (const [key, value] of Object.entries(details)) {
      output += `\n${green}│${reset} ${cyan}${key}:${reset} ${value}`;
    }
  }

  output += `\n${green}└───────────────────────────────────────────────────────────────┘${reset}\n`;

  process.stdout.write(output);
}

function printModuleError(
  module: string,
  errorType: string,
  message: string,
  options?: {
    errorCode?: ErrorCode | string | number;
    severity?: ErrorSeverity;
    stack?: string;
    suggestions?: string[];
    details?: Record<string, any>;
  }
): void {
  const errorCode = options?.errorCode || ErrorCode.INTERNAL_ERROR;
  const severity = options?.severity || ErrorSeverity.HIGH;
  const solution = typeof errorCode === 'string' && Object.values(ErrorCode).includes(errorCode as ErrorCode)
    ? getErrorSolution(errorCode as ErrorCode)
    : null;

  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const yellow = '\x1b[33m';
  const bgRed = '\x1b[41m';
  const time = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

  let output = '';

  if (severity === ErrorSeverity.CRITICAL) {
    output = `\n${bgRed}${' '.repeat(67)}${reset}\n`;
    output += `${bgRed}${red}  ${bold}!!! CRITICAL ERROR !!!${reset}${bgRed}                                      ${reset}\n`;
    output += `${bgRed}${' '.repeat(67)}${reset}\n`;
  }

  output += `\n${red}╔═════════════════════════════════════════════════════════════════════╗${reset}\n`;
  output += `${red}║${reset} ${bold}${severity}${reset} - ${time}\n`;
  output += `${red}╠═════════════════════════════════════════════════════════════════════╣${reset}\n`;
  output += `${red}║${reset} ${yellow}Module:${reset}     ${module}\n`;
  output += `${red}║${reset} ${yellow}Error Type:${reset} ${errorType}\n`;
  output += `${red}║${reset} ${yellow}Error Code:${reset} ${errorCode}`;

  if (options?.details) {
    for (const [key, value] of Object.entries(options.details)) {
      output += `\n${red}║${reset} ${yellow}${key}:${reset} ${value}`;
    }
  }

  output += `\n${red}║${reset} ${yellow}Message:${reset}    ${message}`;

  const suggestions = options?.suggestions || solution?.actions;
  if (suggestions && suggestions.length > 0) {
    output += `\n${red}║${reset} ${yellow}Suggestions:${reset}`;
    for (const suggestion of suggestions.slice(0, 4)) {
      output += `\n${red}║${reset}   - ${suggestion}`;
    }
  }

  if (options?.stack) {
    const stackLines = options.stack.split('\n').slice(0, 3);
    output += `\n${red}║${reset} ${yellow}Stack:${reset}`;
    for (const line of stackLines) {
      output += `\n${red}║${reset}   ${line.trim()}`;
    }
  }

  output += `\n${red}╚═════════════════════════════════════════════════════════════════════╝${reset}\n`;

  process.stderr.write(output);
}

function validateEnvironment(): boolean {
  const criticalEnvVars = ['JWT_SECRET'];
  const missing = criticalEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    printModuleError('Environment', 'ValidationFailed', `Missing critical environment variables: ${missing.join(', ')}`, {
      suggestions: ['Please set these variables in .env file'],
    });
    return false;
  }

  return true;
}

async function checkDatabaseConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const host = configService.get('DB_HOST', 'localhost');
  const port = configService.get('DB_PORT', 5432);
  const database = configService.get('DB_NAME', 'openchat');
  const user = configService.get('DB_USERNAME', 'sdkwork_dev');

  logger.log(`Checking database connection: ${host}:${port}/${database}`);

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
    printModuleSuccess('Database', 'Connection successful', {
      Host: `${host}:${port}`,
      Database: database,
      User: user,
      Latency: `${latency}ms`,
    });

    return {
      service: 'Database',
      status: 'healthy',
      latency,
      details: { host, port, database },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = mapSystemErrorToErrorCode(error);
    const severity = ErrorSeverity.CRITICAL;

    printModuleError('Database', 'ConnectionFailed', message, {
      errorCode,
      severity,
      details: {
        Host: `${host}:${port}`,
        Database: database,
        User: user,
      },
    });

    return {
      service: 'Database',
      status: 'unhealthy',
      message,
      latency: Date.now() - startTime,
      details: { host, port, database },
    };
  }
}

async function checkRedisConnection(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let redis: Redis | null = null;
  const host = configService.get('REDIS_HOST', 'localhost');
  const port = configService.get('REDIS_PORT', 6379);
  const db = configService.get('REDIS_DB', 0);

  logger.log(`Checking Redis connection: ${host}:${port}/${db}`);

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
    printModuleSuccess('Redis', 'Connection successful', {
      Host: `${host}:${port}`,
      Database: String(db),
      Latency: `${latency}ms`,
    });

    return {
      service: 'Redis',
      status: 'healthy',
      latency,
      details: { host, port, database: String(db) },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = ErrorCode.REDIS_CONNECTION_FAILED;
    const severity = ErrorSeverity.HIGH;

    printModuleError('Redis', 'ConnectionFailed', message, {
      errorCode,
      severity,
      details: {
        Host: `${host}:${port}`,
        Database: String(db),
      },
    });

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

async function performHealthChecks(configService: ConfigService): Promise<HealthCheckResult[]> {
  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('                    Service Health Check                    ');
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
  logger.log(`Health check completed: ${healthy.length} healthy, ${unhealthy.length} unhealthy`);
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');

  return results;
}

let sharedPubClient: Redis | null = null;
let sharedSubClient: Redis | null = null;

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private isConnected = false;

  async connectToRedis(configService: ConfigService): Promise<boolean> {
    try {
      if (sharedPubClient && sharedSubClient) {
        this.adapterConstructor = createAdapter(sharedPubClient, sharedSubClient, {
          key: 'openchat:socket.io',
          requestsTimeout: 5000,
        });
        this.isConnected = true;
        printModuleSuccess('WebSocketAdapter', 'Redis adapter initialized (reused connection)');
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

      logger.log(`Initializing Redis WebSocket adapter: ${host}:${port}/${db}`);

      sharedPubClient = new Redis(redisOptions);
      sharedSubClient = sharedPubClient.duplicate();

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
      printModuleSuccess('WebSocketAdapter', 'Redis adapter initialized');
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      printModuleError('WebSocketAdapter', 'RedisAdapterFailed', message, {
        suggestions: ['Running in single-instance mode'],
      });
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

function setupSwagger(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

  if (isProduction) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('OpenChat API')
    .setDescription('OpenChat Instant Messaging Server API Documentation')
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication APIs')
    .addTag('users', 'User Management APIs')
    .addTag('friends', 'Friend Relationship APIs')
    .addTag('messages', 'Message Management APIs')
    .addTag('groups', 'Group Management APIs')
    .addTag('conversations', 'Conversation Management APIs')
    .addTag('contacts', 'Contact Management APIs')
    .addTag('rtc', 'Real-time Audio/Video APIs')
    .addTag('iot', 'IoT Device Management APIs')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Token',
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
    customSiteTitle: 'OpenChat API Documentation',
  });

  printModuleSuccess('Swagger', 'API documentation initialized', {
    URL: '/api/docs',
  });
}

function setupSecurity(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );

  app.use(compression());

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

  printModuleSuccess('Security', 'Middleware configured');
}

function setupGlobalPipes(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get('NODE_ENV') === 'production';

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

  app.useGlobalFilters(new GlobalExceptionFilter());

  printModuleSuccess('Pipes', 'Global pipes and filters configured');
}

async function setupWebSocketAdapter(app: INestApplication, configService: ConfigService) {
  const enableRedis = configService.get<boolean>('ENABLE_REDIS_ADAPTER', true);

  if (!enableRedis) {
    logger.log('Redis adapter disabled');
    return;
  }

  const redisAdapter = new RedisIoAdapter(app);
  const connected = await redisAdapter.connectToRedis(configService);

  if (connected) {
    app.useWebSocketAdapter(redisAdapter);
  }
}

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

    printModuleSuccess('IMProvider', `Initialized: ${provider}`, {
      Endpoint: endpoint,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    printModuleError('IMProvider', 'InitializationFailed', message, {
      suggestions: ['Continuing without IM integration'],
    });
  }
}

function setupGracefulShutdown(app: INestApplication) {
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    logger.log('');
    logger.log(`${signal} received, starting graceful shutdown...`);

    try {
      if (sharedPubClient) {
        await sharedPubClient.quit();
        sharedPubClient = null;
      }
      if (sharedSubClient) {
        await sharedSubClient.quit();
        sharedSubClient = null;
      }

      await app.close();
      printModuleSuccess('Shutdown', 'Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    printModuleError('Application', 'UncaughtException', error.message, {
      stack: error.stack,
    });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    printModuleError('Application', 'UnhandledRejection', String(reason));
  });
}

function printStartupInfo(config: BootstrapConfig, startupTime: number) {
  const { port, host, nodeEnv } = config;

  const green = '\x1b[32m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';

  let output = `\n${green}╔════════════════════════════════════════════════════════════╗${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}║${reset}           ${bold}🚀 OpenChat Server Started Successfully!${reset}           ${green}║${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}╠════════════════════════════════════════════════════════════╣${reset}`;
  output += `\n${green}║${reset}  ${cyan}Environment:${reset}  ${nodeEnv.padEnd(42)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Server URL:${reset}   http://${host}:${port.toString().padEnd(30)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}API Docs:${reset}     http://${host}:${port}/api/docs${' '.repeat(17)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}API Prefix:${reset}   /im/api/v1${' '.repeat(27)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}WebSocket:${reset}    ws://${host}:${port}/chat-v2${' '.repeat(20)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Startup Time:${reset} ${startupTime}ms${' '.repeat(36)}${green}║${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}╚════════════════════════════════════════════════════════════╝${reset}\n`;

  process.stdout.write(output);
}

export async function bootstrap() {
  const startTime = Date.now();

  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('                 OpenChat Server Starting...                ');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');

  if (!validateEnvironment()) {
    throw new Error('Environment validation failed');
  }

  printModuleSuccess('Environment', 'Validation passed');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    abortOnError: false,
  });

  const configService = app.get(ConfigService);

  const config: BootstrapConfig = {
    port: configService.get<number>('PORT', 3000),
    host: configService.get<string>('HOST', '0.0.0.0'),
    nodeEnv: configService.get<string>('NODE_ENV', 'development'),
    isProduction: configService.get('NODE_ENV') === 'production',
  };

  // 查找可用端口
  const availablePort = await findAvailablePort(config.port, config.host);
  config.port = availablePort;

  const healthResults = await performHealthChecks(configService);
  const allHealthy = healthResults.every(r => r.status === 'healthy');

  if (!allHealthy && config.isProduction) {
    throw new Error('Health check failed, cannot start in production');
  }

  setupSecurity(app, configService);
  setupGlobalPipes(app, configService);
  setupSwagger(app, configService);

  app.setGlobalPrefix('im/api/v1', {
    exclude: ['/health', '/ws', '/chat', '/chat-v2', '/metrics'],
  });

  await setupWebSocketAdapter(app, configService);
  setupGracefulShutdown(app);

  await app.listen(config.port, config.host);

  await initializeIMProvider(app, configService);

  const startupTime = Date.now() - startTime;
  printStartupInfo(config, startupTime);

  return app;
}
