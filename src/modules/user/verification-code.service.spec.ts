import { VerificationCodeService } from './verification-code.service';
import { VerificationCodeType } from '../../common/constants';

describe('VerificationCodeService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTestCode = process.env.AUTH_TEST_VERIFICATION_CODE;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalTestCode === undefined) {
      delete process.env.AUTH_TEST_VERIFICATION_CODE;
    } else {
      process.env.AUTH_TEST_VERIFICATION_CODE = originalTestCode;
    }
  });

  it('accepts the configured static verification code in test environment without touching redis', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_TEST_VERIFICATION_CODE = '123456';

    const redis = {
      eval: jest.fn(),
      get: jest.fn(),
      incr: jest.fn(),
      set: jest.fn(),
      ttl: jest.fn(),
    };
    const service = new VerificationCodeService(redis as any);

    await expect(
      service.verifyCodeByTarget(
        'tester@example.com',
        undefined,
        '123456',
        VerificationCodeType.REGISTER,
      ),
    ).resolves.toBe(true);

    expect(redis.eval).not.toHaveBeenCalled();
  });
});
