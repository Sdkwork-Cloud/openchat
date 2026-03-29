import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getEnvFilePaths,
  normalizeNodeEnvironment,
  OpenChatNodeEnvironment,
} from "./env-file-paths";

export function resolveNodeEnvironment(
  value: string | undefined | null = process.env.NODE_ENV,
): OpenChatNodeEnvironment {
  return normalizeNodeEnvironment(value) ?? "development";
}

export function parseBooleanValue(
  value: boolean | string | undefined | null,
  fallback: boolean,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function parseIntegerValue(
  value: number | string | undefined | null,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function loadOpenChatEnvironment(options?: {
  nodeEnv?: string | null;
  projectRoot?: string;
  override?: boolean;
}): string[] {
  const projectRoot = options?.projectRoot ?? process.cwd();
  const envFilePaths = getEnvFilePaths(options?.nodeEnv).map((relativePath) =>
    resolve(projectRoot, relativePath),
  );
  const loadedFiles: string[] = [];

  for (const filePath of envFilePaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    const values = parseEnvFile(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(values)) {
      if (options?.override || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    loadedFiles.push(filePath);
  }

  return loadedFiles;
}
