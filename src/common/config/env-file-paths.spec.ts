import { getEnvFilePaths, normalizeNodeEnvironment } from "./env-file-paths";

describe("env file paths", () => {
  it("normalizes supported environment aliases", () => {
    expect(normalizeNodeEnvironment("dev")).toBe("development");
    expect(normalizeNodeEnvironment("development")).toBe("development");
    expect(normalizeNodeEnvironment("test")).toBe("test");
    expect(normalizeNodeEnvironment("prod")).toBe("production");
    expect(normalizeNodeEnvironment("production")).toBe("production");
    expect(normalizeNodeEnvironment("staging")).toBeNull();
  });

  it("prefers development env files when NODE_ENV=development", () => {
    expect(getEnvFilePaths("development")).toEqual([
      ".env.development",
      ".env.dev",
      ".env",
    ]);
  });

  it("prefers test env files when NODE_ENV=test", () => {
    expect(getEnvFilePaths("test")).toEqual([".env.test", ".env"]);
  });

  it("prefers production env files when NODE_ENV=production", () => {
    expect(getEnvFilePaths("production")).toEqual([
      ".env.production",
      ".env.prod",
      ".env",
    ]);
  });

  it("falls back to .env first when NODE_ENV is unset or unsupported", () => {
    expect(getEnvFilePaths(null)).toEqual([
      ".env",
      ".env.development",
      ".env.dev",
    ]);
    expect(getEnvFilePaths("staging")).toEqual([
      ".env",
      ".env.development",
      ".env.dev",
    ]);
  });
});
