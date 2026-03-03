import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, "packages");
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name));

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

const errors = [];
const warnings = [];

for (const pkgDir of packageDirs) {
  const pkgName = path.basename(pkgDir);
  const srcDir = path.join(pkgDir, "src");
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
    continue;
  }

  const pagesDir = path.join(srcDir, "pages");
  const hooksDir = path.join(srcDir, "hooks");
  const servicesDir = path.join(srcDir, "services");
  const componentsDir = path.join(srcDir, "components");
  const contractsDir = path.join(srcDir, "types", "contracts");
  const hasPages = existsSync(pagesDir);
  const hasHooks = existsSync(hooksDir);
  const hasComponents = existsSync(componentsDir);
  const resultUsageRule = resultUsagePriorityRules.get(pkgName);
  const hasPriorityComponentBoundary = hasComponents && Boolean(resultUsageRule);
  const hasInteractiveBoundary = hasPages || hasHooks || hasPriorityComponentBoundary;
  const includeComponentsInBoundaryScope = hasComponents && (hasPages || hasHooks || Boolean(resultUsageRule));
  const hasServices = existsSync(servicesDir);

  if (hasInteractiveBoundary && !hasServices) {
    errors.push(`${pkgName}: has interactive boundary files but no src/services`);
    continue;
  }

  if (!hasServices) {
    continue;
  }

  const servicesIndexPath = path.join(servicesDir, "index.ts");
  if (!existsSync(servicesIndexPath)) {
    errors.push(`${pkgName}: missing src/services/index.ts`);
  }

  const pkgIndexPath = path.join(srcDir, "index.ts");
  if (existsSync(pkgIndexPath)) {
    const indexText = readText(pkgIndexPath);
    const exportsServicesBarrel =
      /export\s+\*\s+from\s+["']\.\/services["'];/.test(indexText) ||
      /export\s+\{[^}]*\}\s+from\s+["']\.\/services["'];/.test(indexText);
    const exportsServiceDeep = /from\s+["']\.\/services\/[^"']+["']/.test(indexText);
    const exportsRepository = /from\s+["']\.\/repositories\/[^"']+["']/.test(indexText);
    if (!exportsServicesBarrel && !infraPackages.has(pkgName)) {
      errors.push(`${pkgName}: src/index.ts must export service API via ./services barrel`);
    }
    if (exportsServiceDeep && !infraPackages.has(pkgName)) {
      errors.push(`${pkgName}: src/index.ts should not deep-export from ./services/* (use ./services barrel)`);
    }
    if (exportsRepository && !infraPackages.has(pkgName)) {
      errors.push(`${pkgName}: src/index.ts should not export repository-layer APIs`);
    }
  } else {
    if (!infraPackages.has(pkgName)) {
      warnings.push(`${pkgName}: missing src/index.ts`);
    }
  }

  const serviceFiles = walkFiles(
    servicesDir,
    (filePath) => filePath.endsWith(".ts") && !filePath.endsWith("index.ts"),
  );
  const sdkAdapterPath = path.join(servicesDir, "sdk-adapter.ts");
  const hasSdkAdapterFile = serviceFiles.some(
    (filePath) => path.basename(filePath) === "sdk-adapter.ts",
  );
  let hasStandardSDKAdapterContract = hasSdkAdapterFile;
  let serviceResultApiCount = 0;
  for (const serviceFile of serviceFiles) {
    const baseName = path.basename(serviceFile, ".ts");
    const kebabService = /^[a-z][a-zA-Z0-9-]*\.service$/.test(baseName);
    const pascalService = /^[A-Z][A-Za-z0-9]*Service$/.test(baseName);
    const specialFile =
      baseName === "sdk-adapter" || baseName.endsWith(".api") || baseName.endsWith(".client");
    if (!kebabService && !pascalService && !specialFile) {
      warnings.push(
        `${pkgName}: service filename style is non-standard (${normalize(
          path.relative(rootDir, serviceFile),
        )})`,
      );
    }

    const content = readText(serviceFile);
    if (!/\bexport\s+/.test(content)) {
      warnings.push(
        `${pkgName}: service file has no exported API (${normalize(
          path.relative(rootDir, serviceFile),
        )})`,
      );
    }
    const hasServiceResultContract =
      /\bServiceResult\b/.test(content) ||
      /\bcreateServiceResultProxy\b/.test(content) ||
      /\bcreateSuccessServiceResult\b/.test(content) ||
      /\bcreateFailureServiceResult\b/.test(content);
    if (hasServiceResultContract) {
      serviceResultApiCount += 1;
    }
  }

  if (!infraPackages.has(pkgName) && hasInteractiveBoundary && !hasSdkAdapterFile) {
    errors.push(`${pkgName}: missing src/services/sdk-adapter.ts`);
  }

  if (
    !infraPackages.has(pkgName) &&
    hasInteractiveBoundary &&
    hasSdkAdapterFile &&
    !sdkAdapterContractExemptPackages.has(pkgName)
  ) {
    const sdkAdapterText = readText(sdkAdapterPath);
    const hasBridgeType = /\binterface\s+SDKAdapterBridge\b/.test(sdkAdapterText);
    const hasRegister = /\bregisterSDKAdapter\b/.test(sdkAdapterText);
    const hasGetter = /\bgetSDKAdapter\b/.test(sdkAdapterText);
    const hasRegistryFactory = /\bcreateSDKAdapterRegistry\b/.test(sdkAdapterText);
    hasStandardSDKAdapterContract =
      hasBridgeType && hasRegister && hasGetter && hasRegistryFactory;

    if (!hasStandardSDKAdapterContract) {
      errors.push(
        `${pkgName}: sdk-adapter.ts must expose standardized bridge contract (SDKAdapterBridge/registerSDKAdapter/getSDKAdapter via createSDKAdapterRegistry)`,
      );
    }
  }

  if (!infraPackages.has(pkgName) && hasInteractiveBoundary && serviceResultApiCount === 0) {
    errors.push(
      `${pkgName}: no standardized ServiceResult API found under src/services (runtime contract not landed)`,
    );
  }

  const boundaryFiles = [
    ...walkFiles(pagesDir, (filePath) => /\.(ts|tsx)$/.test(filePath)),
    ...(hasHooks ? walkFiles(hooksDir, (filePath) => /\.(ts|tsx)$/.test(filePath)) : []),
    ...(includeComponentsInBoundaryScope && hasComponents
      ? walkFiles(componentsDir, (filePath) => /\.(ts|tsx)$/.test(filePath))
      : []),
  ];

  const sourceFiles = walkFiles(srcDir, (filePath) => /\.(ts|tsx)$/.test(filePath));
  for (const filePath of sourceFiles) {
    const relative = normalize(path.relative(rootDir, filePath));
    const isServiceLayer = relative.includes("/src/services/");
    const isRepositoryLayer = relative.includes("/src/repositories/");
    if (isServiceLayer || isRepositoryLayer) {
      continue;
    }
    const content = readText(filePath);
    if (/from\s+["'][^"']*repositories\/[^"']+["']/.test(content) && !infraPackages.has(pkgName)) {
      errors.push(
        `${pkgName}: repository layer should only be consumed by service layer (${normalize(
          path.relative(rootDir, filePath),
        )})`,
      );
    }
  }

  for (const filePath of boundaryFiles) {
    const content = readText(filePath);
    if (/\bfetch\s*\(/.test(content)) {
      const message = `${pkgName}: pages/hooks/components should not call fetch directly (${normalize(
        path.relative(rootDir, filePath),
      )})`;
      if (!infraPackages.has(pkgName)) {
        errors.push(message);
      }
    }

    const directServiceImport =
      /from\s+["'][^"']*services\/(?!index(?:\.[jt]s)?["'])[^"']+["']/.test(content);
    if (directServiceImport && !infraPackages.has(pkgName)) {
      errors.push(
        `${pkgName}: prefer importing from ../services barrel (${normalize(
          path.relative(rootDir, filePath),
        )})`,
      );
    }

    if (resultUsageRule) {
      const asyncLegacyCallPattern = new RegExp(
        `\\bawait\\s+${resultUsageRule.legacyServiceId}(?:\\.|\\s*\\()`,
      );
      if (asyncLegacyCallPattern.test(content)) {
        errors.push(
          `${pkgName}: async page/hook/component interactions should use ${resultUsageRule.resultServiceId} (${normalize(
            path.relative(rootDir, filePath),
          )})`,
        );
      }
    }
  }

  if (pkgName === "sdkwork-openchat-pc-commons" && existsSync(contractsDir)) {
    const serviceContractsPath = path.join(contractsDir, "service-contracts.ts");
    if (existsSync(serviceContractsPath)) {
      const serviceContractsText = readText(serviceContractsPath);
      if (/interface\s+Service|type\s+ServiceStatus\s*=/.test(serviceContractsText)) {
        errors.push(
          `${pkgName}: service contracts must re-export from @sdkwork/openchat-pc-contracts (${normalize(
            path.relative(rootDir, serviceContractsPath),
          )})`,
        );
      }
    }

    const componentContractsPath = path.join(contractsDir, "component-contracts.ts");
    if (existsSync(componentContractsPath)) {
      const componentContractsText = readText(componentContractsPath);
      if (/interface\s+SlotComponentProps|interface\s+FeaturePageProps/.test(componentContractsText)) {
        errors.push(
          `${pkgName}: component contracts must re-export from @sdkwork/openchat-pc-contracts (${normalize(
            path.relative(rootDir, componentContractsPath),
          )})`,
        );
      }
    }
  }
}

for (const item of errors) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${item}`);
}
for (const item of warnings) {
  // eslint-disable-next-line no-console
  console.warn(`[WARN]  ${item}`);
}

// eslint-disable-next-line no-console
console.log(
  `Service standards audit complete: ${errors.length} error(s), ${warnings.length} warning(s).`,
);

if (errors.length > 0) {
  process.exit(1);
}
