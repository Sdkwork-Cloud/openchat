import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
import {
  EmptyState,
  ErrorState,
  InfoGrid,
  InlineNotice,
  InsetCard,
  PageHeader,
  SelectableCard,
  SkeletonBlock,
  StatusBadge,
  SurfaceCard,
  formatDateTime,
  formatJson,
} from '@openchat/opencat-admin-ui';

const emptyChannelDraft = {
  id: '',
  provider: 'volcengine',
  appId: '',
  appKey: '',
  appSecret: '',
  region: '',
  endpoint: '',
  isActive: true,
  extraConfig: '{}',
};

export function RtcPage() {
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('new');
  const [draft, setDraft] = useState(emptyChannelDraft);
  const [feedback, setFeedback] = useState<string | null>(null);

  const channelsQuery = useQuery({
    queryKey: ['admin', 'rtc', 'channels'],
    queryFn: () => adminApi.listRtcChannels(),
  });

  const statsQuery = useQuery({
    queryKey: ['admin', 'rtc', 'stats'],
    queryFn: () => adminApi.getRtcProviderStats({ windowMinutes: 60 }),
  });

  const capabilitiesQuery = useQuery({
    queryKey: ['admin', 'rtc', 'capabilities'],
    queryFn: () => adminApi.getRtcProviderCapabilities(),
  });

  const healthQuery = useQuery({
    queryKey: ['admin', 'rtc', 'health'],
    queryFn: () => adminApi.getRtcProviderHealth({ windowMinutes: 60 }),
  });

  useEffect(() => {
    if (!channelsQuery.data) {
      return;
    }

    if (selectedChannelId === 'new') {
      setDraft(emptyChannelDraft);
      return;
    }

    const selected = channelsQuery.data.find((item) => item.id === selectedChannelId);
    if (!selected) {
      setSelectedChannelId('new');
      setDraft(emptyChannelDraft);
      return;
    }

    setDraft({
      id: selected.id,
      provider: selected.provider,
      appId: selected.appId,
      appKey: selected.appKey,
      appSecret: selected.appSecret,
      region: selected.region || '',
      endpoint: selected.endpoint || '',
      isActive: selected.isActive,
      extraConfig: JSON.stringify(selected.extraConfig || {}, null, 2),
    });
  }, [channelsQuery.data, selectedChannelId]);

  async function refreshRtc() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'rtc'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'summary'] }),
    ]);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        provider: draft.provider,
        appId: draft.appId,
        appKey: draft.appKey,
        appSecret: draft.appSecret,
        region: draft.region || undefined,
        endpoint: draft.endpoint || undefined,
        isActive: draft.isActive,
        extraConfig: draft.extraConfig.trim() ? JSON.parse(draft.extraConfig) : {},
      };

      if (selectedChannelId === 'new') {
        return adminApi.createRtcChannel(payload);
      }

      return adminApi.updateRtcChannel(selectedChannelId, payload);
    },
    onSuccess: async () => {
      setFeedback(selectedChannelId === 'new' ? 'RTC channel created.' : 'RTC channel updated.');
      await refreshRtc();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteRtcChannel(selectedChannelId),
    onSuccess: async () => {
      setFeedback('RTC channel deleted.');
      setSelectedChannelId('new');
      await refreshRtc();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (channelsQuery.isLoading || statsQuery.isLoading || capabilitiesQuery.isLoading || healthQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Realtime Infrastructure"
          title="RTC"
          description="Channel credentials, health posture and provider operation telemetry."
        />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  if (channelsQuery.error || statsQuery.error || capabilitiesQuery.error || healthQuery.error) {
    return (
      <ErrorState
        title="Failed to load RTC operations."
        description={
          (channelsQuery.error as Error | undefined)?.message
          || (statsQuery.error as Error | undefined)?.message
          || (capabilitiesQuery.error as Error | undefined)?.message
          || (healthQuery.error as Error | undefined)?.message
          || 'Unknown RTC error.'
        }
        retry={() => {
          void channelsQuery.refetch();
          void statsQuery.refetch();
          void capabilitiesQuery.refetch();
          void healthQuery.refetch();
        }}
      />
    );
  }

  const channels = channelsQuery.data || [];
  const capabilities = capabilitiesQuery.data;
  const health = healthQuery.data;
  const stats = statsQuery.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Realtime Infrastructure"
        title="RTC"
        description="Manage cloud channel credentials, inspect provider health routing and watch control-plane failure modes."
      />

      {feedback ? (
        <InlineNotice>
          {feedback}
        </InlineNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard
          title={`RTC Channels / ${channels.length}`}
          subtitle="Each provider keeps one active credential envelope."
          actions={
            <button className="btn btn-secondary" onClick={() => setSelectedChannelId('new')}>
              New Channel
            </button>
          }
        >
          {channels.length === 0 ? (
            <EmptyState
              title="No RTC channels configured."
              description="Create the first provider credential set to activate RTC routing."
            />
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <SelectableCard
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  active={channel.id === selectedChannelId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-admin">{channel.provider}</p>
                    <div className="flex gap-2">
                      <StatusBadge value={channel.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>App ID: {channel.appId}</span>
                    <span>Region: {channel.region || '-'}</span>
                    <span>Updated: {formatDateTime(channel.updatedAt)}</span>
                  </div>
                </SelectableCard>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title={selectedChannelId === 'new' ? 'Create Channel' : 'Edit Channel'}
          subtitle="Secrets stay masked after persistence. Editing requires resubmitting the desired credential set."
        >
          <div className="grid gap-4">
            <label className="field-label">
              Provider
              <select
                className="field-select"
                value={draft.provider}
                onChange={(event) => setDraft((current) => ({ ...current, provider: event.target.value }))}
              >
                {['volcengine', 'tencent', 'alibaba', 'livekit'].map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              App ID
              <input
                className="field-input"
                value={draft.appId}
                onChange={(event) => setDraft((current) => ({ ...current, appId: event.target.value }))}
              />
            </label>
            <label className="field-label">
              App Key
              <input
                className="field-input"
                value={draft.appKey}
                onChange={(event) => setDraft((current) => ({ ...current, appKey: event.target.value }))}
              />
            </label>
            <label className="field-label">
              App Secret
              <input
                className="field-input"
                value={draft.appSecret}
                onChange={(event) => setDraft((current) => ({ ...current, appSecret: event.target.value }))}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                Region
                <input
                  className="field-input"
                  value={draft.region}
                  onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
                />
              </label>
              <label className="field-label">
                Endpoint
                <input
                  className="field-input"
                  value={draft.endpoint}
                  onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))}
                />
              </label>
            </div>
            <label className="field-label">
              Extra Config JSON
              <textarea
                className="field-textarea"
                rows={7}
                value={draft.extraConfig}
                onChange={(event) => setDraft((current) => ({ ...current, extraConfig: event.target.value }))}
              />
            </label>
            <label className="field-label">
              Active
              <select
                className="field-select"
                value={draft.isActive ? 'true' : 'false'}
                onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === 'true' }))}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                onClick={() => void saveMutation.mutateAsync()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : selectedChannelId === 'new' ? 'Create Channel' : 'Save Channel'}
              </button>
              {selectedChannelId !== 'new' ? (
                <button
                  className="btn btn-critical"
                  onClick={() => {
                    if (!window.confirm(`Delete RTC channel ${selectedChannelId}?`)) {
                      return;
                    }
                    void deleteMutation.mutateAsync();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Channel'}
                </button>
              ) : null}
            </div>
          </div>
        </SurfaceCard>
      </div>

      {capabilities ? (
        <SurfaceCard
          title="Provider Capabilities"
          subtitle={`Default provider ${capabilities.defaultProvider} / recommended primary ${capabilities.recommendedPrimary || 'n/a'}`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {capabilities.providers.map((provider) => (
              <InsetCard key={provider.provider}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-admin">{provider.provider}</p>
                  <StatusBadge value={provider.configured ? 'configured' : 'not configured'} />
                </div>
                <div className="mt-3 space-y-2 text-sm text-admin-soft">
                  <p>Channel: {provider.channelId || '-'}</p>
                  <p>Recording: {provider.supportsRecording ? 'enabled' : 'not supported'}</p>
                  <p>Delegate: {provider.supportsControlPlaneDelegate ? 'supported' : 'not supported'}</p>
                  <p>Token Modes: {provider.tokenStrategies.join(', ')}</p>
                </div>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      {health ? (
        <SurfaceCard
          title="Provider Health Report"
          subtitle={`Generated ${formatDateTime(health.generatedAt)} / recommended primary ${health.recommendedPrimary || 'n/a'}`}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {health.providers.map((provider) => (
              <InsetCard key={provider.provider}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-admin">{provider.provider}</p>
                  <StatusBadge value={provider.status} />
                </div>
                <InfoGrid
                  items={[
                    { label: 'Failure Rate', value: `${Math.round(provider.failureRate * 100)}%` },
                    { label: 'Avg Latency', value: `${Math.round(provider.avgDurationMs)} ms` },
                    { label: 'Retries', value: provider.controlPlaneRetries },
                    { label: 'Fallback', value: provider.healthReasons.join(', ') || '-' },
                  ]}
                />
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard title="Provider Operation Stats" subtitle="Aggregated stats for createRoom, generateToken and validateToken.">
        {stats.length === 0 ? (
          <EmptyState
            title="No RTC provider stats recorded."
            description="Execute RTC operations and return here to inspect provider behavior."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.map((item) => (
              <InsetCard key={`${item.provider}-${item.operation}`}>
                <p className="font-medium text-admin">
                  {item.provider} / {item.operation}
                </p>
                <div className="mt-3 space-y-2 text-sm text-admin-soft">
                  <p>Total: {item.total}</p>
                  <p>Success: {item.success}</p>
                  <p>Failure: {item.failure}</p>
                  <p>Retryable Failure: {item.retryableFailure}</p>
                  <p>Avg Duration: {Math.round(item.avgDurationMs)} ms</p>
                  <p>Last Status: {item.lastStatus}</p>
                  <p>Top Errors: {formatJson(item.topErrors)}</p>
                </div>
              </InsetCard>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

export default RtcPage;
