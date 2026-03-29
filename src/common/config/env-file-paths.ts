export type OpenChatNodeEnvironment = 'development' | 'test' | 'production';

export function normalizeNodeEnvironment(
  value: string | undefined | null,
): OpenChatNodeEnvironment | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'development':
    case 'dev':
      return 'development';
    case 'test':
      return 'test';
    case 'production':
    case 'prod':
      return 'production';
    default:
      return null;
  }
}

export function getEnvFilePaths(
  nodeEnv: string | undefined | null = process.env.NODE_ENV,
): string[] {
  const normalized = normalizeNodeEnvironment(nodeEnv);

  if (normalized === 'development') {
    return ['.env.development', '.env.dev', '.env'];
  }

  if (normalized === 'test') {
    return ['.env.test', '.env'];
  }

  if (normalized === 'production') {
    return ['.env.production', '.env.prod', '.env'];
  }

  return ['.env', '.env.development', '.env.dev'];
}
