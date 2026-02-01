import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 用户注册 DTO
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
    description: '密码',
    minLength: 8,
    maxLength: 100,
    example: 'MyP@ssw0rd!',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  @MaxLength(100, { message: '密码长度不能超过100个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符(@$!%*?&)',
  })
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
    minLength: 8,
    maxLength: 100,
    example: 'NewP@ssw0rd!',
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '新密码长度不能少于8个字符' })
  @MaxLength(100, { message: '新密码长度不能超过100个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: '新密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符(@$!%*?&)',
  })
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
      nickname: 'John Doe',
      status: 'online',
    },
  })
  user: {
    id: string;
    username: string;
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
