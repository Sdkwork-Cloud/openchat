import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

/**
 * 用户模块
 * 提供用户管理、认证、同步等功能
 * 采用分目录架构：entities/, services/, controllers/, dto/, guards/
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
