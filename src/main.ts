import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Redis WebSocket 适配器
 * 支持分布式 WebSocket 消息广播
 */
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null;

  async connectToRedis(configService: ConfigService) {
    try {
      const redisPassword = configService.get('REDIS_PASSWORD');
      const redisOptions: any = {
        host: configService.get('REDIS_HOST', '172.23.3.187'),
        port: configService.get('REDIS_PORT', 6379),
        db: configService.get('REDIS_DB', 0),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      };

      if (redisPassword && redisPassword.trim()) {
        redisOptions.password = redisPassword;
      }

      const pubClient = new Redis(redisOptions);
      const subClient = pubClient.duplicate();

      this.adapterConstructor = createAdapter(pubClient, subClient, {
        key: 'openchat:socket.io',
        requestsTimeout: 5000,
      });

      console.log('Redis adapter initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Redis adapter, running in single-instance mode:', error.message);
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor && typeof server.adapter === 'function') {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // 获取配置
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // ========================
  // 安全中间件
  // ========================

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

      // 允许无 origin 的请求（如移动应用）
      if (!origin || allowedOrigins.includes(origin)) {
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
    maxAge: 86400, // 24小时
  });

  // ========================
  // 全局管道和过滤器
  // ========================

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除未定义的属性
      forbidNonWhitelisted: true, // 拒绝包含未定义属性的请求
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction, // 生产环境隐藏详细错误信息
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ========================
  // API 文档（Swagger）
  // ========================

  if (!isProduction) {
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

    logger.log('Swagger API docs available at /api/docs');
  }

  // ========================
  // 全局前缀
  // ========================

  app.setGlobalPrefix('api', {
    exclude: ['/health', '/ws'], // 排除健康检查和 WebSocket
  });

  //// ========================
  // WebSocket Redis 适配器
  // ========================
  // 暂时禁用 Redis 适配器，以便应用程序能够在没有 Redis 的情况下启动
  // const redisAdapter = new RedisIoAdapter(app);
  // await redisAdapter.connectToRedis(configService);
  // app.useWebSocketAdapter(redisAdapter);
  console.log('Redis adapter disabled for now');

  // ========================
  // 优雅关闭
  // ========================

  app.enableShutdownHooks();

  // ========================
  // 启动服务
  // ========================

  await app.listen(port, host);

  logger.log(`
  ========================================
  🚀 OpenChat Server Started Successfully!
  ========================================
  📡 Environment: ${nodeEnv}
  🌐 Server:      http://${host}:${port}
  📚 API Docs:    http://${host}:${port}/api/docs
  🔌 WebSocket:   ws://${host}:${port}/ws
  ========================================
  `);

  // 初始化IM Provider
  try {
    const { IMProviderService } = await import('./modules/im-provider/im-provider.service');
    const imProviderService = app.get(IMProviderService);
    await imProviderService.initializeProvider('wukongim', {
      provider: 'wukongim',
      endpoint: configService.get('WUKONGIM_API_URL') || 'http://localhost:5001',
      timeout: 10000,
    });
    logger.log('IM Provider initialized with WukongIM');
  } catch (error: any) {
    logger.warn('Failed to initialize IM Provider, continuing without IM integration:', error.message);
  }

  // 优雅关闭处理
  const gracefulShutdown = async (signal: string) => {
    logger.log(`${signal} received. Starting graceful shutdown...`);
    await app.close();
    logger.log('Graceful shutdown completed.');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// 启动应用
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
