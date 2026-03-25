import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
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

const ROLE_OPTIONS = ['user', 'group_admin', 'admin'] as const;

export function UserListPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passwordReset, setPasswordReset] = useState('ChangeMe123!');

  const listQuery = useQuery({
    queryKey: ['admin', 'users', keyword, status, role, page, limit],
    queryFn: () =>
      adminApi.listUsers({
        keyword: keyword || undefined,
        status: status || undefined,
        role: role || undefined,
        page,
        limit,
      }),
  });

  const selectedUser = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedUserId) || null,
    [listQuery.data?.items, selectedUserId],
  );

  const detailQuery = useQuery({
    queryKey: ['admin', 'users', 'detail', selectedUserId],
    queryFn: () => adminApi.getUserDetail(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const deviceSessionsQuery = useQuery({
    queryKey: ['admin', 'users', 'device-sessions', selectedUserId],
    queryFn: () => adminApi.listUserDeviceSessions(selectedUserId!, { limit: 50 }),
    enabled: !!selectedUserId,
  });

  const [draftNickname, setDraftNickname] = useState('');
  const [draftStatus, setDraftStatus] = useState('offline');
  const [draftRoles, setDraftRoles] = useState<string[]>([]);

  useEffect(() => {
    const items = listQuery.data?.items || [];
    if (items.length === 0) {
      setSelectedUserId(null);
      return;
    }

    if (!selectedUserId || !items.some((item) => item.id === selectedUserId)) {
      setSelectedUserId(items[0].id);
    }
  }, [listQuery.data?.items, selectedUserId]);

  useEffect(() => {
    if (!detailQuery.data?.user) {
      return;
    }

    setDraftNickname(detailQuery.data.user.nickname || '');
    setDraftStatus(detailQuery.data.user.status || 'offline');
    setDraftRoles(detailQuery.data.user.roles || []);
  }, [detailQuery.data?.user]);

  const refreshUsers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'overview'] }),
    ]);
  };

  const refreshUserSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'device-sessions', selectedUserId] });
  };

  const profileMutation = useMutation({
    mutationFn: () =>
      adminApi.updateUserProfile(selectedUserId!, {
        nickname: draftNickname,
        status: draftStatus,
      }),
    onSuccess: async () => {
      setFeedback('User profile updated.');
      await refreshUsers();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const rolesMutation = useMutation({
    mutationFn: () => adminApi.updateUserRoles(selectedUserId!, draftRoles),
    onSuccess: async () => {
      setFeedback('User roles updated.');
      await refreshUsers();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminApi.resetUserPassword(selectedUserId!, passwordReset),
    onSuccess: () => {
      setFeedback('Password reset completed.');
      setPasswordReset('ChangeMe123!');
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const logoutDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => adminApi.logoutUserDeviceSession(selectedUserId!, deviceId),
    onSuccess: async (_, deviceId) => {
      setFeedback(`Device session ${deviceId} revoked.`);
      await refreshUserSessions();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const logoutAllDevicesMutation = useMutation({
    mutationFn: () => adminApi.logoutAllUserDeviceSessions(selectedUserId!),
    onSuccess: async (result) => {
      setFeedback(`Revoked ${result.total} device sessions for the selected user.`);
      await refreshUserSessions();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(selectedUserId!),
    onSuccess: async () => {
      setFeedback('User deleted.');
      setSelectedUserId(null);
      await refreshUsers();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  function toggleRole(nextRole: string) {
    setDraftRoles((current) =>
      current.includes(nextRole)
        ? current.filter((roleName) => roleName !== nextRole)
        : [...current, nextRole],
    );
  }

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Identity & Lifecycle"
          title="Users"
          description="Live operators, customer accounts and role governance."
        />
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard>
            <SkeletonBlock className="h-96" />
          </SurfaceCard>
          <SurfaceCard>
            <SkeletonBlock className="h-96" />
          </SurfaceCard>
        </div>
      </div>
    );
  }

  if (listQuery.error || !listQuery.data) {
    return (
      <ErrorState
        title="Failed to load the user domain."
        description={(listQuery.error as Error | undefined)?.message || 'Unknown user query error.'}
        retry={() => void listQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity & Lifecycle"
        title="Users"
        description="Persisted admin roles, online state, account health and operator intervention in one workflow."
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
              placeholder="username / nickname"
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
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="busy">busy</option>
            </select>
          </label>

          <label className="field-label">
            Role
            <select
              className="field-select"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {ROLE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          title={`User Directory / ${listQuery.data.total}`}
          subtitle="Select a user to inspect roles, account state and audit trail."
        >
          {listQuery.data.items.length === 0 ? (
            <EmptyState
              title="No users matched the current filters."
              description="Broaden the keyword, role or status filter and query again."
            />
          ) : (
            <div className="space-y-3">
              {listQuery.data.items.map((user) => (
                <SelectableCard
                  key={user.id}
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setFeedback(null);
                  }}
                  active={user.id === selectedUserId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">
                        {user.displayName}
                        <span className="ml-2 text-sm font-normal text-admin-soft">{user.username}</span>
                      </p>
                      <p className="mt-1 text-sm text-admin-soft">
                        {user.email || user.phone || 'No contact bound'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={user.status || 'offline'} />
                      {(user.roles || []).map((roleName) => (
                        <StatusBadge key={roleName} value={roleName} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Created: {formatDateTime(user.createdAt)}</span>
                    <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
                  </div>
                </SelectableCard>
              ))}

              <PaginationControls
                page={page}
                limit={limit}
                total={listQuery.data.total}
                noun="users"
                onPageChange={setPage}
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Operator Detail"
          subtitle={selectedUser ? `Editing ${selectedUser.username}` : 'Pick an account from the directory.'}
        >
          {!selectedUserId ? (
            <EmptyState
              title="No user selected."
              description="Choose a user on the left to inspect profile, role and audit details."
            />
          ) : detailQuery.isLoading || deviceSessionsQuery.isLoading ? (
            <SkeletonBlock className="h-80" />
          ) : detailQuery.error || deviceSessionsQuery.error || !detailQuery.data || !deviceSessionsQuery.data ? (
            <ErrorState
              title="Failed to load the selected user."
              description={
                (detailQuery.error as Error | undefined)?.message
                || (deviceSessionsQuery.error as Error | undefined)?.message
                || 'Unknown user detail error.'
              }
              retry={() => {
                void detailQuery.refetch();
                void deviceSessionsQuery.refetch();
              }}
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
                  { label: 'User ID', value: detailQuery.data.user.id },
                  { label: 'Email', value: detailQuery.data.user.email || '-' },
                  { label: 'Phone', value: detailQuery.data.user.phone || '-' },
                  { label: 'Last Login IP', value: detailQuery.data.user.lastLoginIp || '-' },
                  { label: 'Friend Count', value: detailQuery.data.stats.friendCount },
                  { label: 'Group Count', value: detailQuery.data.stats.groupCount },
                ]}
              />

              <div className="grid gap-4">
                <label className="field-label">
                  Nickname
                  <input
                    className="field-input"
                    value={draftNickname}
                    onChange={(event) => setDraftNickname(event.target.value)}
                  />
                </label>

                <label className="field-label">
                  Presence Status
                  <select
                    className="field-select"
                    value={draftStatus}
                    onChange={(event) => setDraftStatus(event.target.value)}
                  >
                    <option value="online">online</option>
                    <option value="offline">offline</option>
                    <option value="busy">busy</option>
                  </select>
                </label>

                <div className="field-label">
                  Role Set
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {ROLE_OPTIONS.map((roleName) => (
                      <label
                        key={roleName}
                        className="inset-card flex items-center gap-2 text-sm text-admin-soft"
                      >
                        <input
                          type="checkbox"
                          checked={draftRoles.includes(roleName)}
                          onChange={() => toggleRole(roleName)}
                        />
                        {roleName}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => void profileMutation.mutateAsync()}
                    disabled={profileMutation.isPending}
                  >
                    {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => void rolesMutation.mutateAsync()}
                    disabled={rolesMutation.isPending}
                  >
                    {rolesMutation.isPending ? 'Applying...' : 'Apply Roles'}
                  </button>
                </div>
              </div>

              <InsetCard tone="muted">
                <p className="text-sm font-semibold text-admin">Credential Recovery</p>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    className="field-input"
                    value={passwordReset}
                    onChange={(event) => setPasswordReset(event.target.value)}
                    placeholder="Temporary password"
                  />
                  <button
                    className="btn btn-muted"
                    onClick={() => {
                      if (!window.confirm(`Reset password for ${detailQuery.data.user.username}?`)) {
                        return;
                      }
                      void resetPasswordMutation.mutateAsync();
                    }}
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </InsetCard>

              <InsetCard tone="muted">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-admin">Device Sessions</p>
                    <p className="mt-1 text-sm text-admin-soft">
                      Force logout per device or clear all active user sessions from the admin plane.
                    </p>
                  </div>
                  <button
                    className="btn btn-critical"
                    onClick={() => {
                      if (!window.confirm(`Force logout all device sessions for ${detailQuery.data.user.username}?`)) {
                        return;
                      }
                      void logoutAllDevicesMutation.mutateAsync();
                    }}
                    disabled={logoutAllDevicesMutation.isPending || deviceSessionsQuery.data.total === 0}
                  >
                    {logoutAllDevicesMutation.isPending ? 'Revoking...' : 'Logout All Sessions'}
                  </button>
                </div>

                {deviceSessionsQuery.data.items.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="No tracked device sessions."
                      description="This user has no currently indexed device-bound sessions."
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {deviceSessionsQuery.data.items.map((session) => (
                      <InsetCard
                        key={session.deviceId}
                        className=""
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-admin">{session.deviceId}</p>
                            <p className="mt-1 text-sm text-admin-soft">
                              Tokens {session.tokenCount} / conversations {session.conversationCount}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {session.isCurrentDevice ? <StatusBadge value="current" /> : null}
                            <button
                              className="btn btn-muted"
                              onClick={() => {
                                if (!window.confirm(`Logout device session ${session.deviceId}?`)) {
                                  return;
                                }
                                void logoutDeviceMutation.mutateAsync(session.deviceId);
                              }}
                              disabled={logoutDeviceMutation.isPending}
                            >
                              {logoutDeviceMutation.isPending ? 'Revoking...' : 'Logout Device'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                          <span>Last active: {formatDateTime(session.lastActiveAt)}</span>
                        </div>
                      </InsetCard>
                    ))}
                  </div>
                )}
              </InsetCard>

              <InsetCard tone="danger">
                <p className="text-sm font-semibold text-admin-danger">Danger Zone</p>
                <p className="mt-2 text-sm text-admin-danger">
                  Deletion is soft-delete based and protected against removing the last admin.
                </p>
                <button
                  className="btn btn-critical mt-4"
                  onClick={() => {
                    if (!window.confirm(`Delete user ${detailQuery.data.user.username}?`)) {
                      return;
                    }
                    void deleteMutation.mutateAsync();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
                </button>
              </InsetCard>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin">Recent Audit Trail</p>
                {detailQuery.data.recentAudits.length === 0 ? (
                  <EmptyState
                    title="No audit events recorded."
                    description="This account has no administrator-visible change history yet."
                  />
                ) : (
                  detailQuery.data.recentAudits.slice(0, 6).map((audit) => (
                    <InsetCard
                      key={audit.id}
                      className=""
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-2">
                          <p className="font-medium text-admin">{audit.action}</p>
                          {audit.result ? <StatusBadge value={audit.result} /> : null}
                        </div>
                        <p className="text-xs text-admin-soft">{formatDateTime(audit.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm text-admin-soft">
                        {audit.entityType || 'system'}
                        {audit.entityId ? ` / ${audit.entityId}` : ''}
                      </p>
                    </InsetCard>
                  ))
                )}
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

export default UserListPage;
