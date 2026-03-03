import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, "packages");
const srcDir = path.join(rootDir, "src");
const workspacePrefix = "@sdkwork/openchat-pc-";
const packageDirPrefix = "sdkwork-openchat-pc-";
const sourceFileExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
const commonsAllowedWorkspaceDeps = new Set([
  "@sdkwork/openchat-pc-ui",
  "@sdkwork/openchat-pc-kernel",
  "@sdkwork/openchat-pc-contracts",
]);
const compatibilityPackage = "@sdkwork/openchat-pc-commons";

const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
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
  return candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;
    return fs.statSync(candidate).isFile();
  });
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
      // Skip template placeholders inside generated code strings, e.g. "./${fileName}".
      if (specifier.includes("${")) {
        continue;
      }
      const resolved = resolveRelativeImport(current, specifier);
      if (resolved) {
        queue.push(resolved);
      } else {
        const relativeToRoot = path.relative(rootDir, current);
        fail(`${relativeToRoot} has unresolved relative import (${specifier}) in public API graph`);
      }
    }
  }

  return [...visited];
}

function scanFileForBoundaries(filePath, source, packageDir, packageName) {
  const workspaceImports = new Set();
  const relativeToRoot = path.relative(rootDir, filePath);

  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (/from\s+['"]@\//.test(line)) {
      fail(`${relativeToRoot}:${index + 1} uses forbidden "@/..." import`);
    }
    if (/from\s+['"][^'"]*\/src\//.test(line)) {
      fail(`${relativeToRoot}:${index + 1} imports from another package's /src`);
    }
  }

  for (const specifier of parseImports(source)) {
    if (specifier.startsWith(workspacePrefix)) {
      workspaceImports.add(specifier);
      if (packageName !== compatibilityPackage && specifier === compatibilityPackage) {
        fail(
          `${relativeToRoot} imports deprecated compatibility package ${compatibilityPackage}; use ui/kernel/contracts directly`,
        );
      }
      if (
        packageName === compatibilityPackage &&
        specifier !== packageName &&
        !commonsAllowedWorkspaceDeps.has(specifier)
      ) {
        fail(
          `${relativeToRoot} violates layering: @sdkwork/openchat-pc-commons can only depend on ui/kernel/contracts base packages`,
        );
      }
      continue;
    }

    if (!specifier.startsWith(".")) {
      continue;
    }

    // Skip template placeholders inside generated code strings, e.g. "./${fileName}".
    if (specifier.includes("${")) {
      continue;
    }

    const resolved = resolveRelativeImport(filePath, specifier);
    if (!resolved) {
      fail(`${relativeToRoot} has unresolved relative import (${specifier})`);
      continue;
    }

    const normalizedRootSrc = path.resolve(srcDir).toLowerCase();
    const normalizedResolved = path.resolve(resolved).toLowerCase();
    if (normalizedResolved.startsWith(normalizedRootSrc)) {
      fail(
        `${relativeToRoot} imports root shell source via relative path (${specifier}); packages must be self-contained`,
      );
    }

    const normalizedPackageDir = path.resolve(packageDir).toLowerCase();
    if (!normalizedResolved.startsWith(normalizedPackageDir)) {
      fail(
        `${relativeToRoot} imports outside its package boundary via relative path (${specifier})`,
      );
    }
  }

  return workspaceImports;
}

function scanSourceForForbiddenImports(packageDir, packageName) {
  const entryPath = path.join(packageDir, "src", "index.ts");
  const allWorkspaceImports = new Set();
  const publicWorkspaceImports = new Set();
  const sourceFiles = collectSourceFiles(path.join(packageDir, "src"));

  for (const fullPath of sourceFiles) {
    const source = fs.readFileSync(fullPath, "utf8");
    for (const specifier of scanFileForBoundaries(fullPath, source, packageDir, packageName)) {
      allWorkspaceImports.add(specifier);
    }
  }

  if (fs.existsSync(entryPath)) {
    for (const fullPath of collectExportedGraph(entryPath)) {
      const source = fs.readFileSync(fullPath, "utf8");
      for (const specifier of parseImports(source)) {
        if (specifier.startsWith(workspacePrefix)) {
          publicWorkspaceImports.add(specifier);
        }
      }
    }
  }

  return { allWorkspaceImports, publicWorkspaceImports };
}

function detectCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function dfs(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }
    if (visited.has(node)) {
      return null;
    }

    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) || []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = dfs(node);
    if (cycle) return cycle;
  }
  return null;
}

if (!fs.existsSync(packagesDir)) {
  fail("packages directory does not exist");
} else {
  const packageDirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const packageNames = new Set();
  const dependencyGraph = new Map();
  const importGraph = new Map();

  for (const dirName of packageDirs) {
    if (!dirName.startsWith(packageDirPrefix)) {
      fail(`packages/${dirName} should start with ${packageDirPrefix}`);
      continue;
    }

    const suffix = dirName.slice(packageDirPrefix.length);
    const packageDir = path.join(packagesDir, dirName);
    const packageJsonPath = path.join(packageDir, "package.json");
    const tsconfigPath = path.join(packageDir, "tsconfig.json");
    const indexPath = path.join(packageDir, "src", "index.ts");

    if (!fs.existsSync(packageJsonPath)) {
      fail(`packages/${dirName}/package.json is missing`);
      continue;
    }

    const packageJson = readJson(packageJsonPath);
    const expectedName = `@sdkwork/openchat-pc-${suffix}`;
    if (packageJson.name !== expectedName) {
      fail(`packages/${dirName}/package.json name should be ${expectedName}, got ${packageJson.name}`);
    }
    packageNames.add(packageJson.name);

    if (!fs.existsSync(indexPath)) {
      fail(`packages/${dirName}/src/index.ts is missing`);
    }

    if (!fs.existsSync(tsconfigPath)) {
      fail(`packages/${dirName}/tsconfig.json is missing`);
    } else {
      const tsconfig = readJson(tsconfigPath);
      const include = Array.isArray(tsconfig.include) ? tsconfig.include : [];
      if (!include.includes("src/index.ts")) {
        fail(`packages/${dirName}/tsconfig.json include must contain "src/index.ts"`);
      }
      if (!include.includes("../vite-env.d.ts")) {
        fail(`packages/${dirName}/tsconfig.json include must contain "../vite-env.d.ts"`);
      }
    }

    const runtimeDeps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.peerDependencies || {}),
      ...(packageJson.optionalDependencies || {}),
    };
    const declaredWorkspaceDeps = Object.keys(runtimeDeps).filter((name) =>
      name.startsWith(workspacePrefix),
    );
    if (
      packageJson.name !== compatibilityPackage &&
      declaredWorkspaceDeps.includes(compatibilityPackage)
    ) {
      fail(
        `packages/${dirName}/package.json should not declare ${compatibilityPackage}; depend on ui/kernel/contracts instead`,
      );
    }
    dependencyGraph.set(packageJson.name, declaredWorkspaceDeps);

    const { allWorkspaceImports, publicWorkspaceImports } = scanSourceForForbiddenImports(
      packageDir,
      packageJson.name,
    );
    const usedWorkspaceImports = [...allWorkspaceImports].filter((name) => name !== packageJson.name);
    const usedPublicWorkspaceImports = [...publicWorkspaceImports].filter(
      (name) => name !== packageJson.name,
    );
    importGraph.set(packageJson.name, usedPublicWorkspaceImports);

    for (const importedPackage of usedWorkspaceImports) {
      if (!declaredWorkspaceDeps.includes(importedPackage)) {
        fail(
          `packages/${dirName}/package.json is missing runtime workspace dependency ${importedPackage}`,
        );
      }
    }
  }

  for (const [packageName, deps] of dependencyGraph.entries()) {
    for (const dep of deps) {
      if (!packageNames.has(dep)) {
        fail(`${packageName} declares non-existent workspace dependency ${dep}`);
      }
    }
  }

  const depCycle = detectCycles(dependencyGraph);
  if (depCycle) {
    fail(`workspace dependency cycle detected: ${depCycle.join(" -> ")}`);
  }

  const importCycle = detectCycles(importGraph);
  if (importCycle) {
    fail(`workspace import cycle detected from public APIs: ${importCycle.join(" -> ")}`);
  }
}

const forbiddenSrcDirs = [
  "modules",
  "components",
  "services",
  "utils",
  "types",
  "store",
  "hooks",
  "contexts",
  "lib",
  "pages",
  "core",
  "di",
  "plugins",
  "microfrontends",
  "tools",
  "workers",
  "entities",
];
const allowedShellSrcDirs = new Set([
  "app",
  "i18n",
  "layouts",
  "platform",
  "platform-impl",
  "router",
  "tests",
]);

if (!fs.existsSync(srcDir)) {
  fail("src directory does not exist");
} else {
  for (const dir of forbiddenSrcDirs) {
    const fullPath = path.join(srcDir, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fail(`src/${dir} should not exist in shell layer; move it into packages/`);
    }
  }

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!allowedShellSrcDirs.has(entry.name)) {
      fail(
        `src/${entry.name} is not an allowed shell directory; keep business code inside packages/`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Package verification failed:");
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Package verification passed.");
