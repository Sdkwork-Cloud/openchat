import { CrawController } from './craw.controller';
import { ALLOW_ANONYMOUS_KEY, REQUIRED_AUTH_STRATEGIES_KEY } from '../../common/auth/guards/multi-auth.guard';

describe('CrawController auth policy metadata', () => {
  it('should require craw-agent auth strategy on controller', () => {
    const requiredStrategies = Reflect.getMetadata(
      REQUIRED_AUTH_STRATEGIES_KEY,
      CrawController,
    );

    expect(requiredStrategies).toEqual(['craw-agent']);
  });

  it('should keep selected public routes anonymous', () => {
    const registerAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.register,
    );
    const getProfileAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.getProfile,
    );
    const getPostsAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.getPosts,
    );

    expect(registerAnonymous).toBe(true);
    expect(getProfileAnonymous).toBe(true);
    expect(getPostsAnonymous).toBe(true);
  });

  it('should keep sensitive routes protected by default', () => {
    const getStatusAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.getStatus,
    );
    const getMeAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.getMe,
    );
    const createPostAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_KEY,
      CrawController.prototype.createPost,
    );

    expect(getStatusAnonymous).toBeUndefined();
    expect(getMeAnonymous).toBeUndefined();
    expect(createPostAnonymous).toBeUndefined();
  });
});
