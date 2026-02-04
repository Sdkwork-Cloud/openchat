import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 发送验证码 DTO
 */
export class SendVerificationCodeDto {
  @ApiProperty({
    description: '邮箱（可选，与手机号二选一）',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '邮箱必须是字符串' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: '邮箱格式不正确',
  })
  email?: string;

  @ApiProperty({
    description: '手机号（可选，与邮箱二选一）',
    example: '13800138000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  phone?: string;

  @ApiProperty({
    description: '验证码类型',
    example: 'register',
    enum: ['register', 'forgot-password'],
  })
  @IsString({ message: '验证码类型必须是字符串' })
  @IsNotEmpty({ message: '验证码类型不能为空' })
  type: 'register' | 'forgot-password';
}

/**
 * 验证验证码 DTO
 */
export class VerifyVerificationCodeDto {
  @ApiProperty({
    description: '邮箱（可选，与手机号二选一）',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '邮箱必须是字符串' })
  email?: string;

  @ApiProperty({
    description: '手机号（可选，与邮箱二选一）',
    example: '13800138000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  phone?: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Matches(/^\d{6}$/, {
    message: '验证码格式不正确，应为6位数字',
  })
  code: string;

  @ApiProperty({
    description: '验证码类型',
    example: 'register',
    enum: ['register', 'forgot-password'],
  })
  @IsString({ message: '验证码类型必须是字符串' })
  @IsNotEmpty({ message: '验证码类型不能为空' })
  type: 'register' | 'forgot-password';
}

/**
 * 手机注册 DTO
 */
export class PhoneRegisterDto {
  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @IsString({ message: '手机号必须是字符串' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  phone: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Matches(/^\d{6}$/, {
    message: '验证码格式不正确，应为6位数字',
  })
  code: string;

  @ApiProperty({
    description: '用户名',
    minLength: 3,
    maxLength: 50,
    example: 'john_doe',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(50, { message: '用户名长度不能超过50个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和横线',
  })
  username: string;

  @ApiProperty({
    description: '密码',
    minLength: 6,
    maxLength: 100,
    example: '123456',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @MaxLength(100, { message: '密码长度不能超过100个字符' })
  password: string;

  @ApiProperty({
    description: '昵称',
    minLength: 1,
    maxLength: 100,
    example: 'John Doe',
  })
  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MinLength(1, { message: '昵称长度不能少于1个字符' })
  @MaxLength(100, { message: '昵称长度不能超过100个字符' })
  nickname: string;
}

/**
 * 邮箱注册 DTO
 */
export class EmailRegisterDto {
  @ApiProperty({
    description: '邮箱',
    example: 'john.doe@example.com',
  })
  @IsString({ message: '邮箱必须是字符串' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: '邮箱格式不正确',
  })
  email: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Matches(/^\d{6}$/, {
    message: '验证码格式不正确，应为6位数字',
  })
  code: string;

  @ApiProperty({
    description: '用户名',
    minLength: 3,
    maxLength: 50,
    example: 'john_doe',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(50, { message: '用户名长度不能超过50个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和横线',
  })
  username: string;

  @ApiProperty({
    description: '密码',
    minLength: 6,
    maxLength: 100,
    example: '123456',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @MaxLength(100, { message: '密码长度不能超过100个字符' })
  password: string;

  @ApiProperty({
    description: '昵称',
    minLength: 1,
    maxLength: 100,
    example: 'John Doe',
  })
  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MinLength(1, { message: '昵称长度不能少于1个字符' })
  @MaxLength(100, { message: '昵称长度不能超过100个字符' })
  nickname: string;
}

/**
 * 用户注册 DTO（兼容旧版）
 */
export class RegisterDto {
  @ApiProperty({
    description: '用户名',
    minLength: 3,
    maxLength: 50,
    example: 'john_doe',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(50, { message: '用户名长度不能超过50个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和横线',
  })
  username: string;

  @ApiProperty({
    description: '邮箱',
    example: 'john.doe@example.com',
  })
  @IsString({ message: '邮箱必须是字符串' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: '邮箱格式不正确',
  })
  email: string;

  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @IsString({ message: '手机号必须是字符串' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  phone: string;

  @ApiProperty({
    description: '密码',
    minLength: 6,
    maxLength: 100,
    example: '123456',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6个字符' })
  @MaxLength(100, { message: '密码长度不能超过100个字符' })
  password: string;

  @ApiProperty({
    description: '昵称',
    minLength: 1,
    maxLength: 100,
    example: 'John Doe',
  })
  @IsString({ message: '昵称必须是字符串' })
  @IsNotEmpty({ message: '昵称不能为空' })
  @MinLength(1, { message: '昵称长度不能少于1个字符' })
  @MaxLength(100, { message: '昵称长度不能超过100个字符' })
  nickname: string;
}

/**
 * 用户登录 DTO
 */
export class LoginDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({
    description: '密码',
    example: 'MyP@ssw0rd!',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

/**
 * 更新密码 DTO
 */
export class UpdatePasswordDto {
  @ApiProperty({
    description: '旧密码',
    example: 'OldP@ssw0rd!',
  })
  @IsString({ message: '旧密码必须是字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword: string;

  @ApiProperty({
    description: '新密码',
    minLength: 6,
    maxLength: 100,
    example: '123456',
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '新密码长度不能少于6个字符' })
  @MaxLength(100, { message: '新密码长度不能超过100个字符' })
  newPassword: string;
}

/**
 * 刷新 Token DTO
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  refreshToken: string;
}

/**
 * IM连接配置
 */
export class IMConfigDto {
  @ApiProperty({
    description: 'IM服务器WebSocket地址',
    example: 'ws://localhost:5200',
  })
  wsUrl: string;

  @ApiProperty({
    description: '用户ID',
    example: 'user-123',
  })
  uid: string;

  @ApiProperty({
    description: 'IM认证Token',
    example: 'im-token-xxx',
  })
  token: string;
}

/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
  @ApiProperty({
    description: '用户信息',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'john_doe',
      email: 'john.doe@example.com',
      phone: '13800138000',
      nickname: 'John Doe',
      status: 'online',
    },
  })
  user: {
    id: string;
    username: string;
    email: string;
    phone: string;
    nickname: string;
    avatar?: string;
    status?: string;
  };

  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({
    description: '令牌过期时间（秒）',
    example: 3600,
    required: false,
  })
  @IsOptional()
  expiresIn?: number;

  @ApiProperty({
    description: 'IM连接配置（用于SDK连接）',
    required: false,
  })
  @IsOptional()
  imConfig?: IMConfigDto;
}

/**
 * 登出 DTO
 */
export class LogoutDto {
  @ApiProperty({
    description: '访问令牌（可选，用于单设备登出）',
    required: false,
  })
  @IsOptional()
  @IsString()
  token?: string;
}

/**
 * 忘记密码请求 DTO
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: '邮箱（可选，与手机号二选一）',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '邮箱必须是字符串' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: '邮箱格式不正确',
  })
  email?: string;

  @ApiProperty({
    description: '手机号（可选，与邮箱二选一）',
    example: '13800138000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  phone?: string;
}

/**
 * 忘记密码响应 DTO
 */
export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: '操作是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '响应消息',
    example: '密码重置链接已发送到您的邮箱',
    required: false,
  })
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: '错误信息',
    example: '用户不存在',
    required: false,
  })
  @IsOptional()
  error?: string;
}
