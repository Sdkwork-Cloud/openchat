import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthManagerService } from './auth-manager.service';
import { MultiAuthGuard } from './guards/multi-auth.guard';
import { JWTAuthStrategy } from './strategies/jwt.strategy';
import { BotTokenAuthStrategy } from './strategies/bot-token.strategy';
import { APIKeyAuthStrategy } from './strategies/api-key.strategy';
import { BotEntity } from '../../modules/bot-platform/entities/bot.entity';

/**
 * 认证模块
 * 提供多方式认证支持（JWT、Bot Token、API Key）
 * 通过配置灵活选择启用的认证方式
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([BotEntity]),
  ],
  providers: [
    AuthManagerService,
    JWTAuthStrategy,
    BotTokenAuthStrategy,
    APIKeyAuthStrategy,
    {
      provide: APP_GUARD,
      useClass: MultiAuthGuard,
    },
  ],
  exports: [
    AuthManagerService,
    JWTAuthStrategy,
    BotTokenAuthStrategy,
    APIKeyAuthStrategy,
    JwtModule,
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private authManager: AuthManagerService,
    private jwtStrategy: JWTAuthStrategy,
    private botTokenStrategy: BotTokenAuthStrategy,
    private apiKeyStrategy: APIKeyAuthStrategy,
  ) {}

  /**
   * 模块初始化时注册所有认证策略
   */
  onModuleInit() {
    // 注册所有认证策略
    this.authManager.registerStrategy(this.jwtStrategy);
    this.authManager.registerStrategy(this.botTokenStrategy);
    this.authManager.registerStrategy(this.apiKeyStrategy);
  }
}
