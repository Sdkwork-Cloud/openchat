import { Module, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_FILTER, RouterModule } from "@nestjs/core";
import { GatewayModule } from "./gateways/gateway.module";
import { IMProviderModule } from "./modules/im-provider/im-provider.module";
import { ThrottlerModule } from "./common/throttler/throttler.module";
import { QueueModule } from "./common/queue/queue.module";
import { HealthModule } from "./common/health/health.module";
import { AppConfigModule } from "./common/config/config.module";
import { CacheModule } from "./common/cache/cache.module";
import { AuthModule } from "./common/auth/auth.module";
import { MetricsModule } from "./common/metrics/metrics.module";
import { EventBusModule } from "./common/events/event-bus.module";
import { ExtensionsModule } from "./extensions";
import { ImAppApiModule } from "./api/im-app-api.module";
import { ImAdminApiModule } from "./api/im-admin-api.module";
import {
  IM_ADMIN_API_PREFIX,
  IM_APP_API_PREFIX,
} from "./common/http/im-api-surface.constants";
import { RtcWebhookModule } from "./modules/rtc/rtc-webhook.module";
import { WukongIMWebhookModule } from "./modules/wukongim/wukongim-webhook.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { loadOpenChatEnvironment } from "./common/config/env-loader";
import { getEnvFilePaths } from "./common/config/env-file-paths";
import {
  createTypeOrmModuleOptions,
  getDatabaseConfigSummary,
} from "./common/config/typeorm.options";

const logger = new Logger("Database");
loadOpenChatEnvironment();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
    }),

    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const summary = getDatabaseConfigSummary();
        const isProduction = summary.nodeEnv === "production";

        logger.log("");
        logger.log(
          "═══════════════════════════════════════════════════════════",
        );
        logger.log(
          "                    数据库连接配置                            ",
        );
        logger.log(
          "═══════════════════════════════════════════════════════════",
        );
        logger.log(`  主机:     ${summary.host}`);
        logger.log(`  端口:     ${summary.port}`);
        if (!isProduction) {
          logger.log(`  用户:     ${summary.username}`);
        } else {
          logger.log(`  用户:     ***`);
        }
        logger.log(`  数据库:   ${summary.database}`);
        logger.log(
          `  连接池:   最小 ${summary.poolMin} / 最大 ${summary.poolMax}`,
        );
        logger.log(`  SSL:      ${summary.ssl ? "启用" : "关闭"}`);
        logger.log(`  同步:     ${summary.synchronize ? "启用" : "关闭"}`);
        logger.log(`  日志:     ${summary.logging ? "启用" : "关闭"}`);
        logger.log(
          "═══════════════════════════════════════════════════════════",
        );
        logger.log("");

        return createTypeOrmModuleOptions();
      },
    }),

    ThrottlerModule,

    QueueModule.register(),

    HealthModule,

    AppConfigModule,

    AuthModule,

    CacheModule,

    MetricsModule,

    EventBusModule,

    RouterModule.register([
      {
        path: IM_APP_API_PREFIX,
        module: ImAppApiModule,
      },
      {
        path: IM_ADMIN_API_PREFIX,
        module: ImAdminApiModule,
      },
    ]),

    ExtensionsModule.forRoot({
      useDefaultUserCenter: true,
      useRemoteUserCenter: false,
    }),
    GatewayModule,
    ImAppApiModule,
    ImAdminApiModule,
    RtcWebhookModule,
    WukongIMWebhookModule,
    IMProviderModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    logger.log("AppModule 初始化完成");
  }

  onModuleDestroy() {
    logger.log("AppModule 销毁中...");
  }
}
