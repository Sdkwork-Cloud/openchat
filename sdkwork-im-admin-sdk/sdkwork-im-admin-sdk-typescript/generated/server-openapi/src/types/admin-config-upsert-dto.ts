export interface AdminConfigUpsertDto {
  key: string;
  /** raw config value */
  value: Record<string, unknown>;
  description?: string;
}
