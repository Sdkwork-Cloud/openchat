import { Controller, Post, Get, Put, Body, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserSyncService } from './user-sync.service';
import {
  RegisterDto,
  LoginDto,
  UpdatePasswordDto,
  AuthResponseDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userSyncService: UserSyncService,
  ) {}

  /**
   * 用户注册
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async register(@Body() registerData: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerData);
    return {
      user: result.user,
      token: result.token,
    };
  }

  /**
   * 用户登录
   * 返回JWT Token和IM连接配置
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() loginData: LoginDto): Promise<AuthResponseDto> {
    // 1. 验证用户名密码，获取JWT Token
    const result = await this.authService.login(loginData);

    // 2. 获取IM连接配置
    const imConnection = await this.userSyncService.prepareUserConnection(result.user.id);

    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      imConfig: imConnection.enabled && imConnection.config ? {
        wsUrl: imConnection.config.wsUrl,
        uid: imConnection.config.uid,
        token: imConnection.config.token,
      } : undefined,
    };
  }

  /**
   * 获取当前用户信息
   */
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getCurrentUser(@Request() req: { user: { userId: string } }): Promise<any> {
    const user = await this.authService.getUserById(req.user.userId);
    if (!user) {
      return null;
    }
    // 移除密码字段后返回
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 更新用户密码
   */
  @Put('password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新用户密码' })
  @ApiResponse({ status: 200, description: '密码更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或旧密码错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async updatePassword(
    @Request() req: { user: { userId: string } },
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ success: boolean }> {
    const success = await this.authService.updatePassword(
      req.user.userId,
      updatePasswordDto.oldPassword,
      updatePasswordDto.newPassword,
    );
    return { success };
  }
}
