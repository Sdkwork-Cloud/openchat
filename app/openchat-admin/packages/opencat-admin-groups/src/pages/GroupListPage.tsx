import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AdminGroupMember,
  adminApi,
  normalizeMessageContent,
} from '@openchat/opencat-admin-core';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  InfoGrid,
  InlineNotice,
  InsetCard,
  PaginationControls,
  PageHeader,
  SelectableCard,
  SkeletonBlock,
  StatusBadge,
  SurfaceCard,
  formatDateTime,
} from '@openchat/opencat-admin-ui';

const GROUP_MEMBER_MUTE_PRESETS = [
  { label: 'Unmute', value: 0 },
  { label: '30 min', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '7 days', value: 604800 },
];

function isMemberMuted(member: AdminGroupMember): boolean {
  if (!member.muteUntil) {
    return false;
  }

  const timestamp = new Date(member.muteUntil).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function describeMuteState(member: AdminGroupMember): string {
  if (!member.muteUntil) {
    return 'Mute: inactive';
  }

  const muteUntil = new Date(member.muteUntil).getTime();
  if (!Number.isFinite(muteUntil) || muteUntil <= Date.now()) {
    return 'Mute: expired';
  }

  return `Mute until ${formatDateTime(member.muteUntil)}`;
}

export function GroupListPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'member' | 'admin'>('member');
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, 'member' | 'admin'>>({});
  const [memberMuteDrafts, setMemberMuteDrafts] = useState<Record<string, number>>({});
  const [transferOwnerId, setTransferOwnerId] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'groups', keyword, status, ownerId, page, limit],
    queryFn: () =>
      adminApi.listGroups({
        keyword: keyword || undefined,
        status: status || undefined,
        ownerId: ownerId || undefined,
        page,
        limit,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'groups', 'detail', selectedGroupId],
    queryFn: () => adminApi.getGroupDetail(selectedGroupId!),
    enabled: !!selectedGroupId,
  });

  const [draft, setDraft] = useState({
    name: '',
    description: '',
    announcement: '',
    status: 'active',
    joinType: 'approval',
    muteAll: false,
    maxMembers: 500,
  });

  useEffect(() => {
    const items = listQuery.data?.items || [];
    if (items.length === 0) {
      setSelectedGroupId(null);
      return;
    }

    if (!selectedGroupId || !items.some((item) => item.id === selectedGroupId)) {
      setSelectedGroupId(items[0].id);
    }
  }, [listQuery.data?.items, selectedGroupId]);

  useEffect(() => {
    setMemberRoleDrafts({});
    setMemberMuteDrafts({});
    setTransferOwnerId('');
  }, [selectedGroupId]);

  useEffect(() => {
    if (!detailQuery.data?.group) {
      return;
    }

    setDraft({
      name: detailQuery.data.group.name,
      description: detailQuery.data.group.description || '',
      announcement: detailQuery.data.group.announcement || '',
      status: detailQuery.data.group.status,
      joinType: detailQuery.data.group.joinType,
      muteAll: detailQuery.data.group.muteAll,
      maxMembers: detailQuery.data.group.maxMembers,
    });
  }, [detailQuery.data?.group]);

  useEffect(() => {
    if (!detailQuery.data?.group) {
      setTransferOwnerId('');
      return;
    }

    const eligibleMembers = detailQuery.data.members.filter(
      (member) =>
        member.status === 'joined'
        && member.userId !== detailQuery.data?.group.ownerId,
    );

    if (!eligibleMembers.some((member) => member.userId === transferOwnerId)) {
      setTransferOwnerId(eligibleMembers[0]?.userId || '');
    }
  }, [detailQuery.data, transferOwnerId]);

  async function refreshGroups() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'overview'] }),
    ]);
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateGroup(selectedGroupId!, {
        ...draft,
      }),
    onSuccess: async () => {
      setFeedback('Group configuration saved.');
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      adminApi.addGroupMember(selectedGroupId!, {
        userId: memberUserId,
        role: memberRole,
      }),
    onSuccess: async () => {
      setFeedback('Member added to group.');
      setMemberUserId('');
      setMemberRole('member');
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (payload: { userId: string; role: 'member' | 'admin' }) =>
      adminApi.updateGroupMemberRole(selectedGroupId!, payload.userId, {
        role: payload.role,
      }),
    onSuccess: async (_, variables) => {
      setFeedback(`Updated member role for ${variables.userId}.`);
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const updateMemberMuteMutation = useMutation({
    mutationFn: (payload: { userId: string; durationSeconds: number }) =>
      adminApi.updateGroupMemberMute(selectedGroupId!, payload.userId, {
        durationSeconds: payload.durationSeconds,
      }),
    onSuccess: async (_, variables) => {
      setFeedback(
        variables.durationSeconds > 0
          ? `Mute policy updated for ${variables.userId}.`
          : `Mute cleared for ${variables.userId}.`,
      );
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => adminApi.removeGroupMember(selectedGroupId!, userId),
    onSuccess: async () => {
      setFeedback('Member removed.');
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const transferOwnerMutation = useMutation({
    mutationFn: () => adminApi.transferGroupOwner(selectedGroupId!, transferOwnerId),
    onSuccess: async () => {
      setFeedback('Group ownership transferred.');
      await refreshGroups();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteGroup(selectedGroupId!),
    onSuccess: async () => {
      setFeedback('Group deleted.');
      setSelectedGroupId(null);
      await refreshGroups();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Conversation Governance"
          title="Groups"
          description="Owner, membership and announcement operations for the group graph."
        />
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SkeletonBlock className="h-96" />
          <SkeletonBlock className="h-96" />
        </div>
      </div>
    );
  }

  if (listQuery.error || !listQuery.data) {
    return (
      <ErrorState
        title="Failed to load groups."
        description={(listQuery.error as Error | undefined)?.message || 'Unknown group list error.'}
        retry={() => void listQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conversation Governance"
        title="Groups"
        description="Moderate group lifecycle, membership, announcements, member roles, mute posture and owner transfer from one console."
      />

      <SurfaceCard compact>
        <FilterBar>
          <label className="field-label">
            Keyword
            <input
              className="field-input"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="group name / description"
            />
          </label>
          <label className="field-label">
            Status
            <select
              className="field-select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="dismissed">dismissed</option>
              <option value="banned">banned</option>
            </select>
          </label>
          <label className="field-label">
            Owner ID
            <input
              className="field-input"
              value={ownerId}
              onChange={(event) => {
                setOwnerId(event.target.value);
                setPage(1);
              }}
              placeholder="owner user id"
            />
          </label>
          <label className="field-label">
            Page Size
            <select
              className="field-select"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard
          title={`Group Inventory / ${listQuery.data.total}`}
          subtitle="Choose a group to inspect membership and recent message context."
        >
          {listQuery.data.items.length === 0 ? (
            <EmptyState
              title="No groups matched the current filter set."
              description="Adjust status, owner or keyword filters and query again."
            />
          ) : (
            <div className="space-y-3">
              {listQuery.data.items.map((group) => (
                <SelectableCard
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setFeedback(null);
                  }}
                  active={group.id === selectedGroupId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">{group.name}</p>
                      <p className="mt-1 text-sm text-admin-soft">{group.description || 'No description'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={group.status} />
                      <StatusBadge value={group.joinType} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Owner: {group.ownerId}</span>
                    <span>Members: {group.memberCount || 0}</span>
                    <span>Updated: {formatDateTime(group.updatedAt)}</span>
                  </div>
                </SelectableCard>
              ))}

              <PaginationControls
                page={page}
                limit={limit}
                total={listQuery.data.total}
                noun="groups"
                onPageChange={setPage}
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Group Detail"
          subtitle={selectedGroupId ? `Editing ${detailQuery.data?.group.name || selectedGroupId}` : 'Select a group.'}
        >
          {!selectedGroupId ? (
            <EmptyState
              title="No group selected."
              description="Choose a group from the inventory to review members and moderation controls."
            />
          ) : detailQuery.isLoading ? (
            <SkeletonBlock className="h-80" />
          ) : detailQuery.error || !detailQuery.data ? (
            <ErrorState
              title="Failed to load the selected group."
              description={(detailQuery.error as Error | undefined)?.message || 'Unknown group detail error.'}
              retry={() => void detailQuery.refetch()}
            />
          ) : (
            <div className="space-y-5">
              {feedback ? (
                <InlineNotice>
                  {feedback}
                </InlineNotice>
              ) : null}

              <InfoGrid
                items={[
                  { label: 'Group ID', value: detailQuery.data.group.id },
                  { label: 'Owner', value: detailQuery.data.group.ownerId },
                  {
                    label: 'Joined Members',
                    value: detailQuery.data.members.filter((member) => member.status === 'joined').length,
                  },
                  { label: 'Created', value: formatDateTime(detailQuery.data.group.createdAt) },
                ]}
              />

              <label className="field-label">
                Name
                <input
                  className="field-input"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="field-label">
                Description
                <textarea
                  className="field-textarea"
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                />
              </label>

              <label className="field-label">
                Announcement
                <textarea
                  className="field-textarea"
                  value={draft.announcement}
                  onChange={(event) => setDraft((current) => ({ ...current, announcement: event.target.value }))}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  Status
                  <select
                    className="field-select"
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="dismissed">dismissed</option>
                    <option value="banned">banned</option>
                  </select>
                </label>

                <label className="field-label">
                  Join Policy
                  <select
                    className="field-select"
                    value={draft.joinType}
                    onChange={(event) => setDraft((current) => ({ ...current, joinType: event.target.value }))}
                  >
                    <option value="free">free</option>
                    <option value="approval">approval</option>
                    <option value="forbidden">forbidden</option>
                  </select>
                </label>

                <label className="field-label">
                  Max Members
                  <input
                    className="field-input"
                    type="number"
                    value={draft.maxMembers}
                    onChange={(event) => setDraft((current) => ({ ...current, maxMembers: Number(event.target.value) }))}
                  />
                </label>

                <label className="field-label">
                  Mute All
                  <select
                    className="field-select"
                    value={draft.muteAll ? 'true' : 'false'}
                    onChange={(event) => setDraft((current) => ({ ...current, muteAll: event.target.value === 'true' }))}
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </label>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => void updateMutation.mutateAsync()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Group Settings'}
              </button>

              <InsetCard tone="muted">
                <p className="text-sm font-semibold text-admin">Membership Operations</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                  <input
                    className="field-input"
                    value={memberUserId}
                    onChange={(event) => setMemberUserId(event.target.value)}
                    placeholder="user id"
                  />
                  <select
                    className="field-select"
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value as 'member' | 'admin')}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => void addMemberMutation.mutateAsync()}
                    disabled={addMemberMutation.isPending || !memberUserId.trim()}
                  >
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {detailQuery.data.members.map((member) => {
                    const isOwner = member.role === 'owner';
                    const isJoined = member.status === 'joined';
                    const roleDraft = memberRoleDrafts[member.userId]
                      || (member.role === 'admin' ? 'admin' : 'member');
                    const muteDraft = memberMuteDrafts[member.userId]
                      ?? (isMemberMuted(member) ? 0 : 3600);

                    return (
                      <InsetCard
                        key={member.id}
                        className=""
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-[220px] flex-1">
                            <p className="font-medium text-admin">{member.userId}</p>
                            <p className="text-sm text-admin-soft">
                              {member.nickname || 'No nickname'} / joined {formatDateTime(member.joinedAt || member.createdAt)}
                            </p>
                            <p className="mt-1 text-xs text-admin-soft">{describeMuteState(member)}</p>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <StatusBadge value={member.role} />
                            <StatusBadge value={member.status} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            className="field-select min-w-[120px]"
                            value={roleDraft}
                            onChange={(event) =>
                              setMemberRoleDrafts((current) => ({
                                ...current,
                                [member.userId]: event.target.value as 'member' | 'admin',
                              }))}
                            disabled={isOwner || !isJoined || updateMemberRoleMutation.isPending}
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              void updateMemberRoleMutation.mutateAsync({
                                userId: member.userId,
                                role: roleDraft,
                              })}
                            disabled={
                              isOwner
                              || !isJoined
                              || updateMemberRoleMutation.isPending
                              || roleDraft === member.role
                            }
                          >
                            Apply Role
                          </button>

                          <select
                            className="field-select min-w-[132px]"
                            value={String(muteDraft)}
                            onChange={(event) =>
                              setMemberMuteDrafts((current) => ({
                                ...current,
                                [member.userId]: Number(event.target.value),
                              }))}
                            disabled={isOwner || !isJoined || updateMemberMuteMutation.isPending}
                          >
                            {GROUP_MEMBER_MUTE_PRESETS.map((preset) => (
                              <option key={preset.value} value={preset.value}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-muted"
                            onClick={() =>
                              void updateMemberMuteMutation.mutateAsync({
                                userId: member.userId,
                                durationSeconds: muteDraft,
                              })}
                            disabled={isOwner || !isJoined || updateMemberMuteMutation.isPending}
                          >
                            {muteDraft > 0 ? 'Apply Mute' : 'Unmute'}
                          </button>

                          <button
                            className="btn btn-muted"
                            onClick={() => {
                              if (!window.confirm(`Remove ${member.userId} from this group?`)) {
                                return;
                              }
                              void removeMemberMutation.mutateAsync(member.userId);
                            }}
                            disabled={isOwner || removeMemberMutation.isPending}
                          >
                            Remove
                          </button>
                        </div>
                      </InsetCard>
                    );
                  })}
                </div>
              </InsetCard>

              <InsetCard tone="warning">
                <p className="text-sm font-semibold text-admin-warning">Ownership Transfer</p>
                <p className="mt-2 text-sm text-admin-warning">
                  Promote an active group member to owner. The current owner will be demoted to admin automatically.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    className="field-select"
                    value={transferOwnerId}
                    onChange={(event) => setTransferOwnerId(event.target.value)}
                    disabled={transferOwnerMutation.isPending}
                  >
                    {detailQuery.data.members
                      .filter(
                        (member) =>
                          member.status === 'joined'
                          && member.userId !== detailQuery.data.group.ownerId,
                      )
                      .map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.userId} ({member.role})
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (!transferOwnerId) {
                        return;
                      }
                      if (!window.confirm(`Transfer group ownership to ${transferOwnerId}?`)) {
                        return;
                      }
                      void transferOwnerMutation.mutateAsync();
                    }}
                    disabled={transferOwnerMutation.isPending || !transferOwnerId}
                  >
                    {transferOwnerMutation.isPending ? 'Transferring...' : 'Transfer Owner'}
                  </button>
                </div>
              </InsetCard>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin">Recent Group Messages</p>
                {detailQuery.data.recentMessages.length === 0 ? (
                  <EmptyState
                    title="No recent group messages."
                    description="This group currently has no message history in the sampled window."
                  />
                ) : (
                  detailQuery.data.recentMessages.slice(0, 6).map((message) => (
                    <InsetCard
                      key={message.id}
                      className=""
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-admin">{message.fromUserId}</p>
                        <StatusBadge value={message.status} />
                      </div>
                      <p className="mt-2 text-sm text-admin-soft">{normalizeMessageContent(message.content)}</p>
                    </InsetCard>
                  ))
                )}
              </div>

              <InsetCard tone="danger">
                <p className="text-sm font-semibold text-admin-danger">Danger Zone</p>
                <p className="mt-2 text-sm text-admin-danger">
                  Deleting a group removes it from active operations and audit history will keep the trail.
                </p>
                <button
                  className="btn btn-critical mt-4"
                  onClick={() => {
                    if (!window.confirm('Delete this group permanently from active operations?')) {
                      return;
                    }
                    void deleteMutation.mutateAsync();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Group'}
                </button>
              </InsetCard>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

export default GroupListPage;
