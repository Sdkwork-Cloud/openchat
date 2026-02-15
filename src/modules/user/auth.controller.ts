import { Controller, Post, Get, Put, Body, Request, UseGuards, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserSyncService } from './user-sync.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  RegisterDto,
  LoginDto,
  UpdatePasswordDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  SendVerificationCodeDto,
  VerifyVerificationCodeDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userSyncService: UserSyncService,
    private redisService: RedisService,
  ) {}

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
    const result = await this.authService.login(loginData);

    const imConnection = await this.userSyncService.prepareUserConnection(result.user.id);

    return {
      user: result.user as any,
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async logout(@Request() req: { user: { userId: string }; headers: { authorization?: string } }, @Body() logoutDto?: LogoutDto): Promise<{ success: boolean }> {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = logoutDto?.refreshToken;
    await this.authService.logout(req.user.userId, accessToken, refreshToken);
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新Token' })
  @ApiResponse({ status: 200, description: '刷新成功', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '刷新令牌无效或已过期' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    return {
      user: result.user as any,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

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
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

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

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '忘记密码' })
  @ApiResponse({
    status: 200,
    description: '密码重置邮件或短信已发送',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return result as ForgotPasswordResponseDto;
  }

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({
    status: 200,
    description: '验证码已发送',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async sendVerificationCode(
    @Body() sendCodeDto: SendVerificationCodeDto,
  ): Promise<ForgotPasswordResponseDto> {
    const result = await this.authService.sendVerificationCode(sendCodeDto);
    return result as ForgotPasswordResponseDto;
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证验证码' })
  @ApiResponse({
    status: 200,
    description: '验证码验证成功',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async verifyVerificationCode(
    @Body() verifyCodeDto: VerifyVerificationCodeDto,
  ): Promise<ForgotPasswordResponseDto> {
    const result = await this.authService.verifyVerificationCode(verifyCodeDto);
    return result as ForgotPasswordResponseDto;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册（支持手机号或邮箱）' })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    return {
      user: result.user as any,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Get('users/:id/online-status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户在线状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserOnlineStatus(@Param('id') id: string) {
    const isOnline = await this.redisService.isUserOnline(id);
    const lastHeartbeat = await this.redisService.get(`heartbeat:${id}`);
    return {
      userId: id,
      isOnline,
      lastActiveAt: lastHeartbeat ? new Date(parseInt(lastHeartbeat)) : null,
    };
  }

  @Post('users/online-status/batch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量获取用户在线状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async batchGetOnlineStatus(@Body('userIds') userIds: string[]) {
    const results = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        isOnline: await this.redisService.isUserOnline(userId),
      })),
    );
    return results;
  }
}
