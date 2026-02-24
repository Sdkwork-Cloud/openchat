import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { VerificationCodeType, VERIFICATION_CODE_CONFIG } from '../../common/constants';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);

  constructor(
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

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
      if (target.includes('@')) {
        this.logger.log(`发送邮箱验证码 ${code} 到 ${target}，类型: ${type}`);
      } else {
        this.logger.log(`发送短信验证码 ${code} 到 ${target}，类型: ${type}`);
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
    email: string | undefined,
    phone: string | undefined,
    type: VerificationCodeType,
  ): Promise<{ code: string; target: string }> {
    const target = email || phone;
    if (!target) {
      throw new BadRequestException('请提供邮箱或手机号');
    }

    const code = this.generateCode();
    await this.storeCode(target, code, type);
    await this.sendCode(target, code, type);

    return { code, target };
  }

  /**
   * 根据目标验证验证码
   * @param email 邮箱
   * @param phone 手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async verifyCodeByTarget(
    email: string | undefined,
    phone: string | undefined,
    code: string,
    type: VerificationCodeType,
  ): Promise<boolean> {
    const target = email || phone;
    if (!target) {
      throw new BadRequestException('请提供邮箱或手机号');
    }

    return this.verifyCode(target, code, type);
  }

  /**
   * 检查发送频率限制
   * @param target 目标
   * @param type 类型
   */
  async checkRateLimit(target: string, type: VerificationCodeType): Promise<boolean> {
    const key = `verification:rate:${type}:${target}`;
    const count = await this.redis.get(key);

    if (count && parseInt(count, 10) >= 5) {
      throw new BadRequestException('发送频率过高，请稍后再试');
    }

    const ttl = await this.redis.ttl(key);
    if (ttl < 0) {
      await this.redis.set(key, '1', 'EX', VERIFICATION_CODE_CONFIG.SEND_INTERVAL_SECONDS);
    } else {
      await this.redis.incr(key);
    }

    return true;
  }
}
