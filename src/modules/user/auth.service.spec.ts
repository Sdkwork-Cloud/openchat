import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocalUserManagerService } from './local-user-manager.service';
import { UserSyncService } from './user-sync.service';
import { VerificationCodeService } from './verification-code.service';
import { UnauthorizedException } from '@nestjs/common';
import { TokenBlacklistService } from '../../common/auth/token-blacklist.service';
import { PermissionService } from '../../common/services/permission.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConversationService } from '../conversation/conversation.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockLocalUserManager = {
    getUserByUsernameWithPassword: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    getUserRepository: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
        JWT_EXPIRES_IN: '7d',
        JWT_REFRESH_EXPIRES_IN: '30d',
      };
      return config[key];
    }),
  };

  const mockUserSyncService = {
    syncUserToIM: jest.fn().mockResolvedValue(undefined),
    syncUserOnLogin: jest.fn().mockResolvedValue(undefined),
  };

  const mockVerificationCodeService = {
    generateCode: jest.fn(),
    verifyCode: jest.fn(),
    verifyCodeByTarget: jest.fn().mockResolvedValue(true),
  };

  const mockTokenBlacklistService = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    addToBlacklist: jest.fn().mockResolvedValue(undefined),
    blacklistAllUserTokens: jest.fn().mockResolvedValue(undefined),
    blacklistUserTokensByDevice: jest.fn().mockResolvedValue([]),
    getUserDeviceTokenStats: jest.fn().mockResolvedValue([]),
    blacklistUserTokensExceptDevice: jest.fn().mockResolvedValue([]),
    registerIssuedToken: jest.fn().mockResolvedValue(undefined),
  };

  const mockPermissionService = {
    getUserRoles: jest.fn().mockResolvedValue([]),
    getUserPermissions: jest.fn().mockResolvedValue([]),
  };

  const mockRedisService = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockConversationService = {
    deleteDeviceReadCursorsForUser: jest.fn().mockResolvedValue(0),
    deleteDeviceReadCursorsForUserExcept: jest.fn().mockResolvedValue(0),
    getDeviceReadCursorSummariesForUser: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: LocalUserManagerService,
          useValue: mockLocalUserManager,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UserSyncService,
          useValue: mockUserSyncService,
        },
        {
          provide: VerificationCodeService,
          useValue: mockVerificationCodeService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockLocalUserManager.getUserByUsernameWithPassword.mockResolvedValue({
        id: 'user-1',
        username: 'existing-user',
        // hash for OpenChat@123
        password: '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK',
      });

      await expect(
        service.login({
          username: 'existing-user',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include deviceId claim in access and refresh tokens when provided at login', async () => {
      mockLocalUserManager.getUserByUsernameWithPassword.mockResolvedValue({
        id: 'user-1',
        username: 'existing-user',
        nickname: 'Existing User',
        // hash for OpenChat@123
        password: '$2b$10$POhQ6iz4.bQpIdSLR/vLvOBivQQllu8g.2HBhUtjzd0p/Lyuea4kK',
      });
      mockJwtService.sign
        .mockReturnValueOnce('access-token-with-device')
        .mockReturnValueOnce('refresh-token-with-device');

      const result = await service.login({
        username: 'existing-user',
        password: 'OpenChat@123',
        deviceId: 'ios-001',
      });

      expect(result.token).toBe('access-token-with-device');
      expect(result.refreshToken).toBe('refresh-token-with-device');
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'ios-001',
        }),
        expect.any(Object),
      );
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'ios-001',
        }),
        expect.any(Object),
      );
    });
  });

  describe('refreshToken', () => {
    it('should reject refresh token when payload missing userId', async () => {
      mockJwtService.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      await expect(service.refreshToken('refresh-token-without-userid'))
        .rejects
        .toBeInstanceOf(UnauthorizedException);

      expect(mockLocalUserManager.getUserById).not.toHaveBeenCalled();
      expect(mockTokenBlacklistService.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should preserve deviceId claim when refreshing token', async () => {
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      mockJwtService.verify.mockReturnValue({
        userId: 'user-1',
        deviceId: 'android-009',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockLocalUserManager.getUserById.mockResolvedValue({
        id: 'user-1',
        username: 'existing-user',
        nickname: 'Existing User',
        password: 'hashed-password',
      });
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'android-009',
        }),
        expect.any(Object),
      );
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'android-009',
        }),
        expect.any(Object),
      );
      expect(mockTokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        'valid-refresh-token',
        'refresh_token_used',
      );
    });
  });

  describe('logout', () => {
    it('should reject logout when access token does not belong to user', async () => {
      mockJwtService.decode.mockReturnValue({ userId: 'user-2' });

      await expect(
        service.logout('user-1', 'foreign-access-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockTokenBlacklistService.addToBlacklist).not.toHaveBeenCalledWith(
        'foreign-access-token',
        'logout',
      );
    });
  });

  describe('logoutDevice', () => {
    it('should revoke device tokens, clear cursors and publish kick event', async () => {
      mockTokenBlacklistService.blacklistUserTokensByDevice.mockResolvedValue([
        'device-token-1',
        'device-token-2',
      ]);
      mockConversationService.deleteDeviceReadCursorsForUser.mockResolvedValue(5);
      mockJwtService.decode = jest.fn()
        .mockReturnValueOnce({ userId: 'user-1', deviceId: 'ios-001' })
        .mockReturnValueOnce({ userId: 'user-1', deviceId: 'ios-001' });

      const result = await service.logoutDevice(
        'user-1',
        'ios-001',
        'access-token',
        'refresh-token',
      );

      expect(result).toEqual({
        deviceId: 'ios-001',
        revokedTokens: 4,
        clearedCursors: 5,
      });
      expect(mockTokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        'access-token',
        'logout_device:ios-001',
      );
      expect(mockTokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        'refresh-token',
        'logout_device:ios-001',
      );
      expect(mockTokenBlacklistService.blacklistUserTokensByDevice).toHaveBeenCalledWith(
        'user-1',
        'ios-001',
        'logout_device:ios-001',
      );
      expect(mockConversationService.deleteDeviceReadCursorsForUser).toHaveBeenCalledWith(
        'user-1',
        'ios-001',
      );
      expect(mockRedisService.publish).toHaveBeenCalledWith(
        'openchat:system',
        expect.objectContaining({
          type: 'kickDevice',
          userId: 'user-1',
          deviceId: 'ios-001',
        }),
      );
    });
  });

  describe('logoutOtherDevices', () => {
    it('should revoke other-device tokens, clear other-device cursors and publish kick event', async () => {
      mockTokenBlacklistService.blacklistUserTokensExceptDevice.mockResolvedValue([
        'other-token-1',
        'other-token-2',
      ]);
      mockConversationService.deleteDeviceReadCursorsForUserExcept.mockResolvedValue(6);

      const result = await service.logoutOtherDevices('user-1', 'ios-001');

      expect(result).toEqual({
        currentDeviceId: 'ios-001',
        revokedTokens: 2,
        clearedCursors: 6,
      });
      expect(mockTokenBlacklistService.blacklistUserTokensExceptDevice).toHaveBeenCalledWith(
        'user-1',
        'ios-001',
        'logout_others:ios-001',
      );
      expect(mockConversationService.deleteDeviceReadCursorsForUserExcept).toHaveBeenCalledWith(
        'user-1',
        'ios-001',
      );
      expect(mockRedisService.publish).toHaveBeenCalledWith(
        'openchat:system',
        expect.objectContaining({
          type: 'kickUserExceptDevice',
          userId: 'user-1',
          keepDeviceId: 'ios-001',
        }),
      );
    });
  });

  describe('listDeviceSessions', () => {
    it('should merge token stats and cursor stats into device sessions', async () => {
      mockTokenBlacklistService.getUserDeviceTokenStats.mockResolvedValue([
        { deviceId: 'ios-001', tokenCount: 2 },
        { deviceId: 'web-001', tokenCount: 1 },
      ]);
      mockConversationService.getDeviceReadCursorSummariesForUser.mockResolvedValue({
        total: 2,
        items: [
          { deviceId: 'ios-001', conversationCount: 8, lastActiveAt: '2026-03-08T10:00:00.000Z' },
          { deviceId: 'android-001', conversationCount: 3, lastActiveAt: '2026-03-08T09:00:00.000Z' },
        ],
      });

      const result = await service.listDeviceSessions('user-1', 'ios-001', 50);

      expect(result.total).toBe(3);
      expect(result.items).toEqual([
        expect.objectContaining({
          deviceId: 'ios-001',
          tokenCount: 2,
          conversationCount: 8,
          isCurrentDevice: true,
        }),
        expect.objectContaining({
          deviceId: 'android-001',
          tokenCount: 0,
          conversationCount: 3,
        }),
        expect.objectContaining({
          deviceId: 'web-001',
          tokenCount: 1,
          conversationCount: 0,
        }),
      ]);
      expect(mockTokenBlacklistService.getUserDeviceTokenStats).toHaveBeenCalledWith('user-1', 50);
      expect(mockConversationService.getDeviceReadCursorSummariesForUser).toHaveBeenCalledWith('user-1', 50);
    });

    it('should fallback to default limit when limit is not a finite number', async () => {
      mockTokenBlacklistService.getUserDeviceTokenStats.mockResolvedValue([]);
      mockConversationService.getDeviceReadCursorSummariesForUser.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await service.listDeviceSessions(
        'user-1',
        'ios-001',
        'bad-limit' as unknown as number,
      );

      expect(mockTokenBlacklistService.getUserDeviceTokenStats).toHaveBeenCalledWith('user-1', 100);
      expect(mockConversationService.getDeviceReadCursorSummariesForUser).toHaveBeenCalledWith('user-1', 100);
      expect(result).toEqual({
        total: 1,
        items: [
          expect.objectContaining({
            deviceId: 'ios-001',
            isCurrentDevice: true,
          }),
        ],
      });
    });
  });
});
