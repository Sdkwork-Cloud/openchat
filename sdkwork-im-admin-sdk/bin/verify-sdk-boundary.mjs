#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`[sdkwork-im-admin-sdk] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    changedPaths: [],
    snapshotRoot: '',
    writeSnapshot: '',
    compareSnapshot: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--changed-path') {
      const value = argv[index + 1] || '';
      if (!value) {
        fail('Missing value for --changed-path');
      }
      parsed.changedPaths.push(value);
      index += 1;
      continue;
    }
    if (current === '--snapshot-root') {
      parsed.snapshotRoot = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (current === '--write-snapshot') {
      parsed.writeSnapshot = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (current === '--compare-snapshot') {
      parsed.compareSnapshot = argv[index + 1] || '';
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${current}`);
  }

  if (parsed.snapshotRoot && parsed.writeSnapshot && parsed.compareSnapshot) {
    fail('Use either --write-snapshot or --compare-snapshot, not both');
  }

  if (parsed.snapshotRoot && !parsed.writeSnapshot && !parsed.compareSnapshot) {
    fail('Snapshot mode requires --write-snapshot or --compare-snapshot');
  }

  return parsed;
}

function normalize(candidate) {
  return candidate.split(path.sep).join('/').replace(/\\/g, '/');
}

function isAllowedPath(candidate) {
  const normalized = normalize(candidate);
  if (!normalized.startsWith('sdkwork-im-admin-sdk/')) {
    return true;
  }

  if (normalized.includes('/composed/')) {
    return false;
  }

  if (/^sdkwork-im-admin-sdk\/sdkwork-im-admin-sdk-[^/]+\/generated\/server-openapi\//.test(normalized)) {
    return true;
  }

  if (normalized.startsWith('sdkwork-im-admin-sdk/openapi/')) {
    return true;
  }

  return false;
}

function collectFilesRecursive(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

function collectManualOwnedRoots(root) {
  const roots = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name === '.manual-owned') {
        roots.push(path.dirname(absolutePath));
      }
    }
  }

  walk(root);
  return roots.sort((left, right) => left.localeCompare(right));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function buildManualBoundarySnapshot(snapshotRoot) {
  const resolvedRoot = path.resolve(snapshotRoot);
  if (!existsSync(resolvedRoot)) {
    fail(`Snapshot root not found: ${resolvedRoot}`);
  }

  const manualRoots = collectManualOwnedRoots(resolvedRoot);
  const files = {};

  for (const manualRoot of manualRoots) {
    for (const filePath of collectFilesRecursive(manualRoot)) {
      if (path.basename(filePath) === '.manual-owned') {
        continue;
      }

      const relativePath = normalize(path.relative(resolvedRoot, filePath));
      const contents = readFileSync(filePath);
      files[relativePath] = {
        hash: sha256(contents),
        size: contents.byteLength,
      };
    }
  }

  return {
    root: normalize(resolvedRoot),
    manualRoots: manualRoots.map((manualRoot) => normalize(path.relative(resolvedRoot, manualRoot))),
    files,
  };
}

function ensureParentDirectory(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function compareManualBoundarySnapshots(before, after) {
  const differences = [];
  const beforeRoots = new Set(before.manualRoots || []);
  const afterRoots = new Set(after.manualRoots || []);
  const allRoots = new Set([...beforeRoots, ...afterRoots]);

  for (const root of allRoots) {
    if (!beforeRoots.has(root)) {
      differences.push(`added manual-owned root: ${root}`);
      continue;
    }
    if (!afterRoots.has(root)) {
      differences.push(`removed manual-owned root: ${root}`);
    }
  }

  const beforeFiles = before.files || {};
  const afterFiles = after.files || {};
  const allFiles = new Set([...Object.keys(beforeFiles), ...Object.keys(afterFiles)]);

  for (const file of allFiles) {
    if (!beforeFiles[file]) {
      differences.push(`added manual-owned file: ${file}`);
      continue;
    }
    if (!afterFiles[file]) {
      differences.push(`removed manual-owned file: ${file}`);
      continue;
    }
    if (beforeFiles[file].hash !== afterFiles[file].hash) {
      differences.push(`modified manual-owned file: ${file}`);
    }
  }

  return differences;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.snapshotRoot) {
    const snapshot = buildManualBoundarySnapshot(args.snapshotRoot);
    if (args.writeSnapshot) {
      const outputPath = path.resolve(args.writeSnapshot);
      ensureParentDirectory(outputPath);
      writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      process.stdout.write('[sdkwork-im-admin-sdk] manual-owned boundary snapshot captured');
      return;
    }

    if (args.compareSnapshot) {
      const snapshotPath = path.resolve(args.compareSnapshot);
      if (!existsSync(snapshotPath)) {
        fail(`Snapshot file not found: ${snapshotPath}`);
      }
      const previousSnapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
      const differences = compareManualBoundarySnapshots(previousSnapshot, snapshot);
      if (differences.length > 0) {
        fail(`Protected manual-owned files were modified:\n${differences.join('\n')}`);
      }
      process.stdout.write('[sdkwork-im-admin-sdk] manual-owned boundary verification passed');
      return;
    }
  }

  const invalidPaths = args.changedPaths.filter((candidate) => !isAllowedPath(candidate));
  if (invalidPaths.length > 0) {
    fail(`Generation attempted to modify protected paths:\n${invalidPaths.join('\n')}`);
  }

  process.stdout.write('[sdkwork-im-admin-sdk] boundary verification passed');
}

main();
