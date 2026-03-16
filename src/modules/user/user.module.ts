import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserSyncService } from './user-sync.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalUserManagerService } from './local-user-manager.service';
import { VerificationCodeService } from './verification-code.service';
import { JwtPassportStrategy } from './strategies/jwt-passport.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConversationModule } from '../conversation/conversation.module';

/**
 * 用户模块
 * 提供用户管理、认证、同步等功能
 * 采用分目录架构：entities/, services/, controllers/, dto/, guards/
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConversationModule,
  ],
  controllers: [UserController, AuthController],
  providers: [
    UserService,
    UserSyncService,
    AuthService,
    LocalUserManagerService,
    VerificationCodeService,
    JwtPassportStrategy,
    JwtAuthGuard,
  ],
  exports: [UserService, UserSyncService, AuthService, LocalUserManagerService],
})
export class UserModule {}
