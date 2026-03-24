import {
  IM_ADMIN_API_DOCS_PATH,
  IM_ADMIN_API_OPENAPI_JSON_PATH,
  IM_ADMIN_API_PREFIX,
  IM_APP_API_DOCS_PATH,
  IM_APP_API_OPENAPI_JSON_PATH,
  IM_APP_API_PREFIX,
} from './im-api-surface.constants';

describe('im-api-surface.constants', () => {
  it('should expose the frontend IM API prefix and docs URLs', () => {
    expect(IM_APP_API_PREFIX).toBe('im/v3');
    expect(IM_APP_API_DOCS_PATH).toBe('/im/v3/docs');
    expect(IM_APP_API_OPENAPI_JSON_PATH).toBe('/im/v3/openapi.json');
  });

  it('should expose the admin IM API prefix and docs URLs', () => {
    expect(IM_ADMIN_API_PREFIX).toBe('admin/im/v3');
    expect(IM_ADMIN_API_DOCS_PATH).toBe('/admin/im/v3/docs');
    expect(IM_ADMIN_API_OPENAPI_JSON_PATH).toBe(
      '/admin/im/v3/openapi.json',
    );
  });
});
