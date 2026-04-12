import {
  createTypeOrmDataSourceOptions,
  createTypeOrmModuleOptions,
  resolveDatabaseConfig,
} from "./typeorm.options";
import { TYPEORM_ENTITIES } from "./typeorm.entities";
import { RTCCallSession } from "../../modules/rtc/rtc-call-session.entity";
import { RTCCallParticipant } from "../../modules/rtc/rtc-call-participant.entity";
import { AgentMemory } from "../../modules/agent/memory/memory.entity";

describe("typeorm.options", () => {
  it("applies environment-specific defaults", () => {
    expect(
      resolveDatabaseConfig({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    ).toMatchObject({
      database: "openchat_dev",
      nodeEnv: "development",
      poolMin: 2,
      poolMax: 10,
    });

    expect(
      resolveDatabaseConfig({ NODE_ENV: "test" } as NodeJS.ProcessEnv),
    ).toMatchObject({
      database: "openchat_test",
      nodeEnv: "test",
      poolMin: 1,
      poolMax: 5,
    });

    expect(
      resolveDatabaseConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toMatchObject({
      database: "openchat",
      nodeEnv: "production",
      poolMin: 5,
      poolMax: 20,
    });
  });

  it("builds typeorm options from env overrides", () => {
    const options = createTypeOrmDataSourceOptions({
      NODE_ENV: "production",
      DB_HOST: "db.internal",
      DB_PORT: "15432",
      DB_USERNAME: "svc_openchat",
      DB_PASSWORD: "secret",
      DB_NAME: "openchat_prod",
      DB_POOL_MIN: "8",
      DB_POOL_MAX: "32",
      DB_CONNECTION_TIMEOUT: "25000",
      DB_IDLE_TIMEOUT: "120000",
      DB_ACQUIRE_TIMEOUT: "45000",
      DB_SSL: "true",
      DB_SSL_REJECT_UNAUTHORIZED: "false",
      DB_LOGGING: "true",
      DB_SYNCHRONIZE: "false",
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      type: "postgres",
      host: "db.internal",
      port: 15432,
      username: "svc_openchat",
      password: "secret",
      database: "openchat_prod",
      logging: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        min: 8,
        max: 32,
        connectionTimeoutMillis: 25000,
        idleTimeoutMillis: 120000,
        acquireTimeoutMillis: 45000,
      },
    });
  });

  it("uses the shared entity registry for runtime and CLI paths", () => {
    const options = createTypeOrmDataSourceOptions({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);

    expect(options.entities).toHaveLength(TYPEORM_ENTITIES.length);
    expect(options.entities).toContain(RTCCallSession);
    expect(options.entities).toContain(RTCCallParticipant);
    expect(options.entities).toContain(AgentMemory);
  });

  it("uses fail-fast retry settings for test environment module options", () => {
    const options = createTypeOrmModuleOptions({
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv);

    expect(options).toMatchObject({
      retryAttempts: 1,
      retryDelay: 0,
    });
  });
});
