import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  normalizeMessageContent,
} from '@openchat/opencat-admin-core';
import {
  CodeBlock,
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

export function MessageListPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'messages', keyword, fromUserId, toUserId, groupId, status, type, page, limit],
    queryFn: () =>
      adminApi.listMessages({
        keyword: keyword || undefined,
        fromUserId: fromUserId || undefined,
        toUserId: toUserId || undefined,
        groupId: groupId || undefined,
        status: status || undefined,
        type: type || undefined,
        page,
        limit,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'messages', 'detail', selectedMessageId],
    queryFn: () => adminApi.getMessageDetail(selectedMessageId!),
    enabled: !!selectedMessageId,
  });

  useEffect(() => {
    const items = listQuery.data?.items || [];
    if (items.length === 0) {
      setSelectedMessageId(null);
      return;
    }

    if (!selectedMessageId || !items.some((item) => item.id === selectedMessageId)) {
      setSelectedMessageId(items[0].id);
    }
  }, [listQuery.data?.items, selectedMessageId]);

  async function refreshMessages() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'overview'] }),
    ]);
  }

  const recallMutation = useMutation({
    mutationFn: () => adminApi.recallMessage(selectedMessageId!),
    onSuccess: async () => {
      setFeedback('Message recalled.');
      await refreshMessages();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteMessage(selectedMessageId!),
    onSuccess: async () => {
      setFeedback('Message deleted.');
      setSelectedMessageId(null);
      await refreshMessages();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Content Safety"
          title="Messages"
          description="Moderation console for direct, group and system messages."
        />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  if (listQuery.error || !listQuery.data) {
    return (
      <ErrorState
        title="Failed to load message moderation data."
        description={(listQuery.error as Error | undefined)?.message || 'Unknown message list error.'}
        retry={() => void listQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content Safety"
        title="Messages"
        description="Filter sender, recipient, group and message status, then recall or delete directly from the moderation panel."
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
              placeholder="content keyword"
            />
          </label>
          <label className="field-label">
            Sender
            <input
              className="field-input"
              value={fromUserId}
              onChange={(event) => {
                setFromUserId(event.target.value);
                setPage(1);
              }}
              placeholder="from user id"
            />
          </label>
          <label className="field-label">
            Receiver
            <input
              className="field-input"
              value={toUserId}
              onChange={(event) => {
                setToUserId(event.target.value);
                setPage(1);
              }}
              placeholder="to user id"
            />
          </label>
          <label className="field-label">
            Group
            <input
              className="field-input"
              value={groupId}
              onChange={(event) => {
                setGroupId(event.target.value);
                setPage(1);
              }}
              placeholder="group id"
            />
          </label>
          <label className="field-label">
            Status
            <input
              className="field-input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              placeholder="sent / recalled / read"
            />
          </label>
          <label className="field-label">
            Type
            <input
              className="field-input"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              placeholder="text / image / custom"
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard
          title={`Message Feed / ${listQuery.data.total}`}
          subtitle="Choose a record to inspect payload and moderation actions."
        >
          {listQuery.data.items.length === 0 ? (
            <EmptyState
              title="No messages matched the filter set."
              description="Broaden sender, receiver, status or keyword filters."
            />
          ) : (
            <div className="space-y-3">
              {listQuery.data.items.map((message) => (
                <SelectableCard
                  key={message.id}
                  onClick={() => {
                    setSelectedMessageId(message.id);
                    setFeedback(null);
                  }}
                  active={message.id === selectedMessageId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">{message.fromUserId}</p>
                      <p className="mt-1 text-sm text-admin-soft">
                        to {message.toUserId || message.groupId || 'unknown target'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={message.type} />
                      <StatusBadge value={message.status} />
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-admin-soft">
                    {normalizeMessageContent(message.content)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Seq: {message.seq || '-'}</span>
                    <span>Retry: {message.retryCount || 0}</span>
                    <span>Created: {formatDateTime(message.createdAt)}</span>
                  </div>
                </SelectableCard>
              ))}

              <PaginationControls
                page={page}
                limit={limit}
                total={listQuery.data.total}
                noun="messages"
                onPageChange={setPage}
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="Moderation Detail"
          subtitle={selectedMessageId ? `Inspecting ${selectedMessageId}` : 'Select a message.'}
        >
          {!selectedMessageId ? (
            <EmptyState
              title="No message selected."
              description="Pick a message from the feed to inspect the payload and moderation actions."
            />
          ) : detailQuery.isLoading ? (
            <SkeletonBlock className="h-80" />
          ) : detailQuery.error || !detailQuery.data ? (
            <ErrorState
              title="Failed to load the selected message."
              description={(detailQuery.error as Error | undefined)?.message || 'Unknown message detail error.'}
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
                  { label: 'Message ID', value: detailQuery.data.id },
                  { label: 'Sender', value: detailQuery.data.fromUserId },
                  { label: 'Receiver', value: detailQuery.data.toUserId || '-' },
                  { label: 'Group', value: detailQuery.data.groupId || '-' },
                  { label: 'Type', value: <StatusBadge value={detailQuery.data.type} /> },
                  { label: 'Status', value: <StatusBadge value={detailQuery.data.status} /> },
                  { label: 'Created', value: formatDateTime(detailQuery.data.createdAt) },
                  { label: 'Recalled At', value: formatDateTime(detailQuery.data.recalledAt) },
                ]}
              />

              <InsetCard tone="muted">
                <p className="text-sm font-semibold text-admin">Payload</p>
                <CodeBlock className="mt-3 max-h-80">
                  {JSON.stringify(detailQuery.data.content, null, 2)}
                </CodeBlock>
              </InsetCard>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!window.confirm(`Recall message ${selectedMessageId}?`)) {
                      return;
                    }
                    void recallMutation.mutateAsync();
                  }}
                  disabled={recallMutation.isPending}
                >
                  {recallMutation.isPending ? 'Recalling...' : 'Recall Message'}
                </button>
                <button
                  className="btn btn-critical"
                  onClick={() => {
                    if (!window.confirm(`Delete message ${selectedMessageId}?`)) {
                      return;
                    }
                    void deleteMutation.mutateAsync();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Message'}
                </button>
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

export default MessageListPage;
