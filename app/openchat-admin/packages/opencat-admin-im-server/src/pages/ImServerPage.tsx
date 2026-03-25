import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
import {
  CodeBlock,
  ErrorState,
  InsetCard,
  PageHeader,
  StatusBadge,
  SurfaceCard,
  formatDateTime,
  formatJson,
} from '@openchat/opencat-admin-ui';

export function ImServerPage() {
  const [messageForm, setMessageForm] = useState({
    channelId: '',
    channelType: 2,
    payload: '{"type":"TEXT","content":"ops test"}',
    clientMsgNo: '',
  });
  const [syncForm, setSyncForm] = useState({
    channelId: '',
    channelType: 2,
    lastMessageSeq: '',
    limit: 20,
  });
  const [channelForm, setChannelForm] = useState({
    channelId: '',
    channelType: 2,
    name: '',
    avatar: '',
  });
  const [subscriberForm, setSubscriberForm] = useState({
    channelId: '',
    channelType: 2,
    subscribers: 'user-1,user-2',
  });
  const [result, setResult] = useState<string>('No control-plane action executed yet.');

  const healthQuery = useQuery({
    queryKey: ['admin', 'wukongim', 'health'],
    queryFn: () => adminApi.getWukongimHealth(),
  });

  const systemInfoQuery = useQuery({
    queryKey: ['admin', 'wukongim', 'system-info'],
    queryFn: () => adminApi.getWukongimSystemInfo(),
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      adminApi.sendWukongimMessage({
        channelId: messageForm.channelId,
        channelType: Number(messageForm.channelType),
        payload: messageForm.payload,
        clientMsgNo: messageForm.clientMsgNo || undefined,
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const syncMutation = useMutation({
    mutationFn: async () =>
      adminApi.syncWukongimMessages({
        channelId: syncForm.channelId,
        channelType: Number(syncForm.channelType),
        lastMessageSeq: syncForm.lastMessageSeq ? Number(syncForm.lastMessageSeq) : undefined,
        limit: Number(syncForm.limit),
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const createChannelMutation = useMutation({
    mutationFn: async () =>
      adminApi.createWukongimChannel({
        channelId: channelForm.channelId,
        channelType: Number(channelForm.channelType),
        name: channelForm.name || undefined,
        avatar: channelForm.avatar || undefined,
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async () =>
      adminApi.deleteWukongimChannel({
        channelId: channelForm.channelId,
        channelType: Number(channelForm.channelType),
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const addSubscribersMutation = useMutation({
    mutationFn: async () =>
      adminApi.addWukongimSubscribers({
        channelId: subscriberForm.channelId,
        channelType: Number(subscriberForm.channelType),
        subscribers: subscriberForm.subscribers.split(',').map((item) => item.trim()).filter(Boolean),
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const removeSubscribersMutation = useMutation({
    mutationFn: async () =>
      adminApi.removeWukongimSubscribers({
        channelId: subscriberForm.channelId,
        channelType: Number(subscriberForm.channelType),
        subscribers: subscriberForm.subscribers.split(',').map((item) => item.trim()).filter(Boolean),
      }),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const inspectChannelMutation = useMutation({
    mutationFn: async () =>
      adminApi.getWukongimChannelInfo(
        channelForm.channelId,
        Number(channelForm.channelType),
      ),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  const inspectSubscribersMutation = useMutation({
    mutationFn: async () =>
      adminApi.getWukongimSubscribers(
        subscriberForm.channelId,
        Number(subscriberForm.channelType),
      ),
    onSuccess: (value) => setResult(JSON.stringify(value, null, 2)),
    onError: (error) => setResult((error as Error).message),
  });

  if (healthQuery.error || systemInfoQuery.error) {
    return (
      <ErrorState
        title="Failed to load IM server operations."
        description={
          (healthQuery.error as Error | undefined)?.message
          || (systemInfoQuery.error as Error | undefined)?.message
          || 'Unknown IM server error.'
        }
        retry={() => {
          void healthQuery.refetch();
          void systemInfoQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IM Control Plane"
        title="IM Server"
        description="Operate WuKongIM health, control-plane messaging, channel lifecycle and subscriber management."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard title="Cluster Health" subtitle="Current WuKongIM health and runtime identity.">
          <div className="space-y-4">
            <InsetCard>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-admin">Health Status</p>
                {healthQuery.data ? <StatusBadge value={healthQuery.data.status} /> : null}
              </div>
              <p className="mt-3 text-sm text-admin-soft">
                Last sampled: {formatDateTime(healthQuery.data?.timestamp)}
              </p>
            </InsetCard>

            <CodeBlock>{systemInfoQuery.data ? formatJson(systemInfoQuery.data) : 'Loading...'}</CodeBlock>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Action Result" subtitle="Latest control-plane response payload.">
          <CodeBlock className="min-h-[380px]">
            {result}
          </CodeBlock>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard title="Send Control Message" subtitle="Dispatch a control-plane message to a channel.">
          <div className="grid gap-3">
            <input
              className="field-input"
              value={messageForm.channelId}
              onChange={(event) => setMessageForm((current) => ({ ...current, channelId: event.target.value }))}
              placeholder="channel id"
            />
            <select
              className="field-select"
              value={messageForm.channelType}
              onChange={(event) => setMessageForm((current) => ({ ...current, channelType: Number(event.target.value) }))}
            >
              <option value={1}>PERSON</option>
              <option value={2}>GROUP</option>
            </select>
            <textarea
              className="field-textarea"
              rows={6}
              value={messageForm.payload}
              onChange={(event) => setMessageForm((current) => ({ ...current, payload: event.target.value }))}
            />
            <input
              className="field-input"
              value={messageForm.clientMsgNo}
              onChange={(event) => setMessageForm((current) => ({ ...current, clientMsgNo: event.target.value }))}
              placeholder="optional client message no"
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!window.confirm(`Send control-plane message to ${messageForm.channelId || '(empty channel)'}?`)) {
                  return;
                }
                void sendMutation.mutateAsync();
              }}
            >
              {sendMutation.isPending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Sync Messages" subtitle="Pull history from the control plane for one channel.">
          <div className="grid gap-3">
            <input
              className="field-input"
              value={syncForm.channelId}
              onChange={(event) => setSyncForm((current) => ({ ...current, channelId: event.target.value }))}
              placeholder="channel id"
            />
            <select
              className="field-select"
              value={syncForm.channelType}
              onChange={(event) => setSyncForm((current) => ({ ...current, channelType: Number(event.target.value) }))}
            >
              <option value={1}>PERSON</option>
              <option value={2}>GROUP</option>
            </select>
            <input
              className="field-input"
              value={syncForm.lastMessageSeq}
              onChange={(event) => setSyncForm((current) => ({ ...current, lastMessageSeq: event.target.value }))}
              placeholder="optional last message seq"
            />
            <input
              className="field-input"
              type="number"
              value={syncForm.limit}
              onChange={(event) => setSyncForm((current) => ({ ...current, limit: Number(event.target.value) }))}
            />
            <button className="btn btn-secondary" onClick={() => void syncMutation.mutateAsync()}>
              {syncMutation.isPending ? 'Syncing...' : 'Sync Channel Messages'}
            </button>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard title="Channel Lifecycle" subtitle="Create or delete a WuKongIM channel.">
          <div className="grid gap-3">
            <input
              className="field-input"
              value={channelForm.channelId}
              onChange={(event) => setChannelForm((current) => ({ ...current, channelId: event.target.value }))}
              placeholder="channel id"
            />
            <select
              className="field-select"
              value={channelForm.channelType}
              onChange={(event) => setChannelForm((current) => ({ ...current, channelType: Number(event.target.value) }))}
            >
              <option value={1}>PERSON</option>
              <option value={2}>GROUP</option>
            </select>
            <input
              className="field-input"
              value={channelForm.name}
              onChange={(event) => setChannelForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="channel name"
            />
            <input
              className="field-input"
              value={channelForm.avatar}
              onChange={(event) => setChannelForm((current) => ({ ...current, avatar: event.target.value }))}
              placeholder="optional avatar url"
            />
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!window.confirm(`Create channel ${channelForm.channelId || '(empty)'}?`)) {
                    return;
                  }
                  void createChannelMutation.mutateAsync();
                }}
              >
                {createChannelMutation.isPending ? 'Creating...' : 'Create Channel'}
              </button>
              <button className="btn btn-secondary" onClick={() => void inspectChannelMutation.mutateAsync()}>
                {inspectChannelMutation.isPending ? 'Inspecting...' : 'Inspect Channel'}
              </button>
              <button
                className="btn btn-critical"
                onClick={() => {
                  if (!window.confirm(`Delete channel ${channelForm.channelId || '(empty)'}?`)) {
                    return;
                  }
                  void deleteChannelMutation.mutateAsync();
                }}
              >
                {deleteChannelMutation.isPending ? 'Deleting...' : 'Delete Channel'}
              </button>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Subscribers" subtitle="Add or remove one or more subscriber UIDs.">
          <div className="grid gap-3">
            <input
              className="field-input"
              value={subscriberForm.channelId}
              onChange={(event) => setSubscriberForm((current) => ({ ...current, channelId: event.target.value }))}
              placeholder="channel id"
            />
            <select
              className="field-select"
              value={subscriberForm.channelType}
              onChange={(event) => setSubscriberForm((current) => ({ ...current, channelType: Number(event.target.value) }))}
            >
              <option value={1}>PERSON</option>
              <option value={2}>GROUP</option>
            </select>
            <textarea
              className="field-textarea"
              rows={5}
              value={subscriberForm.subscribers}
              onChange={(event) => setSubscriberForm((current) => ({ ...current, subscribers: event.target.value }))}
              placeholder="comma separated user ids"
            />
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (!window.confirm(`Add subscribers to channel ${subscriberForm.channelId || '(empty)'}?`)) {
                    return;
                  }
                  void addSubscribersMutation.mutateAsync();
                }}
              >
                {addSubscribersMutation.isPending ? 'Adding...' : 'Add Subscribers'}
              </button>
              <button className="btn btn-primary" onClick={() => void inspectSubscribersMutation.mutateAsync()}>
                {inspectSubscribersMutation.isPending ? 'Inspecting...' : 'Inspect Subscribers'}
              </button>
              <button
                className="btn btn-muted"
                onClick={() => {
                  if (!window.confirm(`Remove subscribers from channel ${subscriberForm.channelId || '(empty)'}?`)) {
                    return;
                  }
                  void removeSubscribersMutation.mutateAsync();
                }}
              >
                {removeSubscribersMutation.isPending ? 'Removing...' : 'Remove Subscribers'}
              </button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

export default ImServerPage;
