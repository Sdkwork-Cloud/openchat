import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

const languages = [
  'typescript',
  'flutter',
  'python',
  'go',
  'java',
  'kotlin',
  'swift',
  'csharp',
];

const codeExtensions = new Set(['.ts', '.js', '.dart', '.py', '.go', '.java', '.kt', '.swift', '.cs']);
const appPrefixPattern = /(^|[^.])['"`]\/im\/v3(?:\/|['"`])/m;
const legacyPrefixPattern = /(^|[^.])['"`]\/api(?:\/|['"`])/m;
const ignoredDirectories = new Set(['node_modules', '.dart_tool', 'build']);

function collectCodeFiles(root: string): string[] {
  const entries = readdirSync(root)
    .map((name) => path.join(root, name))
    .sort();
  const files: string[] = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(path.basename(entry))) {
      continue;
    }
    const stats = statSync(entry);
    if (stats.isDirectory()) {
      files.push(...collectCodeFiles(entry));
      continue;
    }

    if (codeExtensions.has(path.extname(entry))) {
      files.push(entry);
    }
  }

  return files;
}

describe('sdkwork-im-sdk generated API prefixes', () => {
  test('generated SDK outputs are app-surface only', () => {
    const workspaceRoot = path.join(process.cwd(), 'sdkwork-im-sdk');

    for (const language of languages) {
      const generatedRoot = path.join(
        workspaceRoot,
        `sdkwork-im-sdk-${language}`,
        'generated',
        'server-openapi',
      );
      const files = collectCodeFiles(generatedRoot);
      const aggregate = files.map((filePath) => readFileSync(filePath, 'utf8')).join('\n');

      expect(files.length).toBeGreaterThan(0);
      expect(aggregate).toMatch(appPrefixPattern);
      expect(aggregate).not.toMatch(legacyPrefixPattern);
      expect(aggregate).not.toContain('/admin/im/v3');
    }
  });
});
