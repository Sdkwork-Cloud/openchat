import fs from 'node:fs';
import path from 'node:path';

function packageNameToDirectoryName(source: string) {
  return source.replace('@openchat/', '');
}

export function resolveWorkspacePackageEntry(source: string, packagesRootDir: string) {
  if (!source.startsWith('@openchat/opencat-admin-')) {
    return null;
  }

  const packageDir = path.join(packagesRootDir, packageNameToDirectoryName(source));
  const entry = path.join(packageDir, 'src', 'index.ts');

  return fs.existsSync(entry) ? entry : null;
}

export function remapWorktreeWorkspaceImport(
  _source?: string,
  _importer?: string,
  _packagesRootDir?: string,
) {
  return null;
}
