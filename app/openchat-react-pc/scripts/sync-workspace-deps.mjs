import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, "packages");
const workspacePrefix = "@sdkwork/openchat-pc-";
const sourceFileExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveRelativeImport(filePath, specifier) {
  const base = path.resolve(path.dirname(filePath), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function parseImports(source) {
  importRegex.lastIndex = 0;
  const imports = [];
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const specifier = match[1] || match[2];
    if (specifier) {
      imports.push(specifier);
    }
  }
  return imports;
}

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (sourceFileExtensions.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function collectExportedGraph(entryPath) {
  const visited = new Set();
  const queue = [entryPath];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || visited.has(current) || !fs.existsSync(current)) {
      continue;
    }
    visited.add(current);

    const source = fs.readFileSync(current, "utf8");
    for (const specifier of parseImports(source)) {
      if (!specifier || !specifier.startsWith(".")) {
        continue;
      }
      const resolved = resolveRelativeImport(current, specifier);
      if (resolved) {
        queue.push(resolved);
      }
    }
  }

  return [...visited];
}

function collectWorkspaceImports(entryPath, selfPackageName) {
  const imports = new Set();
  const srcDir = path.dirname(entryPath);

  for (const filePath of collectSourceFiles(path.resolve(srcDir))) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const specifier of parseImports(source)) {
      if (specifier?.startsWith(workspacePrefix) && specifier !== selfPackageName) {
        imports.add(specifier);
      }
    }
  }

  if (!fs.existsSync(entryPath)) {
    return imports;
  }

  for (const filePath of collectExportedGraph(entryPath)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const specifier of parseImports(source)) {
      if (!specifier || !specifier.startsWith(workspacePrefix)) {
        continue;
      }
      if (specifier !== selfPackageName) {
        imports.add(specifier);
      }
    }
  }

  return imports;
}

const packageDirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const dirName of packageDirs) {
  const packageJsonPath = path.join(packagesDir, dirName, "package.json");
  const entryPath = path.join(packagesDir, dirName, "src", "index.ts");
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = readJson(packageJsonPath);
  const selfPackageName = packageJson.name;
  const workspaceImports = collectWorkspaceImports(entryPath, selfPackageName);

  const dependencies = { ...(packageJson.dependencies || {}) };
  const peerDependencies = { ...(packageJson.peerDependencies || {}) };
  const optionalDependencies = { ...(packageJson.optionalDependencies || {}) };

  for (const key of Object.keys(dependencies)) {
    if (key.startsWith(workspacePrefix) && !workspaceImports.has(key)) {
      delete dependencies[key];
    }
  }
  for (const key of Object.keys(peerDependencies)) {
    if (key.startsWith(workspacePrefix)) {
      delete peerDependencies[key];
    }
  }
  for (const key of Object.keys(optionalDependencies)) {
    if (key.startsWith(workspacePrefix)) {
      delete optionalDependencies[key];
    }
  }

  for (const dep of workspaceImports) {
    dependencies[dep] = "workspace:*";
  }

  const sortObject = (input) =>
    Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)));

  packageJson.dependencies = sortObject(dependencies);
  if (Object.keys(peerDependencies).length > 0) {
    packageJson.peerDependencies = sortObject(peerDependencies);
  }
  if (Object.keys(optionalDependencies).length > 0) {
    packageJson.optionalDependencies = sortObject(optionalDependencies);
  }

  writeJson(packageJsonPath, packageJson);
  console.log(`synced workspace deps: ${dirName}`);
}
