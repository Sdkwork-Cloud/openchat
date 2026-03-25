import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  InlineNotice,
  InsetCard,
  PaginationControls,
  PageHeader,
  SkeletonBlock,
  StatusBadge,
  SurfaceCard,
  formatDateTime,
} from '@openchat/opencat-admin-ui';

export function FriendListPage() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [feedback, setFeedback] = useState<string | null>(null);

  const friendsQuery = useQuery({
    queryKey: ['admin', 'friends', userId, status, page, limit],
    queryFn: () =>
      adminApi.listFriends({
        userId: userId || undefined,
        status: status || undefined,
        page,
        limit,
      }),
  });

  const requestsQuery = useQuery({
    queryKey: ['admin', 'friend-requests', userId, status, page, limit],
    queryFn: () =>
      adminApi.listFriendRequests({
        userId: userId || undefined,
        status: status || undefined,
        page,
        limit,
      }),
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'friends'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'friend-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'overview'] }),
    ]);
  }

  const removeMutation = useMutation({
    mutationFn: ({ userId: fromUserId, friendId }: { userId: string; friendId: string }) =>
      adminApi.removeFriendship(fromUserId, friendId),
    onSuccess: async () => {
      setFeedback('Friendship removed.');
      await refresh();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId: fromUserId, friendId }: { userId: string; friendId: string }) =>
      adminApi.blockFriendship(fromUserId, friendId),
    onSuccess: async () => {
      setFeedback('Friendship blocked.');
      await refresh();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const unblockMutation = useMutation({
    mutationFn: ({ userId: fromUserId, friendId }: { userId: string; friendId: string }) =>
      adminApi.unblockFriendship(fromUserId, friendId),
    onSuccess: async () => {
      setFeedback('Friendship unblocked.');
      await refresh();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => adminApi.acceptFriendRequest(requestId),
    onSuccess: async () => {
      setFeedback('Friend request accepted.');
      await refresh();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => adminApi.rejectFriendRequest(requestId),
    onSuccess: async () => {
      setFeedback('Friend request rejected.');
      await refresh();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (friendsQuery.isLoading || requestsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Relationship Graph"
          title="Friends"
          description="Accepted friendships, blocked edges and pending request flow."
        />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  if (friendsQuery.error || requestsQuery.error || !friendsQuery.data || !requestsQuery.data) {
    return (
      <ErrorState
        title="Failed to load friendship operations."
        description={
          (friendsQuery.error as Error | undefined)?.message
          || (requestsQuery.error as Error | undefined)?.message
          || 'Unknown friendship error.'
        }
        retry={() => {
          void friendsQuery.refetch();
          void requestsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relationship Graph"
        title="Friends"
        description="Operate friendship removals, blocks, unblocks and inspect request pipeline health."
      />

      <SurfaceCard compact>
        <FilterBar>
          <label className="field-label">
            User ID
            <input
              className="field-input"
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                setPage(1);
              }}
              placeholder="filter by user id"
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
              <option value="accepted">accepted</option>
              <option value="blocked">blocked</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
              <option value="expired">expired</option>
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

      {feedback ? (
        <InlineNotice>
          {feedback}
        </InlineNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard
          title={`Friendships / ${friendsQuery.data.total}`}
          subtitle="Accepted or blocked edges inside the social graph."
        >
          {friendsQuery.data.items.length === 0 ? (
            <EmptyState
              title="No friendships matched the current filter."
              description="Try removing the user id or status filter."
            />
          ) : (
            <div className="space-y-3">
              {friendsQuery.data.items.map((item) => (
                <InsetCard
                  key={item.id}
                  className=""
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">
                        {item.userId}
                        <span className="mx-2 text-admin-soft">-&gt;</span>
                        {item.friendId}
                      </p>
                      <p className="mt-1 text-sm text-admin-soft">
                        {item.remark || 'No remark'}
                        {item.group ? ` / group ${item.group}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={item.status} />
                      <button
                        className="btn btn-muted"
                        onClick={() => {
                          if (!window.confirm(`Remove friendship ${item.userId} -> ${item.friendId}?`)) {
                            return;
                          }
                          void removeMutation.mutateAsync({ userId: item.userId, friendId: item.friendId });
                        }}
                      >
                        Remove
                      </button>
                      {item.status === 'blocked' ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            if (!window.confirm(`Unblock friendship ${item.userId} -> ${item.friendId}?`)) {
                              return;
                            }
                            void unblockMutation.mutateAsync({ userId: item.userId, friendId: item.friendId });
                          }}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          className="btn btn-critical"
                          onClick={() => {
                            if (!window.confirm(`Block friendship ${item.userId} -> ${item.friendId}?`)) {
                              return;
                            }
                            void blockMutation.mutateAsync({ userId: item.userId, friendId: item.friendId });
                          }}
                        >
                          Block
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Accepted: {formatDateTime(item.acceptedAt)}</span>
                    <span>Blocked: {formatDateTime(item.blockedAt)}</span>
                    <span>Created: {formatDateTime(item.createdAt)}</span>
                  </div>
                </InsetCard>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title={`Requests / ${requestsQuery.data.total}`}
          subtitle="Pending and historical inbound requests for the filtered user."
        >
          {requestsQuery.data.items.length === 0 ? (
            <EmptyState
              title="No friend requests found."
              description="No inbound request records match the selected filter."
            />
          ) : (
            <div className="space-y-3">
              {requestsQuery.data.items.map((item) => (
                <InsetCard
                  key={item.id}
                  className=""
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">
                        {item.fromUserId}
                        <span className="mx-2 text-admin-soft">-&gt;</span>
                        {item.toUserId}
                      </p>
                      <p className="mt-1 text-sm text-admin-soft">{item.message || 'No request message'}</p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Created: {formatDateTime(item.createdAt)}</span>
                    <span>Expires: {formatDateTime(item.expiresAt)}</span>
                    <span>Responded: {formatDateTime(item.respondedAt)}</span>
                  </div>
                  {item.status === 'pending' ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          if (!window.confirm(`Accept friend request ${item.id}?`)) {
                            return;
                          }
                          void acceptRequestMutation.mutateAsync(item.id);
                        }}
                        disabled={acceptRequestMutation.isPending}
                      >
                        {acceptRequestMutation.isPending ? 'Accepting...' : 'Accept Request'}
                      </button>
                      <button
                        className="btn btn-critical"
                        onClick={() => {
                          if (!window.confirm(`Reject friend request ${item.id}?`)) {
                            return;
                          }
                          void rejectRequestMutation.mutateAsync(item.id);
                        }}
                        disabled={rejectRequestMutation.isPending}
                      >
                        {rejectRequestMutation.isPending ? 'Rejecting...' : 'Reject Request'}
                      </button>
                    </div>
                  ) : null}
                </InsetCard>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard compact>
        <PaginationControls
          page={page}
          limit={limit}
          total={Math.max(friendsQuery.data.total, requestsQuery.data.total)}
          noun="relationship records"
          onPageChange={setPage}
        />
      </SurfaceCard>
    </div>
  );
}

export default FriendListPage;
