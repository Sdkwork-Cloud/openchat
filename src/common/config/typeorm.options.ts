import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";
import {
  parseBooleanValue,
  parseIntegerValue,
  resolveNodeEnvironment,
} from "./env-loader";
import { OpenChatNodeEnvironment } from "./env-file-paths";
import { SnakeNamingStrategy } from "./snake-naming.strategy";
import { TYPEORM_ENTITIES } from "./typeorm.entities";

interface DatabaseEnvironmentDefaults {
  acquireTimeout: number;
  connectionTimeout: number;
  database: string;
  host: string;
  idleTimeout: number;
  logging: boolean;
  password: string;
  poolMax: number;
  poolMin: number;
  port: number;
  ssl: boolean;
  synchronize: boolean;
  username: string;
}

export interface OpenChatDatabaseConfig {
  acquireTimeout: number;
  connectionTimeout: number;
  database: string;
  host: string;
  idleTimeout: number;
  isProduction: boolean;
  logging: boolean;
  nodeEnv: OpenChatNodeEnvironment;
  password: string;
  poolMax: number;
  poolMin: number;
  port: number;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  synchronize: boolean;
  username: string;
}

const DATABASE_DEFAULTS: Record<
  OpenChatNodeEnvironment,
  DatabaseEnvironmentDefaults
> = {
  development: {
    acquireTimeout: 30000,
    connectionTimeout: 10000,
    database: "openchat_dev",
    host: "127.0.0.1",
    idleTimeout: 300000,
    logging: false,
    password: "openchat_password",
    poolMax: 10,
    poolMin: 2,
    port: 5432,
    ssl: false,
    synchronize: false,
    username: "openchat",
  },
  test: {
    acquireTimeout: 10000,
    connectionTimeout: 5000,
    database: "openchat_test",
    host: "127.0.0.1",
    idleTimeout: 60000,
    logging: false,
    password: "openchat_password",
    poolMax: 5,
    poolMin: 1,
    port: 5432,
    ssl: false,
    synchronize: false,
    username: "openchat",
  },
  production: {
    acquireTimeout: 60000,
    connectionTimeout: 15000,
    database: "openchat",
    host: "127.0.0.1",
    idleTimeout: 300000,
    logging: false,
    password: "",
    poolMax: 20,
    poolMin: 5,
    port: 5432,
    ssl: false,
    synchronize: false,
    username: "openchat",
  },
};

export function resolveDatabaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenChatDatabaseConfig {
  const nodeEnv = resolveNodeEnvironment(env.NODE_ENV);
  const defaults = DATABASE_DEFAULTS[nodeEnv];

  return {
    acquireTimeout: parseIntegerValue(
      env.DB_ACQUIRE_TIMEOUT,
      defaults.acquireTimeout,
    ),
    connectionTimeout: parseIntegerValue(
      env.DB_CONNECTION_TIMEOUT,
      defaults.connectionTimeout,
    ),
    database: env.DB_NAME || defaults.database,
    host: env.DB_HOST || defaults.host,
    idleTimeout: parseIntegerValue(env.DB_IDLE_TIMEOUT, defaults.idleTimeout),
    isProduction: nodeEnv === "production",
    logging: parseBooleanValue(env.DB_LOGGING, defaults.logging),
    nodeEnv,
    password: env.DB_PASSWORD ?? defaults.password,
    poolMax: parseIntegerValue(env.DB_POOL_MAX, defaults.poolMax),
    poolMin: parseIntegerValue(env.DB_POOL_MIN, defaults.poolMin),
    port: parseIntegerValue(env.DB_PORT, defaults.port),
    ssl: parseBooleanValue(env.DB_SSL, defaults.ssl),
    sslRejectUnauthorized: parseBooleanValue(
      env.DB_SSL_REJECT_UNAUTHORIZED,
      nodeEnv === "production",
    ),
    synchronize: parseBooleanValue(env.DB_SYNCHRONIZE, defaults.synchronize),
    username: env.DB_USERNAME || defaults.username,
  };
}

export function createTypeOrmDataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const config = resolveDatabaseConfig(env);

  return {
    type: "postgres",
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [...TYPEORM_ENTITIES],
    synchronize: config.synchronize,
    logging: config.logging,
    namingStrategy: new SnakeNamingStrategy(),
    ssl: config.ssl
      ? {
          rejectUnauthorized: config.sslRejectUnauthorized,
        }
      : false,
    extra: {
      min: config.poolMin,
      max: config.poolMax,
      connectionTimeoutMillis: config.connectionTimeout,
      idleTimeoutMillis: config.idleTimeout,
      acquireTimeoutMillis: config.acquireTimeout,
      allowExitOnIdle: false,
    },
  };
}

export function createTypeOrmModuleOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  return createTypeOrmDataSourceOptions(env) as TypeOrmModuleOptions;
}

export function getDatabaseConfigSummary(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, boolean | number | string> {
  const config = resolveDatabaseConfig(env);

  return {
    database: config.database,
    host: config.host,
    logging: config.logging,
    nodeEnv: config.nodeEnv,
    passwordConfigured: config.password.trim().length > 0,
    poolMax: config.poolMax,
    poolMin: config.poolMin,
    port: config.port,
    ssl: config.ssl,
    synchronize: config.synchronize,
    username: config.username,
  };
}
