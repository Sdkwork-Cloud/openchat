import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { VerificationCodeType, VERIFICATION_CODE_CONFIG } from '../../common/constants';

@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    // 初始化Redis连接
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB') || 0,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * 生成验证码
   * @returns 6位数字验证码
   */
  generateCode(): string {
    const min = 10 ** (VERIFICATION_CODE_CONFIG.LENGTH - 1);
    const max = 10 ** VERIFICATION_CODE_CONFIG.LENGTH - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * 发送验证码
   * @param target 目标邮箱或手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async sendCode(target: string, code: string, type: VerificationCodeType): Promise<boolean> {
    try {
      // 这里应该根据目标类型选择发送方式
      // 由于是演示，暂时只打印日志
      if (target.includes('@')) {
        this.logger.log(`发送邮箱验证码 ${code} 到 ${target}，类型: ${type}`);
        // 实际项目中应该调用邮件服务发送验证码
      } else {
        this.logger.log(`发送短信验证码 ${code} 到 ${target}，类型: ${type}`);
        // 实际项目中应该调用短信服务发送验证码
      }
      return true;
    } catch (error) {
      this.logger.error('发送验证码失败:', error);
      return false;
    }
  }

  /**
   * 存储验证码到Redis
   * @param target 目标邮箱或手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async storeCode(target: string, code: string, type: VerificationCodeType): Promise<void> {
    const key = `verification:${type}:${target}`;
    await this.redis.set(key, code, 'EX', VERIFICATION_CODE_CONFIG.EXPIRY_SECONDS);
  }

  /**
   * 验证验证码
   * @param target 目标邮箱或手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async verifyCode(target: string, code: string, type: VerificationCodeType): Promise<boolean> {
    const key = `verification:${type}:${target}`;
    const storedCode = await this.redis.get(key);

    if (!storedCode) {
      throw new BadRequestException('验证码已过期或不存在');
    }

    if (storedCode !== code) {
      throw new BadRequestException('验证码错误');
    }

    // 验证成功后删除验证码
    await this.redis.del(key);
    return true;
  }

  /**
   * 发送验证码并存储
   * @param email 邮箱
   * @param phone 手机号
   * @param type 验证码类型
   */
  async sendAndStoreCode(
    email?: string,
    phone?: string,
    type: VerificationCodeType = VerificationCodeType.REGISTER
  ): Promise<boolean> {
    const target = email || phone;
    if (!target) {
      throw new BadRequestException('邮箱或手机号不能为空');
    }

    // 生成验证码
    const code = this.generateCode();

    // 发送验证码
    const sent = await this.sendCode(target, code, type);
    if (!sent) {
      throw new BadRequestException('发送验证码失败');
    }

    // 存储验证码
    await this.storeCode(target, code, type);

    return true;
  }

  /**
   * 验证验证码
   * @param email 邮箱
   * @param phone 手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async verifyCodeByTarget(
    email?: string,
    phone?: string,
    code?: string,
    type: VerificationCodeType = VerificationCodeType.REGISTER
  ): Promise<boolean> {
    const target = email || phone;
    if (!target || !code) {
      throw new BadRequestException('邮箱或手机号和验证码不能为空');
    }

    return await this.verifyCode(target, code, type);
  }
}