export interface AdminGroupUpdateDto {
  name?: string;
  description?: string;
  announcement?: string;
  status?: 'active' | 'dismissed' | 'banned';
  muteAll?: boolean;
  joinType?: 'free' | 'approval' | 'forbidden';
  maxMembers?: number;
}
