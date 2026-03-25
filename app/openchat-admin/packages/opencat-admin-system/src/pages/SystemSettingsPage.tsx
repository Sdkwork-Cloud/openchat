import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FilterBar,
  InlineNotice,
  InsetCard,
  PageHeader,
  SkeletonBlock,
  StatusBadge,
  SurfaceCard,
  formatDateTime,
  formatJson,
} from '@openchat/opencat-admin-ui';
import { OperatorWorkspacePreferences } from '../components/OperatorWorkspacePreferences';

export function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [pattern, setPattern] = useState('');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [auditUserId, setAuditUserId] = useState('');
  const [auditEntityType, setAuditEntityType] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    key: '',
    value: '{"enabled": true}',
    description: '',
  });

  const summaryQuery = useQuery({
    queryKey: ['admin', 'system', 'summary'],
    queryFn: () => adminApi.getSystemSummary(),
  });

  const configsQuery = useQuery({
    queryKey: ['admin', 'system', 'configs', pattern, includeSensitive],
    queryFn: () =>
      adminApi.listConfigs({
        pattern: pattern || undefined,
        includeSensitive,
      }),
  });

  const auditsQuery = useQuery({
    queryKey: ['admin', 'system', 'audits', auditUserId, auditEntityType, auditAction],
    queryFn: () =>
      adminApi.listAuditLogs({
        userId: auditUserId || undefined,
        entityType: auditEntityType || undefined,
        action: auditAction || undefined,
        limit: 50,
        offset: 0,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      let parsed: unknown = configForm.value;

      try {
        parsed = JSON.parse(configForm.value);
      } catch {
        parsed = configForm.value;
      }

      return adminApi.upsertConfig({
        key: configForm.key,
        value: parsed,
        description: configForm.description || undefined,
      });
    },
    onSuccess: async () => {
      setFeedback('Configuration updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'system'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (key: string) => adminApi.deleteConfig(key),
    onSuccess: async () => {
      setFeedback('Configuration deleted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'system'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (summaryQuery.isLoading || configsQuery.isLoading || auditsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Platform Core"
          title="System"
          description="Config-center, cloud service posture and audit ledger."
        />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  if (summaryQuery.error || configsQuery.error || auditsQuery.error || !summaryQuery.data || !configsQuery.data || !auditsQuery.data) {
    return (
      <ErrorState
        title="Failed to load system operations."
        description={
          (summaryQuery.error as Error | undefined)?.message
          || (configsQuery.error as Error | undefined)?.message
          || (auditsQuery.error as Error | undefined)?.message
          || 'Unknown system error.'
        }
        retry={() => {
          void summaryQuery.refetch();
          void configsQuery.refetch();
          void auditsQuery.refetch();
        }}
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Core"
        title="System"
        description="Runtime summary, config-center overrides, cloud service readiness and the authoritative audit trail."
      />

      {feedback ? (
        <InlineNotice>
          {feedback}
        </InlineNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard title="Operator Workspace" subtitle="Theme mode, palette and language preferences aligned with the shell runtime.">
          <OperatorWorkspacePreferences />
        </SurfaceCard>

        <SurfaceCard title="Runtime Summary" subtitle="Process health and configuration posture.">
          <div className="grid gap-4 md:grid-cols-2">
            <InsetCard>
              <p className="text-admin-caption">Node Runtime</p>
              <p className="mt-2 text-xl font-semibold text-admin">{summary.runtime.nodeVersion}</p>
            </InsetCard>
            <InsetCard>
              <p className="text-admin-caption">Uptime</p>
              <p className="mt-2 text-xl font-semibold text-admin">{summary.runtime.uptimeSeconds}s</p>
            </InsetCard>
            <InsetCard>
              <p className="text-admin-caption">Audit Ledger</p>
              <p className="mt-2 text-xl font-semibold text-admin">{summary.auditLogCount}</p>
            </InsetCard>
            <InsetCard>
              <p className="text-admin-caption">Sampled At</p>
              <p className="mt-2 text-xl font-semibold text-admin">{formatDateTime(summary.runtime.timestamp)}</p>
            </InsetCard>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Cloud Services" subtitle="Config center footprints by operational domain.">
          <div className="grid gap-4 md:grid-cols-2">
            {summary.cloudServices.map((service) => (
              <InsetCard key={service.id}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-admin">{service.label}</p>
                  <StatusBadge value={service.configured ? 'configured' : 'not configured'} />
                </div>
                <p className="mt-3 text-sm text-admin-soft">
                  Keys: {service.sampleKeys.length > 0 ? service.sampleKeys.join(', ') : 'none'}
                </p>
              </InsetCard>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard compact>
        <FilterBar>
          <label className="field-label">
            Config Pattern
            <input
              className="field-input"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="RTC | IOT | OPENAI"
            />
          </label>
          <label className="field-label">
            Sensitive Keys
            <select
              className="field-select"
              value={includeSensitive ? 'true' : 'false'}
              onChange={(event) => setIncludeSensitive(event.target.value === 'true')}
            >
              <option value="false">masked</option>
              <option value="true">reveal raw values</option>
            </select>
          </label>
          <label className="field-label">
            Audit User ID
            <input
              className="field-input"
              value={auditUserId}
              onChange={(event) => setAuditUserId(event.target.value)}
              placeholder="operator id"
            />
          </label>
          <label className="field-label">
            Audit Entity
            <input
              className="field-input"
              value={auditEntityType}
              onChange={(event) => setAuditEntityType(event.target.value)}
              placeholder="chat_users / system_config"
            />
          </label>
          <label className="field-label">
            Audit Action
            <input
              className="field-input"
              value={auditAction}
              onChange={(event) => setAuditAction(event.target.value)}
              placeholder="CREATE / UPDATE / DELETE"
            />
          </label>
        </FilterBar>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard title={`Config Center / ${configsQuery.data.total}`} subtitle="Live config keys for cloud integrations and runtime toggles.">
          {configsQuery.data.items.length === 0 ? (
            <EmptyState
              title="No config keys matched the current pattern."
              description="Clear the pattern filter to inspect the full config-center index."
            />
          ) : (
            <div className="space-y-3">
              {configsQuery.data.items.map((item) => (
                <InsetCard key={item.key}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-admin">{item.key}</p>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.source || 'runtime'} />
                      {item.masked ? <StatusBadge value="masked" /> : null}
                      {item.source === 'override' ? (
                        <button
                          className="btn btn-critical"
                          onClick={() => {
                            if (!window.confirm(`Delete override config ${item.key}?`)) {
                              return;
                            }
                            void deleteConfigMutation.mutateAsync(item.key);
                          }}
                          disabled={deleteConfigMutation.isPending}
                        >
                          {deleteConfigMutation.isPending ? 'Deleting...' : 'Delete Override'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-admin-soft">{item.description || 'No description'}</p>
                  <CodeBlock className="mt-3">
                    {formatJson(includeSensitive && item.rawValue !== undefined ? item.rawValue : item.value)}
                  </CodeBlock>
                </InsetCard>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard title="Upsert Config" subtitle="Write a new override or update an existing config entry.">
          <div className="grid gap-3">
            <input
              className="field-input"
              value={configForm.key}
              onChange={(event) => setConfigForm((current) => ({ ...current, key: event.target.value }))}
              placeholder="config key"
            />
            <textarea
              className="field-textarea"
              rows={8}
              value={configForm.value}
              onChange={(event) => setConfigForm((current) => ({ ...current, value: event.target.value }))}
            />
            <input
              className="field-input"
              value={configForm.description}
              onChange={(event) => setConfigForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="description"
            />
            <button className="btn btn-primary" onClick={() => void upsertMutation.mutateAsync()}>
              {upsertMutation.isPending ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard title={`Audit Logs / ${auditsQuery.data.total}`} subtitle="Latest system and operator changes.">
        {auditsQuery.data.items.length === 0 ? (
          <EmptyState
            title="No audit logs matched the current filter."
            description="Clear the audit filters to inspect the full event ledger."
          />
        ) : (
          <div className="space-y-3">
            {auditsQuery.data.items.map((audit) => (
              <InsetCard key={audit.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  <CodeBlock>
                    {formatJson(audit.oldValue)}
                  </CodeBlock>
                  <CodeBlock>
                    {formatJson(audit.newValue)}
                  </CodeBlock>
                </div>
                {audit.errorMessage ? (
                  <p className="mt-3 text-sm text-admin-danger">{audit.errorMessage}</p>
                ) : null}
              </InsetCard>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

export default SystemSettingsPage;
