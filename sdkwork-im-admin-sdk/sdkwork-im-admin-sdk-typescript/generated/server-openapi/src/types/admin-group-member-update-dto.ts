export interface AdminGroupMemberUpdateDto {
  userId: string;
  role?: 'admin' | 'member';
}
