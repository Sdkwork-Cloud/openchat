export interface AdminUserProfileUpdateDto {
  /** nickname override */
  nickname?: string;
  status?: 'online' | 'offline' | 'busy';
  /** avatar payload or url */
  avatar?: Record<string, unknown>;
  /** custom user resources */
  resources?: Record<string, unknown>;
}
