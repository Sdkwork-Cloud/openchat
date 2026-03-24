import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

type OperationInfo = {
  name: string;
  returnType: string;
};

function normalizeModuleName(fileName: string): string {
  return fileName.replace(/\.(ts|dart)$/, '').replace(/[-_]/g, '');
}

function listTypeScriptOperations(filePath: string): OperationInfo[] {
  const source = readFileSync(filePath, 'utf8');
  return [...source.matchAll(/async\s+([A-Za-z0-9_]+)\s*\([^)]*\):\s*Promise<([^>]+)>/g)].map(
    (match) => ({
      name: match[1]!,
      returnType: match[2]!.trim(),
    }),
  );
}

function listFlutterOperations(filePath: string): OperationInfo[] {
  const source = readFileSync(filePath, 'utf8');
  return [...source.matchAll(/Future<([^>]+)>\s+([A-Za-z0-9_]+)\s*\(/g)].map(
    (match) => ({
      name: match[2]!,
      returnType: match[1]!.trim(),
    }),
  );
}

function rawReturnSet(operations: OperationInfo[], rawType: string): string[] {
  return operations
    .filter((operation) => operation.returnType === rawType)
    .map((operation) => operation.name)
    .sort();
}

describe('sdkwork-im-sdk generated TypeScript/Flutter parity', () => {
  const repoRoot = process.cwd();
  const typescriptApiRoot = path.join(
    repoRoot,
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-typescript',
    'generated',
    'server-openapi',
    'src',
    'api',
  );
  const flutterApiRoot = path.join(
    repoRoot,
    'sdkwork-im-sdk',
    'sdkwork-im-sdk-flutter',
    'generated',
    'server-openapi',
    'lib',
    'src',
    'api',
  );

  test('normalized generated API modules expose the same operation names and raw-response semantics', () => {
    const typescriptFiles = readdirSync(typescriptApiRoot)
      .filter((entry) => entry.endsWith('.ts') && !['index.ts', 'base.ts', 'paths.ts'].includes(entry))
      .sort();
    const flutterFiles = readdirSync(flutterApiRoot)
      .filter((entry) => entry.endsWith('.dart') && !['api.dart', 'paths.dart'].includes(entry))
      .sort();

    const typescriptMap = new Map(
      typescriptFiles.map((entry) => [normalizeModuleName(entry), entry]),
    );
    const flutterMap = new Map(
      flutterFiles.map((entry) => [normalizeModuleName(entry), entry]),
    );

    expect([...typescriptMap.keys()].sort()).toEqual([...flutterMap.keys()].sort());

    for (const moduleName of [...typescriptMap.keys()].sort()) {
      const typescriptFile = typescriptMap.get(moduleName)!;
      const flutterFile = flutterMap.get(moduleName)!;
      const typescriptOperations = listTypeScriptOperations(
        path.join(typescriptApiRoot, typescriptFile),
      );
      const flutterOperations = listFlutterOperations(
        path.join(flutterApiRoot, flutterFile),
      );

      expect(typescriptOperations.map((entry) => entry.name).sort()).toEqual(
        flutterOperations.map((entry) => entry.name).sort(),
      );

      expect(rawReturnSet(typescriptOperations, 'unknown')).toEqual(
        rawReturnSet(flutterOperations, 'dynamic'),
      );
    }
  });
});
