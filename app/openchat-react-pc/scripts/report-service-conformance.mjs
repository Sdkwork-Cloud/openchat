import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function walkFiles(dir, matcher, bucket = []) {
  if (!existsSync(dir)) {
    return bucket;
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, matcher, bucket);
      continue;
    }
    if (matcher(fullPath)) {
      bucket.push(fullPath);
    }
  }
  return bucket;
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, "packages");
const reportDir = path.join(rootDir, "docs", "reports");
const reportPath = path.join(reportDir, "service-conformance-report.md");

const infraPackages = new Set([
  "sdkwork-openchat-pc-commons",
  "sdkwork-openchat-pc-contracts",
  "sdkwork-openchat-pc-kernel",
  "sdkwork-openchat-pc-ui",
]);
const sdkAdapterContractExemptPackages = new Set();
const resultUsagePriorityRules = new Map([
  ["sdkwork-openchat-pc-appstore", { legacyServiceId: "(?:getCategories|searchApps|getAppById|installApp|uninstallApp)", resultServiceId: "AppstoreResultService" }],
  ["sdkwork-openchat-pc-auth", { legacyServiceId: "(?:authService|AuthService|loginService|logoutService|registerService|forgotPasswordService|restoreAuth|loginWithThirdPartyService|sendVerificationCode|phoneRegister|emailRegister)", resultServiceId: "AuthResultService" }],
  ["sdkwork-openchat-pc-im", { legacyServiceId: "(?:getConversations|getTotalUnreadCount|sendMessageService|getMessages|recallMessage|deleteMessage|searchMessages|markMessagesAsRead|createGroup|registerMessageEventListeners)", resultServiceId: "ConversationResultService/MessageResultService/GroupResultService/FileResultService" }],
  ["sdkwork-openchat-pc-settings", { legacyServiceId: "SettingsService", resultServiceId: "SettingsResultService" }],
  ["sdkwork-openchat-pc-creation", { legacyServiceId: "CreationService", resultServiceId: "CreationResultService" }],
  ["sdkwork-openchat-pc-drive", { legacyServiceId: "FileService", resultServiceId: "FileResultService" }],
  ["sdkwork-openchat-pc-tools", { legacyServiceId: "ToolsService", resultServiceId: "ToolsResultService" }],
  ["sdkwork-openchat-pc-discover", { legacyServiceId: "DiscoverService", resultServiceId: "DiscoverResultService" }],
  ["sdkwork-openchat-pc-wallet", { legacyServiceId: "WalletService", resultServiceId: "WalletResultService" }],
  ["sdkwork-openchat-pc-notification", { legacyServiceId: "NotificationService", resultServiceId: "NotificationResultService" }],
  ["sdkwork-openchat-pc-social", { legacyServiceId: "MomentsService", resultServiceId: "MomentsResultService" }],
  ["sdkwork-openchat-pc-video", { legacyServiceId: "VideoService", resultServiceId: "VideoResultService" }],
  ["sdkwork-openchat-pc-commerce", { legacyServiceId: "(?:CartService|CommerceService)", resultServiceId: "CartResultService/CommerceResultService" }],
  ["sdkwork-openchat-pc-device", { legacyServiceId: "deviceService", resultServiceId: "DeviceResultService" }],
  ["sdkwork-openchat-pc-terminal", { legacyServiceId: "terminalService", resultServiceId: "TerminalResultService" }],
  ["sdkwork-openchat-pc-skill", { legacyServiceId: "SkillService", resultServiceId: "SkillResultService" }],
  ["sdkwork-openchat-pc-tool", { legacyServiceId: "ToolService", resultServiceId: "ToolResultService" }],
  ["sdkwork-openchat-pc-agent", { legacyServiceId: "(?:AgentService|memoryService)", resultServiceId: "AgentResultService/AgentMemoryResultService" }],
  ["sdkwork-openchat-pc-search", { legacyServiceId: "SearchService", resultServiceId: "SearchResultService" }],
]);

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))
  .sort();

const rows = [];

for (const pkgDir of packageDirs) {
  const packageName = path.basename(pkgDir);
  const srcDir = path.join(pkgDir, "src");
  if (!existsSync(srcDir)) {
    continue;
  }

  const pagesDir = path.join(srcDir, "pages");
  const hooksDir = path.join(srcDir, "hooks");
  const componentsDir = path.join(srcDir, "components");
  const hasPages = existsSync(pagesDir);
  const hasHooks = existsSync(hooksDir);
  const hasComponents = existsSync(componentsDir);
  const resultUsageRule = resultUsagePriorityRules.get(packageName);
  const hasPriorityComponentBoundary = hasComponents && Boolean(resultUsageRule);
  const hasInteractiveBoundary = hasPages || hasHooks || hasPriorityComponentBoundary;
  const includeComponentsInBoundaryScope = hasComponents && (hasPages || hasHooks || Boolean(resultUsageRule));
  if (!hasInteractiveBoundary) {
    continue;
  }

  const servicesDir = path.join(srcDir, "services");
  const hasServices = existsSync(servicesDir);
  const hasServicesIndex = existsSync(path.join(servicesDir, "index.ts"));
  const sdkAdapterPath = path.join(servicesDir, "sdk-adapter.ts");
  const hasSdkAdapter = existsSync(sdkAdapterPath);
  const requiresSDKAdapterContract =
    !infraPackages.has(packageName) && !sdkAdapterContractExemptPackages.has(packageName);
  let hasSDKAdapterContract = !requiresSDKAdapterContract;
  if (requiresSDKAdapterContract && hasSdkAdapter) {
    const sdkAdapterText = readText(sdkAdapterPath);
    const hasBridgeType = /\binterface\s+SDKAdapterBridge\b/.test(sdkAdapterText);
    const hasRegister = /\bregisterSDKAdapter\b/.test(sdkAdapterText);
    const hasGetter = /\bgetSDKAdapter\b/.test(sdkAdapterText);
    const hasRegistryFactory = /\bcreateSDKAdapterRegistry\b/.test(sdkAdapterText);
    hasSDKAdapterContract = hasBridgeType && hasRegister && hasGetter && hasRegistryFactory;
  }

  const indexPath = path.join(srcDir, "index.ts");
  let exportsServices = false;
  let hasDeepServiceExport = false;
  let hasRepositoryExport = false;
  if (existsSync(indexPath)) {
    const indexText = readText(indexPath);
    exportsServices =
      /export\s+\*\s+from\s+["']\.\/services["'];/.test(indexText) ||
      /export\s+\{[^}]*\}\s+from\s+["']\.\/services["'];/.test(indexText);
    hasDeepServiceExport = /from\s+["']\.\/services\/[^"']+["']/.test(indexText);
    hasRepositoryExport = /from\s+["']\.\/repositories\/[^"']+["']/.test(indexText);
  }

  const serviceFiles = hasServices
    ? walkFiles(servicesDir, (filePath) => filePath.endsWith(".ts") && !filePath.endsWith("index.ts"))
    : [];
  let interfaceCount = 0;
  let serviceResultApiCount = 0;
  for (const serviceFile of serviceFiles) {
    const text = readText(serviceFile);
    interfaceCount += (text.match(/\bexport\s+interface\s+\w+|\binterface\s+\w+/g) ?? []).length;
    const hasServiceResultContract =
      /\bServiceResult\b/.test(text) ||
      /\bcreateServiceResultProxy\b/.test(text) ||
      /\bcreateSuccessServiceResult\b/.test(text) ||
      /\bcreateFailureServiceResult\b/.test(text);
    if (hasServiceResultContract) {
      serviceResultApiCount += 1;
    }
  }

  const boundaryFiles = [
    ...walkFiles(pagesDir, (filePath) => /\.(ts|tsx)$/.test(filePath)),
    ...(hasHooks ? walkFiles(hooksDir, (filePath) => /\.(ts|tsx)$/.test(filePath)) : []),
    ...(includeComponentsInBoundaryScope && hasComponents
      ? walkFiles(componentsDir, (filePath) => /\.(ts|tsx)$/.test(filePath))
      : []),
  ];

  let directFetchCount = 0;
  let directServiceImportCount = 0;
  let asyncLegacyCallCount = 0;
  for (const filePath of boundaryFiles) {
    const text = readText(filePath);
    if (/\bfetch\s*\(/.test(text)) {
      directFetchCount += 1;
    }
    if (/from\s+["'][^"']*services\/(?!index(?:\.[jt]s)?["'])[^"']+["']/.test(text)) {
      directServiceImportCount += 1;
    }
    if (resultUsageRule) {
      const asyncLegacyCallPattern = new RegExp(
        `\\bawait\\s+${resultUsageRule.legacyServiceId}(?:\\.|\\s*\\()`,
      );
      if (asyncLegacyCallPattern.test(text)) {
        asyncLegacyCallCount += 1;
      }
    }
  }

  const resultUsagePass = !resultUsageRule || asyncLegacyCallCount === 0;
  const strictScope = !infraPackages.has(packageName);
  const requiresServiceResult = strictScope;
  const pass =
    hasServices &&
    hasServicesIndex &&
    (!strictScope || hasSdkAdapter) &&
    (!requiresSDKAdapterContract || hasSDKAdapterContract) &&
    (exportsServices || !strictScope) &&
    (!strictScope || !hasDeepServiceExport) &&
    (!strictScope || !hasRepositoryExport) &&
    (!requiresServiceResult || serviceResultApiCount > 0) &&
    (!strictScope || (directFetchCount === 0 && directServiceImportCount === 0)) &&
    resultUsagePass;

  rows.push({
    packageName,
    strictScope,
    requiresServiceResult,
    hasServices,
    hasServicesIndex,
    hasSdkAdapter,
    hasSDKAdapterContract,
    requiresSDKAdapterContract,
    exportsServices,
    hasDeepServiceExport,
    hasRepositoryExport,
    serviceFileCount: serviceFiles.length,
    interfaceCount,
    serviceResultApiCount,
    directFetchCount,
    directServiceImportCount,
    asyncLegacyCallCount,
    resultUsagePass,
    pass,
  });
}

const now = new Date();
const generatedAt = `${now.toISOString()} (local)`;

const totals = rows.reduce(
  (acc, row) => {
    if (row.pass) {
      acc.passed += 1;
    } else {
      acc.failed += 1;
    }
    acc.modules += 1;
    acc.totalServices += row.serviceFileCount;
    acc.totalInterfaces += row.interfaceCount;
    acc.totalServiceResultApis += row.serviceResultApiCount;
    acc.totalSDKAdapterContractFailures +=
      row.requiresSDKAdapterContract && !row.hasSDKAdapterContract ? 1 : 0;
    acc.totalDeepServiceExports += row.hasDeepServiceExport ? 1 : 0;
    acc.totalRepositoryExports += row.hasRepositoryExport ? 1 : 0;
    acc.totalDirectFetch += row.directFetchCount;
    acc.totalDirectImports += row.directServiceImportCount;
    acc.totalAsyncLegacyCalls += row.asyncLegacyCallCount;
    return acc;
  },
  {
    modules: 0,
    passed: 0,
    failed: 0,
    totalServices: 0,
    totalInterfaces: 0,
    totalServiceResultApis: 0,
    totalSDKAdapterContractFailures: 0,
    totalDeepServiceExports: 0,
    totalRepositoryExports: 0,
    totalDirectFetch: 0,
    totalDirectImports: 0,
    totalAsyncLegacyCalls: 0,
  },
);

const lines = [];
lines.push("# Service Conformance Report");
lines.push("");
lines.push(`Generated at: ${generatedAt}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Modules in scope: ${totals.modules}`);
lines.push(`- Passed: ${totals.passed}`);
lines.push(`- Failed: ${totals.failed}`);
lines.push(`- Service files: ${totals.totalServices}`);
lines.push(`- Interface declarations: ${totals.totalInterfaces}`);
lines.push(`- ServiceResult API files: ${totals.totalServiceResultApis}`);
lines.push(`- SDK adapter contract violations: ${totals.totalSDKAdapterContractFailures}`);
lines.push(`- Deep service export violations: ${totals.totalDeepServiceExports}`);
lines.push(`- Repository export violations: ${totals.totalRepositoryExports}`);
lines.push(`- Direct fetch violations: ${totals.totalDirectFetch}`);
lines.push(`- Direct service deep-import violations: ${totals.totalDirectImports}`);
lines.push(`- Priority modules async legacy-call violations: ${totals.totalAsyncLegacyCalls}`);
lines.push("");
lines.push("## Matrix");
lines.push("");
lines.push(
  "| Package | Scope | Services | Index | SDK Adapter | SDK Contract | Service Barrel Export | Deep Svc Export | Repo Export | Service Files | Interfaces | ServiceResult APIs | Direct Fetch | Deep Import | Async Legacy Calls | Result Usage | Status |",
);
lines.push(
  "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
);

for (const row of rows) {
  lines.push(
    `| ${row.packageName} | ${row.strictScope ? "Business" : "Infra"} | ${row.hasServices ? "Y" : "N"} | ${row.hasServicesIndex ? "Y" : "N"} | ${row.hasSdkAdapter ? "Y" : "N"} | ${row.requiresSDKAdapterContract ? (row.hasSDKAdapterContract ? "Y" : "N") : "-" } | ${row.exportsServices ? "Y" : "N"} | ${row.hasDeepServiceExport ? "Y" : "N"} | ${row.hasRepositoryExport ? "Y" : "N"} | ${row.serviceFileCount} | ${row.interfaceCount} | ${row.serviceResultApiCount}${row.requiresServiceResult ? "*" : ""} | ${row.directFetchCount} | ${row.directServiceImportCount} | ${row.asyncLegacyCallCount} | ${row.resultUsagePass ? "Y" : "N"} | ${row.pass ? "PASS" : "FAIL"} |`,
  );
}

lines.push("");
lines.push("## Notes");
lines.push("");
lines.push("- Scope includes packages with `src/pages`/`src/hooks`; priority modules can also be scoped by `src/components` only.");
lines.push("- Infra packages are evaluated with relaxed export/fetch rules.");
lines.push("- Strict service boundary checks are enforced for business modules.");
lines.push("- `*` in ServiceResult column marks packages in strict runtime-contract scope.");
lines.push("- `SDK Contract` checks standardized sdk-adapter registry shape (`SDKAdapterBridge/register/get`).");
lines.push("- `Result Usage` currently applies to priority modules: appstore/auth/im/settings/creation/drive/tools/discover/wallet/notification/social/video/commerce/device/terminal/skill/tool/agent/search.");
lines.push("- `Deep Svc Export` and `Repo Export` columns highlight index-level boundary leakage risks.");

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");

// eslint-disable-next-line no-console
console.log(`Service conformance report written: ${normalize(path.relative(rootDir, reportPath))}`);
