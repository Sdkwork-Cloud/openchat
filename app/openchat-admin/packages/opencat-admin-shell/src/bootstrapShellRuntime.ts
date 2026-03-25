import { ensureI18n } from '@openchat/opencat-admin-i18n';

export async function bootstrapShellRuntime() {
  await ensureI18n();
}
