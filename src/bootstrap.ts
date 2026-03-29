/**
 * 应用程序启动引导
 *
 * 提供健壮的服务启动流程：
 * 1. 环境验证
 * 2. 依赖服务健康检查
 * 3. 优雅启动
 * 4. 错误恢复
 */

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, INestApplication, Type } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import * as compression from "compression";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis, RedisOptions } from "ioredis";
import * as net from "net";
import { AppModule } from "./app.module";
import { ImAdminApiModule } from "./api/im-admin-api.module";
import { ImAppApiModule } from "./api/im-app-api.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import {
  IM_ADMIN_API_DOCS_PATH,
  IM_ADMIN_API_DOCS_ROUTE,
  IM_ADMIN_API_OPENAPI_JSON_PATH,
  IM_ADMIN_API_OPENAPI_JSON_ROUTE,
  IM_ADMIN_API_PREFIX,
  IM_APP_API_DOCS_PATH,
  IM_APP_API_DOCS_ROUTE,
  IM_APP_API_OPENAPI_JSON_PATH,
  IM_APP_API_OPENAPI_JSON_ROUTE,
  IM_APP_API_PREFIX,
} from "./common/http/im-api-surface.constants";
import {
  finalizeImOpenApiDocument,
  IM_OPENAPI_API_VERSION,
} from "./common/http/im-openapi-document.util";
import {
  ImOpenApiSchemaAdminModule,
  ImOpenApiSchemaAppModule,
  ImOpenApiSchemaRuntimeModule,
} from "./common/http/im-openapi-schema.module";
import {
  ErrorCode,
  ErrorModule,
  ErrorSeverity,
  getErrorSolution,
  mapSystemErrorToErrorCode,
} from "./common/constants/error-codes";

const logger = new Logger("Bootstrap");

interface BootstrapConfig {
  port: number;
  host: string;
  nodeEnv: string;
  isProduction: boolean;
}

interface HealthCheckResult {
  service: string;
  status: "healthy" | "unhealthy";
  message?: string;
  latency?: number;
  details?: {
    host: string;
    port: number | string;
    database?: string;
  };
}

interface SwaggerSetupOptions {
  appModule: Type<unknown>;
  adminModule: Type<unknown>;
  readOnly?: boolean;
}

function resolveBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
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

    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
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
async function findAvailablePort(
  startPort: number,
  host: string,
  maxAttempts: number = 100,
): Promise<number> {
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

  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`,
  );
}

function printModuleSuccess(
  module: string,
  message: string,
  details?: Record<string, any>,
): void {
  const green = "\x1b[32m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const cyan = "\x1b[36m";
  const time = new Date()
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");

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
  },
): void {
  const errorCode = options?.errorCode || ErrorCode.INTERNAL_ERROR;
  const severity = options?.severity || ErrorSeverity.HIGH;
  const solution =
    typeof errorCode === "string" &&
    Object.values(ErrorCode).includes(errorCode as ErrorCode)
      ? getErrorSolution(errorCode as ErrorCode)
      : null;

  const red = "\x1b[31m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const yellow = "\x1b[33m";
  const bgRed = "\x1b[41m";
  const time = new Date()
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");

  let output = "";

  if (severity === ErrorSeverity.CRITICAL) {
    output = `\n${bgRed}${" ".repeat(67)}${reset}\n`;
    output += `${bgRed}${red}  ${bold}!!! CRITICAL ERROR !!!${reset}${bgRed}                                      ${reset}\n`;
    output += `${bgRed}${" ".repeat(67)}${reset}\n`;
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
    const stackLines = options.stack.split("\n").slice(0, 3);
    output += `\n${red}║${reset} ${yellow}Stack:${reset}`;
    for (const line of stackLines) {
      output += `\n${red}║${reset}   ${line.trim()}`;
    }
  }

  output += `\n${red}╚═════════════════════════════════════════════════════════════════════╝${reset}\n`;

  process.stderr.write(output);
}

function validateEnvironment(): boolean {
  const criticalEnvVars = ["JWT_SECRET"];
  const missing = criticalEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    printModuleError(
      "Environment",
      "ValidationFailed",
      `Missing critical environment variables: ${missing.join(", ")}`,
      {
        suggestions: ["Please set these variables in .env file"],
      },
    );
    return false;
  }

  return true;
}

async function checkDatabaseConnection(
  configService: ConfigService,
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const host = configService.get("DB_HOST", "localhost");
  const port = configService.get("DB_PORT", 5432);
  const database = configService.get("DB_NAME", "openchat");
  const user = configService.get("DB_USERNAME", "sdkwork_dev");

  logger.log(`Checking database connection: ${host}:${port}/${database}`);

  try {
    const { DataSource } = await import("typeorm");
    const dataSource = new DataSource({
      type: "postgres",
      host,
      port,
      username: user,
      password: configService.get("DB_PASSWORD"),
      database,
      connectTimeoutMS: 5000,
    });

    await dataSource.initialize();
    await dataSource.destroy();

    const latency = Date.now() - startTime;
    printModuleSuccess("Database", "Connection successful", {
      Host: `${host}:${port}`,
      Database: database,
      User: user,
      Latency: `${latency}ms`,
    });

    return {
      service: "Database",
      status: "healthy",
      latency,
      details: { host, port, database },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errorCode = mapSystemErrorToErrorCode(error);
    const severity = ErrorSeverity.CRITICAL;

    printModuleError("Database", "ConnectionFailed", message, {
      errorCode,
      severity,
      details: {
        Host: `${host}:${port}`,
        Database: database,
        User: user,
      },
    });

    return {
      service: "Database",
      status: "unhealthy",
      message,
      latency: Date.now() - startTime,
      details: { host, port, database },
    };
  }
}

async function checkRedisConnection(
  configService: ConfigService,
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let redis: Redis | null = null;
  const host = configService.get("REDIS_HOST", "localhost");
  const port = configService.get("REDIS_PORT", 6379);
  const db = configService.get("REDIS_DB", 0);

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

    const password = configService.get("REDIS_PASSWORD");
    if (password && password.trim()) {
      redisOptions.password = password;
    }

    redis = new Redis(redisOptions);
    await redis.connect();
    await redis.ping();

    const latency = Date.now() - startTime;
    printModuleSuccess("Redis", "Connection successful", {
      Host: `${host}:${port}`,
      Database: String(db),
      Latency: `${latency}ms`,
    });

    return {
      service: "Redis",
      status: "healthy",
      latency,
      details: { host, port, database: String(db) },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errorCode = ErrorCode.REDIS_CONNECTION_FAILED;
    const severity = ErrorSeverity.HIGH;

    printModuleError("Redis", "ConnectionFailed", message, {
      errorCode,
      severity,
      details: {
        Host: `${host}:${port}`,
        Database: String(db),
      },
    });

    return {
      service: "Redis",
      status: "unhealthy",
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

async function performHealthChecks(
  configService: ConfigService,
): Promise<HealthCheckResult[]> {
  logger.log("");
  logger.log("═══════════════════════════════════════════════════════════");
  logger.log("                    Service Health Check                    ");
  logger.log("═══════════════════════════════════════════════════════════");
  logger.log("");

  const results = await Promise.all([
    checkDatabaseConnection(configService),
    checkRedisConnection(configService),
  ]);

  const healthy = results.filter((r) => r.status === "healthy");
  const unhealthy = results.filter((r) => r.status === "unhealthy");

  logger.log("");
  logger.log("───────────────────────────────────────────────────────────");
  logger.log(
    `Health check completed: ${healthy.length} healthy, ${unhealthy.length} unhealthy`,
  );
  logger.log("═══════════════════════════════════════════════════════════");
  logger.log("");

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
        this.adapterConstructor = createAdapter(
          sharedPubClient,
          sharedSubClient,
          {
            key: "openchat:socket.io",
            requestsTimeout: 5000,
          },
        );
        this.isConnected = true;
        printModuleSuccess(
          "WebSocketAdapter",
          "Redis adapter initialized (reused connection)",
        );
        return true;
      }

      const host = configService.get("REDIS_HOST", "localhost");
      const port = configService.get("REDIS_PORT", 6379);
      const db = configService.get("REDIS_DB", 0);

      const redisOptions: RedisOptions = {
        host,
        port,
        db,
        retryStrategy: (times: number) => {
          if (times > 10) {
            logger.error("Redis adapter connection retry exhausted");
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        keepAlive: 10000,
        enableReadyCheck: true,
      };

      const password = configService.get("REDIS_PASSWORD");
      if (password && password.trim()) {
        redisOptions.password = password;
      }

      logger.log(`Initializing Redis WebSocket adapter: ${host}:${port}/${db}`);

      sharedPubClient = new Redis(redisOptions);
      sharedSubClient = sharedPubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Redis pub connection timeout"));
          }, 10000);

          sharedPubClient!.once("ready", () => {
            clearTimeout(timeout);
            resolve();
          });
          sharedPubClient!.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }),
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Redis sub connection timeout"));
          }, 10000);

          sharedSubClient!.once("ready", () => {
            clearTimeout(timeout);
            resolve();
          });
          sharedSubClient!.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        }),
      ]);

      this.adapterConstructor = createAdapter(
        sharedPubClient,
        sharedSubClient,
        {
          key: "openchat:socket.io",
          requestsTimeout: 5000,
        },
      );

      this.isConnected = true;
      printModuleSuccess("WebSocketAdapter", "Redis adapter initialized");
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      printModuleError("WebSocketAdapter", "RedisAdapterFailed", message, {
        suggestions: ["Running in single-instance mode"],
      });
      this.isConnected = false;
      return false;
    }
  }

  createIOServer(port: number, options?: Record<string, unknown>) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor && typeof server.adapter === "function") {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  isRedisConnected(): boolean {
    return this.isConnected;
  }
}

function createSwaggerConfig(
  title: string,
  description: string,
  tags: Array<{ name: string; description: string }>,
) {
  const builder = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(IM_OPENAPI_API_VERSION);

  for (const tag of tags) {
    builder.addTag(tag.name, tag.description);
  }

  return builder
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token",
      },
      "bearer",
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT Token",
      },
      "access-token",
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "BOT",
        description: "Bot token: oc_bot_<appId>_<secret>",
      },
      "bot-token",
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "CRAW",
        description: "Craw agent token: craw_<secret>",
      },
      "craw-agent",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "OpenChat API Key",
      },
      "x-api-key",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-Craw-API-Key",
        description: "Craw Agent API Key",
      },
      "x-craw-api-key",
    )
    .build();
}

function setupSwagger(
  app: INestApplication,
  _configService: ConfigService,
  options?: SwaggerSetupOptions,
) {
  const appModule = options?.appModule || ImAppApiModule;
  const adminModule = options?.adminModule || ImAdminApiModule;
  const readOnly = options?.readOnly === true;
  const appConfig = createSwaggerConfig(
    "OpenChat IM App API",
    "Frontend-facing IM APIs for OpenChat applications and SDK generation.",
    [
      { name: "auth", description: "Authentication APIs" },
      { name: "users", description: "User Management APIs" },
      { name: "friends", description: "Friend Relationship APIs" },
      { name: "messages", description: "Message Management APIs" },
      { name: "groups", description: "Group Management APIs" },
      { name: "conversations", description: "Conversation Management APIs" },
      { name: "contacts", description: "Contact Management APIs" },
      { name: "rtc", description: "Real-time Audio/Video APIs" },
      { name: "iot", description: "IoT Device Management APIs" },
      { name: "wukongim", description: "WuKongIM client bootstrap APIs" },
    ],
  );
  const adminConfig = createSwaggerConfig(
    "OpenChat IM Admin API",
    "Admin-facing IM control-plane APIs for WuKongIM and RTC operations.",
    [
      { name: "rtc-admin", description: "RTC control-plane management APIs" },
      {
        name: "wukongim-admin",
        description: "WuKongIM control-plane management APIs",
      },
    ],
  );

  const appDocument = finalizeImOpenApiDocument(
    SwaggerModule.createDocument(app, appConfig, {
      include: [appModule],
      deepScanRoutes: true,
    }),
    IM_APP_API_PREFIX,
  );
  const adminDocument = finalizeImOpenApiDocument(
    SwaggerModule.createDocument(app, adminConfig, {
      include: [adminModule],
      deepScanRoutes: true,
    }),
    IM_ADMIN_API_PREFIX,
  );

  SwaggerModule.setup(IM_APP_API_DOCS_ROUTE, app, appDocument, {
    jsonDocumentUrl: IM_APP_API_OPENAPI_JSON_ROUTE,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      supportedSubmitMethods: readOnly ? [] : undefined,
    },
    customSiteTitle: "OpenChat IM App API Documentation",
  });

  SwaggerModule.setup(IM_ADMIN_API_DOCS_ROUTE, app, adminDocument, {
    jsonDocumentUrl: IM_ADMIN_API_OPENAPI_JSON_ROUTE,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      supportedSubmitMethods: readOnly ? [] : undefined,
    },
    customSiteTitle: "OpenChat IM Admin API Documentation",
  });

  printModuleSuccess("Swagger", "API documentation initialized", {
    AppDocs: IM_APP_API_DOCS_PATH,
    AppOpenAPI: IM_APP_API_OPENAPI_JSON_PATH,
    AdminDocs: IM_ADMIN_API_DOCS_PATH,
    AdminOpenAPI: IM_ADMIN_API_OPENAPI_JSON_PATH,
  });
}

function setupSecurity(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get("NODE_ENV") === "production";

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction ? undefined : false,
    }),
  );

  app.use(compression());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = configService
        .get<string>(
          "CORS_ORIGINS",
          "http://localhost:3000,http://localhost:5173",
        )
        .split(",");

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        logger.warn(`CORS rejected for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-API-Key",
      "X-Bot-Token",
      "X-Craw-API-Key",
      "X-OpenChat-Signature",
      "X-OpenChat-Timestamp",
      "X-OpenChat-Nonce",
      "X-OpenChat-Event-Id",
      "Idempotency-Key",
    ],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });

  printModuleSuccess("Security", "Middleware configured");
}

function setupGlobalPipes(app: INestApplication, configService: ConfigService) {
  const isProduction = configService.get("NODE_ENV") === "production";

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

  printModuleSuccess("Pipes", "Global pipes and filters configured");
}

async function setupWebSocketAdapter(
  app: INestApplication,
  configService: ConfigService,
) {
  const enableRedis = resolveBooleanEnv(
    configService.get<string>("ENABLE_REDIS_ADAPTER", "true"),
  );

  if (!enableRedis) {
    logger.log("Redis adapter disabled");
    return;
  }

  const redisAdapter = new RedisIoAdapter(app);
  const connected = await redisAdapter.connectToRedis(configService);

  if (connected) {
    app.useWebSocketAdapter(redisAdapter);
  }
}

async function initializeIMProvider(
  app: INestApplication,
  configService: ConfigService,
) {
  try {
    const { IMProviderService } =
      await import("./modules/im-provider/im-provider.service");
    const imProviderService = app.get(IMProviderService);

    const provider = configService.get("IM_PROVIDER", "wukongim");
    const endpoint = configService.get(
      "WUKONGIM_API_URL",
      "http://localhost:5001",
    );

    await imProviderService.initializeProvider(provider, {
      provider,
      endpoint,
      timeout: 10000,
    });

    printModuleSuccess("IMProvider", `Initialized: ${provider}`, {
      Endpoint: endpoint,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    printModuleError("IMProvider", "InitializationFailed", message, {
      suggestions: ["Continuing without IM integration"],
    });
  }
}

function setupGracefulShutdown(app: INestApplication) {
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    logger.log("");
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
      printModuleSuccess("Shutdown", "Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown error:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    printModuleError("Application", "UncaughtException", error.message, {
      stack: error.stack,
    });
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (reason, promise) => {
    printModuleError("Application", "UnhandledRejection", String(reason));
  });
}

function printStartupInfo(config: BootstrapConfig, startupTime: number) {
  const { port, host, nodeEnv } = config;

  const green = "\x1b[32m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const cyan = "\x1b[36m";

  let output = `\n${green}╔════════════════════════════════════════════════════════════╗${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}║${reset}           ${bold}🚀 OpenChat Server Started Successfully!${reset}           ${green}║${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}╠════════════════════════════════════════════════════════════╣${reset}`;
  output += `\n${green}║${reset}  ${cyan}Environment:${reset}  ${nodeEnv.padEnd(42)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Server URL:${reset}   http://${host}:${port.toString().padEnd(30)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}App Docs:${reset}     http://${host}:${port}${IM_APP_API_DOCS_PATH}${" ".repeat(10)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}App OpenAPI:${reset}  http://${host}:${port}${IM_APP_API_OPENAPI_JSON_PATH}${" ".repeat(3)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Admin Docs:${reset}   http://${host}:${port}${IM_ADMIN_API_DOCS_PATH}${" ".repeat(3)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Admin OpenAPI:${reset} http://${host}:${port}${IM_ADMIN_API_OPENAPI_JSON_PATH}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}App Prefix:${reset}   ${IM_APP_API_PREFIX.padEnd(38)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Admin Prefix:${reset} ${IM_ADMIN_API_PREFIX.padEnd(38)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}WebSocket:${reset}    ws://${host}:${port}/chat-v2${" ".repeat(20)}${green}║${reset}`;
  output += `\n${green}║${reset}  ${cyan}Startup Time:${reset} ${startupTime}ms${" ".repeat(36)}${green}║${reset}`;
  output += `\n${green}║${reset}                                                            ${green}║${reset}`;
  output += `\n${green}╚════════════════════════════════════════════════════════════╝${reset}\n`;

  process.stdout.write(output);
}

function printStartupInfoByMode(
  config: BootstrapConfig,
  startupTime: number,
  schemaOnlyMode: boolean,
) {
  if (!schemaOnlyMode) {
    printStartupInfo(config, startupTime);
    return;
  }

  const { port, host, nodeEnv } = config;

  const green = "\x1b[32m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const cyan = "\x1b[36m";

  let output = `\n${green}========================================================================${reset}`;
  output += `\n${green}|${reset} ${bold}OpenChat Schema Runtime Started${reset}`;
  output += `\n${green}|${reset} ${cyan}Environment:${reset}  ${nodeEnv}`;
  output += `\n${green}|${reset} ${cyan}Server URL:${reset}   http://${host}:${port}`;
  output += `\n${green}|${reset} ${cyan}App Docs:${reset}     http://${host}:${port}${IM_APP_API_DOCS_PATH}`;
  output += `\n${green}|${reset} ${cyan}App OpenAPI:${reset}  http://${host}:${port}${IM_APP_API_OPENAPI_JSON_PATH}`;
  output += `\n${green}|${reset} ${cyan}Admin Docs:${reset}   http://${host}:${port}${IM_ADMIN_API_DOCS_PATH}`;
  output += `\n${green}|${reset} ${cyan}Admin OpenAPI:${reset} http://${host}:${port}${IM_ADMIN_API_OPENAPI_JSON_PATH}`;
  output += `\n${green}|${reset} ${cyan}Runtime Mode:${reset} schema-only`;
  output += `\n${green}|${reset} ${cyan}Startup Time:${reset} ${startupTime}ms`;
  output += `\n${green}========================================================================${reset}\n`;

  process.stdout.write(output);
}

export async function bootstrap() {
  const startTime = Date.now();
  const schemaOnlyMode = resolveBooleanEnv(process.env.OPENAPI_SCHEMA_ONLY);
  const rootModule = schemaOnlyMode ? ImOpenApiSchemaRuntimeModule : AppModule;
  const requestedPort = Number.parseInt(process.env.PORT || "3000", 10) || 3000;
  const requestedHost = process.env.HOST || "0.0.0.0";
  const nodeEnv = process.env.NODE_ENV || "development";
  const strictPort = resolveBooleanEnv(
    process.env.OPENCHAT_STRICT_PORT ||
      (nodeEnv === "development" ? "false" : "true"),
  );

  logger.log("");
  logger.log("═══════════════════════════════════════════════════════════");
  logger.log("                 OpenChat Server Starting...                ");
  logger.log("═══════════════════════════════════════════════════════════");
  logger.log("");

  if (!schemaOnlyMode && !validateEnvironment()) {
    throw new Error("Environment validation failed");
  }

  if (schemaOnlyMode) {
    printModuleSuccess("OpenAPI", "Schema-only runtime mode enabled", {
      AppOpenAPI: IM_APP_API_OPENAPI_JSON_PATH,
      AdminOpenAPI: IM_ADMIN_API_OPENAPI_JSON_PATH,
    });
  } else {
    printModuleSuccess("Environment", "Validation passed");
  }

  if (strictPort) {
    const available = await isPortAvailable(requestedPort, requestedHost);
    if (!available) {
      throw new Error(
        `Port ${requestedPort} is already in use and OPENCHAT_STRICT_PORT=true`,
      );
    }
  } else {
    const availablePort = await findAvailablePort(requestedPort, requestedHost);
    if (availablePort !== requestedPort) {
      process.env.PORT = String(availablePort);
      if (
        !process.env.APP_PORT ||
        process.env.APP_PORT === String(requestedPort)
      ) {
        process.env.APP_PORT = String(availablePort);
      }
    }
  }

  logger.log(
    `Runtime port strategy: ${strictPort ? "strict" : "flexible"} (requested ${requestedPort}, resolved ${process.env.PORT || requestedPort})`,
  );

  const app = await NestFactory.create(rootModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
    abortOnError: false,
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  const config: BootstrapConfig = {
    port: configService.get<number>("PORT", requestedPort),
    host: configService.get<string>("HOST", requestedHost),
    nodeEnv: configService.get<string>("NODE_ENV", nodeEnv),
    isProduction: configService.get("NODE_ENV") === "production",
  };

  if (!schemaOnlyMode) {
    const healthResults = await performHealthChecks(configService);
    const allHealthy = healthResults.every((r) => r.status === "healthy");

    if (!allHealthy && config.isProduction) {
      throw new Error("Health check failed, cannot start in production");
    }
  }

  setupSecurity(app, configService);
  setupGlobalPipes(app, configService);
  setupSwagger(app, configService, {
    appModule: schemaOnlyMode ? ImOpenApiSchemaAppModule : ImAppApiModule,
    adminModule: schemaOnlyMode ? ImOpenApiSchemaAdminModule : ImAdminApiModule,
    readOnly: schemaOnlyMode,
  });

  if (!schemaOnlyMode) {
    await setupWebSocketAdapter(app, configService);
  }
  setupGracefulShutdown(app);

  await app.listen(config.port, config.host);

  if (!schemaOnlyMode) {
    await initializeIMProvider(app, configService);
  }

  const startupTime = Date.now() - startTime;
  printStartupInfoByMode(config, startupTime, schemaOnlyMode);

  return app;
}
