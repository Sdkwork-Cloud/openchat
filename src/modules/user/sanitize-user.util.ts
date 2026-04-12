export function sanitizeUser<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
  const sanitizedUser = { ...user } as Partial<T>;
  delete sanitizedUser.password;
  return sanitizedUser as Omit<T, 'password'>;
}
