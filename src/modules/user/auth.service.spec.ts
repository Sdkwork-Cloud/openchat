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
  };

  const mockPermissionService = {
    getUserRoles: jest.fn().mockResolvedValue([]),
    getUserPermissions: jest.fn().mockResolvedValue([]),
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
  });
});
