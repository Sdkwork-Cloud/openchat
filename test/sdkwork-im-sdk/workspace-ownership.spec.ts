import { existsSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk workspace ownership markers', () => {
  const root = path.join(process.cwd(), 'sdkwork-im-sdk');

  test('typescript workspace declares generated and manual boundaries', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'generated', 'server-openapi', '.sdkwork-generated')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'adapter-wukongim', '.manual-owned')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-typescript', 'composed', '.manual-owned')),
    ).toBe(true);
  });

  test('flutter workspace declares generated and manual boundaries', () => {
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'generated', 'server-openapi', '.sdkwork-generated')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'adapter-wukongim', '.manual-owned')),
    ).toBe(true);
    expect(
      existsSync(path.join(root, 'sdkwork-im-sdk-flutter', 'composed', '.manual-owned')),
    ).toBe(true);
  });
});
