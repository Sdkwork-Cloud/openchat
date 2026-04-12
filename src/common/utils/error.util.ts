export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  const record = asRecord(error);
  if (typeof record?.message === 'string' && record.message.trim()) {
    return record.message;
  }

  if (error !== undefined && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return 'Unknown error';
}

export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(getErrorMessage(error));
}
