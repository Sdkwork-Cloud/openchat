import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  loadOpenChatEnvironment,
  parseBooleanValue,
  parseIntegerValue,
} from "./env-loader";

describe("env-loader", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads the highest-priority env file first and falls back to .env", () => {
    const projectRoot = mkdtempSync(
      path.join(os.tmpdir(), "openchat-env-loader-"),
    );

    try {
      writeFileSync(
        path.join(projectRoot, ".env.production"),
        "NODE_ENV=production\nPORT=7200\nDB_NAME=openchat\n",
        "utf8",
      );
      writeFileSync(
        path.join(projectRoot, ".env"),
        "PORT=3000\nREDIS_HOST=127.0.0.1\n",
        "utf8",
      );

      delete process.env.PORT;
      delete process.env.REDIS_HOST;

      const loadedFiles = loadOpenChatEnvironment({
        nodeEnv: "production",
        projectRoot,
      });

      expect(loadedFiles).toEqual([
        path.join(projectRoot, ".env.production"),
        path.join(projectRoot, ".env"),
      ]);
      expect(process.env.PORT).toBe("7200");
      expect(process.env.REDIS_HOST).toBe("127.0.0.1");
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("does not override existing process env values by default", () => {
    const projectRoot = mkdtempSync(
      path.join(os.tmpdir(), "openchat-env-loader-"),
    );

    try {
      writeFileSync(
        path.join(projectRoot, ".env.development"),
        "PORT=7200\n",
        "utf8",
      );
      process.env.PORT = "9000";

      loadOpenChatEnvironment({
        nodeEnv: "development",
        projectRoot,
      });

      expect(process.env.PORT).toBe("9000");
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("parses booleans and integers defensively", () => {
    expect(parseBooleanValue("true", false)).toBe(true);
    expect(parseBooleanValue("off", true)).toBe(false);
    expect(parseBooleanValue(undefined, true)).toBe(true);
    expect(parseIntegerValue("42", 10)).toBe(42);
    expect(parseIntegerValue("bad", 10)).toBe(10);
  });
});
