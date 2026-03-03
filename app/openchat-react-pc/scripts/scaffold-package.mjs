import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const segment = process.argv[2]?.trim().toLowerCase();

if (!segment) {
  console.error("Usage: node scripts/scaffold-package.mjs <segment>");
  console.error("Example: node scripts/scaffold-package.mjs analytics");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(segment)) {
  console.error("Segment must match ^[a-z][a-z0-9-]*$");
  process.exit(1);
}

const dirName = `sdkwork-openchat-pc-${segment}`;
const packageName = `@sdkwork/openchat-pc-${segment}`;
const packageDir = path.join(process.cwd(), "packages", dirName);

if (fs.existsSync(packageDir)) {
  console.error(`Package already exists: packages/${dirName}`);
  process.exit(1);
}

fs.mkdirSync(path.join(packageDir, "src"), { recursive: true });

const packageJson = {
  name: packageName,
  version: "0.0.1",
  private: true,
  type: "module",
  main: "./src/index.ts",
  module: "./src/index.ts",
  types: "./src/index.ts",
  exports: {
    ".": {
      types: "./src/index.ts",
      import: "./src/index.ts",
    },
  },
  scripts: {
    typecheck: "tsc --noEmit -p tsconfig.json",
  },
  peerDependencies: {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  },
};

const tsconfig = {
  extends: "../../tsconfig.json",
  compilerOptions: {
    noEmit: true,
  },
  include: ["src/index.ts", "../vite-env.d.ts"],
};

const readme = `# ${packageName}

Package directory: \`packages/${dirName}\`
`;

const indexTs = `export const ${segment.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}ModuleName = "${segment}";
`;

fs.writeFileSync(path.join(packageDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(packageDir, "tsconfig.json"), `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(packageDir, "README.md"), readme, "utf8");
fs.writeFileSync(path.join(packageDir, "src", "index.ts"), indexTs, "utf8");

console.log(`Created package: packages/${dirName}`);
