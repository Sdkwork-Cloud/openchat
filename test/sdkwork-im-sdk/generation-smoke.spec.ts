import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

describe('sdkwork-im-sdk generation smoke', () => {
  const workspaceRoot = path.join(process.cwd(), 'sdkwork-im-sdk');
  const languages = ['typescript', 'flutter', 'python', 'go', 'java', 'kotlin', 'swift', 'csharp'];

  test('generator-owned outputs exist only under generated/server-openapi roots', () => {
    for (const language of languages) {
      const generatedRoot = path.join(
        workspaceRoot,
        `sdkwork-im-sdk-${language}`,
        'generated',
        'server-openapi',
      );

      expect(existsSync(path.join(generatedRoot, '.sdkwork-generated'))).toBe(true);
      expect(readdirSync(generatedRoot).length).toBeGreaterThan(1);
    }
  });
});
