import { useQuery } from '@tanstack/react-query';
import { adminApi, normalizeMessageContent } from '@openchat/opencat-admin-core';
import {
  ErrorState,
  InsetCard,
  MetricCard,
  PageHeader,
  SkeletonBlock,
  SurfaceCard,
  StatusBadge,
  formatDateTime,
  formatNumber,
} from '@openchat/opencat-admin-ui';

export function DashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'overview'],
    queryFn: () => adminApi.getDashboardOverview(),
  });

  const systemQuery = useQuery({
    queryKey: ['admin', 'system', 'summary'],
    queryFn: () => adminApi.getSystemSummary(),
  });

  if (overviewQuery.isLoading || systemQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operations Control"
          title="Overview"
          description="Live command posture for users, groups, messages, IoT devices and control-plane services."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="metric-card animate-pulse">
              <SkeletonBlock className="h-3 w-24 rounded-xl" />
              <SkeletonBlock className="mt-3 h-8 w-20 rounded-2xl" />
              <SkeletonBlock className="mt-3 h-3 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (overviewQuery.error || systemQuery.error || !overviewQuery.data || !systemQuery.data) {
    return (
      <ErrorState
        title="Failed to load the super-admin overview."
        description={
          (overviewQuery.error as Error | undefined)?.message
          || (systemQuery.error as Error | undefined)?.message
          || 'Unknown dashboard error.'
        }
        retry={() => {
          void overviewQuery.refetch();
          void systemQuery.refetch();
        }}
      />
    );
  }

  const overview = overviewQuery.data;
  const summary = systemQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations Control"
        title="Overview"
        description="Live command posture for users, groups, messages, IoT devices and control-plane services."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Registered Users"
          value={formatNumber(overview.totals.users)}
          hint={`${formatNumber(overview.totals.onlineUsers)} currently online`}
        />
        <MetricCard
          label="Active Groups"
          value={formatNumber(overview.totals.groups)}
          hint={`${formatNumber(overview.totals.pendingFriendRequests)} pending friend requests`}
        />
        <MetricCard
          label="Messages Retained"
          value={formatNumber(overview.totals.messages)}
          hint="Moderation queue backed by live history"
        />
        <MetricCard
          label="Connected Devices"
          value={formatNumber(overview.totals.devices)}
          hint={`${formatNumber(summary.auditLogCount)} audit records in system ledger`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SurfaceCard
          title="Cloud Service Posture"
          subtitle="Runtime configuration footprints detected from the current config center."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {summary.cloudServices.map((service) => (
              <InsetCard
                key={service.id}
                tone="muted"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-admin">{service.label}</p>
                  <StatusBadge value={service.configured ? 'configured' : 'not configured'} />
                </div>
                <p className="mt-3 text-3xl font-semibold text-admin">
                  {formatNumber(service.configuredKeys)}
                </p>
                <p className="mt-2 text-sm text-admin-soft">
                  {service.sampleKeys.length > 0
                    ? service.sampleKeys.join(', ')
                    : 'No matching keys detected in config-center.'}
                </p>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Runtime Snapshot"
          subtitle="The current process state of this OpenChat deployment."
        >
          <div className="grid gap-3">
            <InsetCard>
              <p className="text-admin-caption">Node Runtime</p>
              <p className="mt-2 text-xl font-semibold text-admin">{summary.runtime.nodeVersion}</p>
            </InsetCard>
            <InsetCard>
              <p className="text-admin-caption">Process Uptime</p>
              <p className="mt-2 text-xl font-semibold text-admin">
                {formatNumber(summary.runtime.uptimeSeconds)}s
              </p>
            </InsetCard>
            <InsetCard>
              <p className="text-admin-caption">Last Sample</p>
              <p className="mt-2 text-xl font-semibold text-admin">
                {formatDateTime(summary.runtime.timestamp)}
              </p>
            </InsetCard>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard title="Recent Users" subtitle="Fresh account activity entering the system.">
          <div className="space-y-3">
            {overview.recentUsers.map((user) => (
              <InsetCard
                key={user.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-admin">{user.displayName}</p>
                  <p className="text-sm text-admin-soft">
                    {user.username}
                    {user.email ? ` / ${user.email}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.roles.map((role) => (
                      <StatusBadge key={role} value={role} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-admin-soft">{formatDateTime(user.createdAt)}</p>
                </div>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Recent Device Updates" subtitle="IoT fleet heartbeat and latest modifications.">
          <div className="space-y-3">
            {overview.recentDevices.map((device) => (
              <InsetCard
                key={device.id}
                className=""
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-admin">{device.name}</p>
                    <p className="text-sm text-admin-soft">{device.deviceId}</p>
                  </div>
                  <StatusBadge value={device.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-admin-soft">
                  <span>Type: {device.type}</span>
                  <span>Owner: {device.userId || 'unassigned'}</span>
                  <span>Updated: {formatDateTime(device.updatedAt)}</span>
                </div>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard title="Message Stream Pulse" subtitle="Latest retained messages entering moderation scope.">
          <div className="space-y-3">
            {overview.recentMessages.slice(0, 8).map((message) => (
              <InsetCard
                key={message.id}
                className=""
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-admin">{message.fromUserId}</p>
                  <StatusBadge value={message.status} />
                </div>
                <p className="mt-2 text-sm text-admin-soft">{normalizeMessageContent(message.content)}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-admin-soft">
                  <span>Type: {message.type}</span>
                  <span>Peer: {message.toUserId || message.groupId || '-'}</span>
                  <span>Created: {formatDateTime(message.createdAt)}</span>
                </div>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Audit Ledger" subtitle="The most recent operator and system-level changes.">
          <div className="space-y-3">
            {summary.recentAudits.slice(0, 10).map((audit) => (
              <InsetCard
                key={audit.id}
                className=""
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-admin">{audit.action}</p>
                    {audit.result ? <StatusBadge value={audit.result} /> : null}
                  </div>
                  <p className="text-xs text-admin-soft">{formatDateTime(audit.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-admin-soft">
                  {audit.entityType || 'system'}
                  {audit.entityId ? ` / ${audit.entityId}` : ''}
                  {audit.userId ? ` / actor ${audit.userId}` : ''}
                </p>
                {audit.errorMessage ? (
                  <p className="mt-2 text-sm text-admin-danger">{audit.errorMessage}</p>
                ) : null}
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

export default DashboardPage;
