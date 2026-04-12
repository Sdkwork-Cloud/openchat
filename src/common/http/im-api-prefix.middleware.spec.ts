import { normalizeImApiPath } from './im-api-prefix.middleware';

describe('normalizeImApiPath', () => {
  it('rewrites app api paths to the legacy controller paths', () => {
    expect(normalizeImApiPath('/im/v3/auth/register')).toBe('/auth/register');
    expect(normalizeImApiPath('/im/v3/messages')).toBe('/messages');
  });

  it('rewrites admin api paths to the legacy controller paths', () => {
    expect(normalizeImApiPath('/admin/im/v3/users')).toBe('/users');
    expect(normalizeImApiPath('/admin/im/v3/system')).toBe('/system');
  });

  it('keeps swagger and openapi endpoints untouched', () => {
    expect(normalizeImApiPath('/im/v3/docs')).toBe('/im/v3/docs');
    expect(normalizeImApiPath('/im/v3/openapi.json')).toBe('/im/v3/openapi.json');
    expect(normalizeImApiPath('/admin/im/v3/docs')).toBe('/admin/im/v3/docs');
    expect(normalizeImApiPath('/admin/im/v3/openapi.json')).toBe('/admin/im/v3/openapi.json');
  });

  it('leaves non-prefixed routes unchanged', () => {
    expect(normalizeImApiPath('/health')).toBe('/health');
    expect(normalizeImApiPath('/auth/register')).toBe('/auth/register');
  });
});
