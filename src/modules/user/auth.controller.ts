import { Controller, Post, Get, Put, Body, Query, Request, UseGuards, HttpCode, HttpStatus, Param, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, type DeviceSessionSummaryResult } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserSyncService } from './user-sync.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedRequest } from '../../common/auth/interfaces/authenticated-request.interface';
import { AllowAnonymous } from '../../common/auth/guards/multi-auth.guard';
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
  @AllowAnonymous()
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
  async logout(@Request() req: AuthenticatedRequest, @Body() logoutDto?: LogoutDto): Promise<{ success: boolean }> {
    const accessToken = logoutDto?.token || req.headers.authorization?.replace('Bearer ', '');
    const refreshToken = logoutDto?.refreshToken;
    await this.authService.logout(req.auth.userId, accessToken, refreshToken);
    return { success: true };
  }

  @Post('logout/device')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '当前设备登出并清理设备游标' })
  @ApiResponse({ status: 200, description: '设备登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async logoutCurrentDevice(
    @Request() req: AuthenticatedRequest,
    @Body() logoutDto?: LogoutDto,
  ): Promise<{ success: boolean; deviceId: string; revokedTokens: number; clearedCursors: number }> {
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, logoutDto?.deviceId);
    if (!effectiveDeviceId) {
      throw new ForbiddenException('deviceId must be bound to authenticated token');
    }

    const accessToken = logoutDto?.token || req.headers.authorization?.replace('Bearer ', '');
    const result = await this.authService.logoutDevice(
      req.auth.userId,
      effectiveDeviceId,
      accessToken,
      logoutDto?.refreshToken,
    );

    return {
      success: true,
      deviceId: result.deviceId,
      revokedTokens: result.revokedTokens,
      clearedCursors: result.clearedCursors,
    };
  }

  @Post('refresh')
  @AllowAnonymous()
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
  async getCurrentUser(@Request() req: AuthenticatedRequest): Promise<any> {
    const user = await this.authService.getUserById(req.auth.userId);
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
    @Request() req: AuthenticatedRequest,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ success: boolean }> {
    const success = await this.authService.updatePassword(
      req.auth.userId,
      updatePasswordDto.oldPassword,
      updatePasswordDto.newPassword,
    );
    return { success };
  }

  @Post('forgot-password')
  @AllowAnonymous()
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
  @AllowAnonymous()
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
  @AllowAnonymous()
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
  @AllowAnonymous()
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

  @Get('devices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户设备会话列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDeviceSessions(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit: number = 100,
  ): Promise<DeviceSessionSummaryResult> {
    return this.authService.listDeviceSessions(req.auth.userId, req.auth.deviceId, limit);
  }

  @Post('logout/device/:deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '指定设备登出并清理设备游标' })
  @ApiResponse({ status: 200, description: '设备登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async logoutDeviceById(
    @Request() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean; deviceId: string; revokedTokens: number; clearedCursors: number }> {
    const result = await this.authService.logoutDevice(req.auth.userId, deviceId);
    return {
      success: true,
      deviceId: result.deviceId,
      revokedTokens: result.revokedTokens,
      clearedCursors: result.clearedCursors,
    };
  }

  @Post('logout/others')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '登出其它设备（保留当前设备）' })
  @ApiResponse({ status: 200, description: '其它设备登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async logoutOtherDevices(
    @Request() req: AuthenticatedRequest,
    @Body() logoutDto?: LogoutDto,
  ): Promise<{ success: boolean; currentDeviceId: string; revokedTokens: number; clearedCursors: number }> {
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, logoutDto?.deviceId);
    if (!effectiveDeviceId) {
      throw new ForbiddenException('deviceId must be bound to authenticated token');
    }

    const result = await this.authService.logoutOtherDevices(req.auth.userId, effectiveDeviceId);
    return {
      success: true,
      currentDeviceId: result.currentDeviceId,
      revokedTokens: result.revokedTokens,
      clearedCursors: result.clearedCursors,
    };
  }

  private resolveEffectiveDeviceId(
    authenticatedDeviceId?: string,
    requestedDeviceId?: string,
  ): string | undefined {
    const trusted = this.normalizeDeviceIdCandidate(authenticatedDeviceId);
    const requested = this.normalizeDeviceIdCandidate(requestedDeviceId);

    if (requested && !trusted) {
      throw new ForbiddenException('deviceId must be bound to authenticated token');
    }

    if (trusted && requested && trusted !== requested) {
      throw new ForbiddenException('deviceId does not match authenticated device');
    }

    return trusted;
  }

  private normalizeDeviceIdCandidate(candidate?: string): string | undefined {
    if (!candidate) {
      return undefined;
    }
    const normalized = candidate.trim();
    if (!normalized) {
      return undefined;
    }
    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
    }
    return normalized;
  }
}
