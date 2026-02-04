import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './user.interface';
import { User as UserEntity } from './user.entity';
import { LocalUserManagerService } from './local-user-manager.service';
import { UserSyncService } from './user-sync.service';
import { VerificationCodeService } from './verification-code.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, SendVerificationCodeDto, VerifyVerificationCodeDto, PhoneRegisterDto, EmailRegisterDto } from './dto/auth.dto';

// 认证响应类型
export class AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
  expiresIn?: number;

  constructor(user: Omit<User, 'password'>, token: string, refreshToken?: string, expiresIn?: number) {
    this.user = user;
    this.token = token;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
  }
}

/**
 * 认证服务
 * 处理用户注册、登录、密码管理等认证相关功能
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private localUserManager: LocalUserManagerService,
    private jwtService: JwtService,
    private userSyncService: UserSyncService,
    private configService: ConfigService,
    private verificationCodeService: VerificationCodeService,
  ) {
    // 从配置中读取 JWT 配置，确保有默认值
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret-key-change-in-production';
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    this.refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    // 生产环境检查
    if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'default-secret-key-change-in-production') {
      this.logger.warn('WARNING: Using default JWT secret in production! Please set JWT_SECRET environment variable.');
    }
  }

  /**
   * 用户注册
   */
  async register(registerData: RegisterDto): Promise<AuthResponse> {
    // 检查用户名是否已存在
    const existingUser = await this.localUserManager.getUserByUsername(registerData.username);

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmailUser = await this.localUserManager.getUserRepository().findOne({
      where: { email: registerData.email, isDeleted: false },
    });

    if (existingEmailUser) {
      throw new ConflictException('邮箱已存在');
    }

    // 检查手机号是否已存在
    const existingPhoneUser = await this.localUserManager.getUserRepository().findOne({
      where: { phone: registerData.phone, isDeleted: false },
    });

    if (existingPhoneUser) {
      throw new ConflictException('手机号已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    // 创建新用户
    const user = await this.localUserManager.createUser({
      username: registerData.username,
      email: registerData.email,
      phone: registerData.phone,
      password: hashedPassword,
      nickname: registerData.nickname,
      status: 'offline',
      isDeleted: false,
    });

    // 同步用户到IM系统（异步执行，不阻塞注册流程）
    this.userSyncService.syncUserOnRegister(user).catch(error => {
      this.logger.error('Failed to sync user to IM on register:', error);
    });

    // 生成JWT令牌
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // 移除密码字段后返回
    const { password, ...userWithoutPassword } = user as User;

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      token,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
    };
  }

  /**
   * 用户登录
   */
  async login(loginData: LoginDto): Promise<AuthResponse> {
    // 查找用户（包含密码字段）
    const user = await this.localUserManager.getUserByUsernameWithPassword(loginData.username);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成JWT令牌
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // 同步用户登录到IM系统（异步执行，不阻塞登录流程）
    this.userSyncService.syncUserOnLogin(user.id).catch(error => {
      this.logger.error('Failed to sync user login to IM:', error);
    });

    // 移除密码字段后返回
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      token,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtSecret,
      });

      const userId = payload.sub;

      // 验证用户是否存在
      const user = await this.localUserManager.getUserById(userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成新的访问令牌
      const newToken = this.generateToken(userId);

      return {
        token: newToken,
        expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
      };
    } catch (error) {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  /**
   * 生成JWT访问令牌
   */
  private generateToken(userId: string): string {
    const payload = { sub: userId, type: 'access' };
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn,
    });
  }

  /**
   * 生成JWT刷新令牌
   */
  private generateRefreshToken(userId: string): string {
    const payload = { sub: userId, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  /**
   * 解析过期时间为秒数
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // 默认1小时

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 3600;
    }
  }

  /**
   * 验证JWT令牌
   */
  async validateToken(token: string): Promise<string | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.jwtSecret,
      });
      return payload.sub;
    } catch {
      return null;
    }
  }

  /**
   * 根据用户ID获取用户信息
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.localUserManager.getUserById(userId);
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // 获取用户（包含密码）
    const user = await this.localUserManager.getUserByIdWithPassword(userId);

    if (!user) {
      return false;
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return false;
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    const updatedUser = await this.localUserManager.updateUser(userId, {
      password: hashedPassword,
    });

    return !!updatedUser;
  }

  /**
   * 重置用户密码（管理员功能）
   */
  async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    const updatedUser = await this.localUserManager.updateUser(userId, {
      password: hashedPassword,
    });

    return !!updatedUser;
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('密码长度不能少于8个字符');
    }

    if (password.length > 100) {
      errors.push('密码长度不能超过100个字符');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }

    if (!/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符(@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(sendCodeData: SendVerificationCodeDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const { email, phone, type } = sendCodeData;

    try {
      await this.verificationCodeService.sendAndStoreCode(email, phone, type);
      return {
        success: true,
        message: '验证码已发送，请查收',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发送验证码失败',
      };
    }
  }

  /**
   * 验证验证码
   */
  async verifyVerificationCode(verifyCodeData: VerifyVerificationCodeDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const { email, phone, code, type } = verifyCodeData;

    try {
      await this.verificationCodeService.verifyCodeByTarget(email, phone, code, type);
      return {
        success: true,
        message: '验证码验证成功',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '验证码验证失败',
      };
    }
  }

  /**
   * 手机注册
   */
  async phoneRegister(registerData: PhoneRegisterDto): Promise<AuthResponse> {
    const { phone, code, username, password, nickname } = registerData;

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 验证验证码
    await this.verificationCodeService.verifyCodeByTarget(undefined, phone, code, 'register');

    // 检查用户名是否已存在
    const existingUser = await this.localUserManager.getUserByUsername(username);
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查手机号是否已存在
    const existingPhoneUser = await this.localUserManager.getUserRepository().findOne({
      where: { phone, isDeleted: false },
    });
    if (existingPhoneUser) {
      throw new ConflictException('手机号已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await this.localUserManager.createUser({
      username,
      email: '', // 邮箱为空
      phone,
      password: hashedPassword,
      nickname,
      status: 'offline',
      isDeleted: false,
    });

    // 同步用户到IM系统（异步执行，不阻塞注册流程）
    this.userSyncService.syncUserOnRegister(user).catch(error => {
      this.logger.error('Failed to sync user to IM on register:', error);
    });

    // 生成JWT令牌
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // 移除密码字段后返回
    const { password: _, ...userWithoutPassword } = user as User;

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      token,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
    };
  }

  /**
   * 邮箱注册
   */
  async emailRegister(registerData: EmailRegisterDto): Promise<AuthResponse> {
    const { email, code, username, password, nickname } = registerData;

    // 验证邮箱格式
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }

    // 验证验证码
    await this.verificationCodeService.verifyCodeByTarget(email, undefined, code, 'register');

    // 检查用户名是否已存在
    const existingUser = await this.localUserManager.getUserByUsername(username);
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmailUser = await this.localUserManager.getUserRepository().findOne({
      where: { email, isDeleted: false },
    });
    if (existingEmailUser) {
      throw new ConflictException('邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await this.localUserManager.createUser({
      username,
      email,
      phone: '', // 手机号为空
      password: hashedPassword,
      nickname,
      status: 'offline',
      isDeleted: false,
    });

    // 同步用户到IM系统（异步执行，不阻塞注册流程）
    this.userSyncService.syncUserOnRegister(user).catch(error => {
      this.logger.error('Failed to sync user to IM on register:', error);
    });

    // 生成JWT令牌
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    // 移除密码字段后返回
    const { password: _, ...userWithoutPassword } = user as User;

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      token,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
    };
  }

  /**
   * 忘记密码
   * 支持通过邮箱或手机号找回
   */
  async forgotPassword(forgotPasswordData: ForgotPasswordDto): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const { email, phone } = forgotPasswordData;

    // 验证输入
    if (!email && !phone) {
      return {
        success: false,
        error: '邮箱或手机号不能为空',
      };
    }

    // 查找用户
    let user: UserEntity | null = null;
    if (email) {
      user = await this.localUserManager.getUserRepository().findOne({
        where: { email, isDeleted: false },
      });
    } else if (phone) {
      user = await this.localUserManager.getUserRepository().findOne({
        where: { phone, isDeleted: false },
      });
    }

    if (!user) {
      return {
        success: false,
        error: '用户不存在',
      };
    }

    // 生成密码重置令牌
    const resetToken = this.generateToken(user.id);

    // 这里应该发送邮件或短信，包含重置链接
    // 由于是演示，暂时只返回成功消息
    let message = '';
    if (email) {
      message = '密码重置链接已发送到您的邮箱';
    } else if (phone) {
      message = '密码重置验证码已发送到您的手机';
    }

    return {
      success: true,
      message,
    };
  }
}
