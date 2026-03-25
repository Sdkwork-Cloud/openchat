import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@openchat/opencat-admin-core';
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

const emptyCreateDeviceForm = {
  deviceId: '',
  type: 'xiaozhi',
  name: '',
  description: '',
  ipAddress: '',
  macAddress: '',
  userId: '',
  metadata: '{\n  "location": "ops-lab"\n}',
};

export function DeviceListPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const [commandAction, setCommandAction] = useState('ping');
  const [commandParams, setCommandParams] = useState('{\n  "reason": "ops-check"\n}');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateDeviceForm);

  const listQuery = useQuery({
    queryKey: ['admin', 'devices', keyword, status, type, userId, page, limit],
    queryFn: () =>
      adminApi.listDevices({
        keyword: keyword || undefined,
        status: status || undefined,
        type: type || undefined,
        userId: userId || undefined,
        page,
        limit,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'devices', 'detail', selectedDeviceId],
    queryFn: () => adminApi.getDeviceDetail(selectedDeviceId!),
    enabled: !!selectedDeviceId && !isCreatingDevice,
  });

  useEffect(() => {
    const items = listQuery.data?.items || [];
    if (items.length === 0) {
      setSelectedDeviceId(null);
      return;
    }

    if (isCreatingDevice) {
      return;
    }

    if (!selectedDeviceId || !items.some((item) => item.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(items[0].deviceId);
    }
  }, [isCreatingDevice, listQuery.data?.items, selectedDeviceId]);

  useEffect(() => {
    if (detailQuery.data?.device.status) {
      setDeviceStatus(detailQuery.data.device.status);
    }
  }, [detailQuery.data?.device.status]);

  async function refreshDevices() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'overview'] }),
    ]);
  }

  const statusMutation = useMutation({
    mutationFn: () => adminApi.updateDeviceStatus(selectedDeviceId!, deviceStatus),
    onSuccess: async () => {
      setFeedback('Device status updated.');
      await refreshDevices();
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const createDeviceMutation = useMutation({
    mutationFn: () => {
      let metadata: Record<string, unknown> | undefined;

      if (createForm.metadata.trim()) {
        metadata = JSON.parse(createForm.metadata) as Record<string, unknown>;
      }

      return adminApi.createDevice({
        deviceId: createForm.deviceId.trim(),
        type: createForm.type as 'xiaozhi' | 'other',
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        ipAddress: createForm.ipAddress.trim() || undefined,
        macAddress: createForm.macAddress.trim() || undefined,
        userId: createForm.userId.trim() || undefined,
        metadata,
      });
    },
    onSuccess: async (device) => {
      setFeedback(`Device ${device.deviceId} registered.`);
      setIsCreatingDevice(false);
      setSelectedDeviceId(device.deviceId);
      setCreateForm(emptyCreateDeviceForm);
      await refreshDevices();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const controlMutation = useMutation({
    mutationFn: () => {
      let params: Record<string, unknown> | undefined;

      if (commandParams.trim()) {
        params = JSON.parse(commandParams) as Record<string, unknown>;
      }

      return adminApi.controlDevice(selectedDeviceId!, {
        action: commandAction,
        params,
      });
    },
    onSuccess: async () => {
      setFeedback('Device control command dispatched.');
      await detailQuery.refetch();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteDevice(selectedDeviceId!),
    onSuccess: async () => {
      setFeedback('Device deleted.');
      setSelectedDeviceId(null);
      await refreshDevices();
    },
    onError: (error) => setFeedback((error as Error).message),
  });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="IoT Operations"
          title="Devices"
          description="Fleet inventory, status override and command execution."
        />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  if (listQuery.error || !listQuery.data) {
    return (
      <ErrorState
        title="Failed to load device operations."
        description={(listQuery.error as Error | undefined)?.message || 'Unknown device list error.'}
        retry={() => void listQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IoT Operations"
        title="Devices"
        description="Operate device fleet status, inspect payload history and send direct control commands from the admin plane."
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
              placeholder="device id / name"
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
              placeholder="online / offline"
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
              placeholder="xiaozhi / other"
            />
          </label>
          <label className="field-label">
            Owner ID
            <input
              className="field-input"
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                setPage(1);
              }}
              placeholder="user id"
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
          title={`Fleet Inventory / ${listQuery.data.total}`}
          subtitle="Select a device to inspect metadata and recent device-messages."
          actions={(
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsCreatingDevice(true);
                setSelectedDeviceId(null);
                setCreateForm(emptyCreateDeviceForm);
                setFeedback(null);
              }}
            >
              Register Device
            </button>
          )}
        >
          {listQuery.data.items.length === 0 ? (
            <EmptyState
              title="No devices matched the current filters."
              description="Adjust keyword, type or owner filters and query again."
            />
          ) : (
            <div className="space-y-3">
              {listQuery.data.items.map((device) => (
                <SelectableCard
                  key={device.id}
                  onClick={() => {
                    setIsCreatingDevice(false);
                    setSelectedDeviceId(device.deviceId);
                    setFeedback(null);
                  }}
                  active={device.deviceId === selectedDeviceId}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-admin">{device.name}</p>
                      <p className="mt-1 text-sm text-admin-soft">{device.deviceId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={device.type} />
                      <StatusBadge value={device.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-admin-soft">
                    <span>Owner: {device.userId || 'unassigned'}</span>
                    <span>IP: {device.ipAddress || '-'}</span>
                    <span>Updated: {formatDateTime(device.updatedAt)}</span>
                  </div>
                </SelectableCard>
              ))}

              <PaginationControls
                page={page}
                limit={limit}
                total={listQuery.data.total}
                noun="devices"
                onPageChange={setPage}
              />
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title={isCreatingDevice ? 'Register Device' : 'Device Detail'}
          subtitle={isCreatingDevice ? 'Create or upsert a device inventory record.' : selectedDeviceId ? `Operating ${selectedDeviceId}` : 'Select a device.'}
        >
          {isCreatingDevice ? (
            <div className="space-y-5">
              {feedback ? (
                <InlineNotice>
                  {feedback}
                </InlineNotice>
              ) : null}

              <div className="grid gap-4">
                <label className="field-label">
                  Device ID
                  <input
                    className="field-input"
                    value={createForm.deviceId}
                    onChange={(event) => setCreateForm((current) => ({ ...current, deviceId: event.target.value }))}
                    placeholder="device-001"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field-label">
                    Type
                    <select
                      className="field-select"
                      value={createForm.type}
                      onChange={(event) => setCreateForm((current) => ({ ...current, type: event.target.value }))}
                    >
                      <option value="xiaozhi">xiaozhi</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Owner ID
                    <input
                      className="field-input"
                      value={createForm.userId}
                      onChange={(event) => setCreateForm((current) => ({ ...current, userId: event.target.value }))}
                      placeholder="optional user id"
                    />
                  </label>
                </div>
                <label className="field-label">
                  Name
                  <input
                    className="field-input"
                    value={createForm.name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="warehouse gateway"
                  />
                </label>
                <label className="field-label">
                  Description
                  <textarea
                    className="field-textarea"
                    rows={4}
                    value={createForm.description}
                    onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field-label">
                    IP Address
                    <input
                      className="field-input"
                      value={createForm.ipAddress}
                      onChange={(event) => setCreateForm((current) => ({ ...current, ipAddress: event.target.value }))}
                      placeholder="optional"
                    />
                  </label>
                  <label className="field-label">
                    MAC Address
                    <input
                      className="field-input"
                      value={createForm.macAddress}
                      onChange={(event) => setCreateForm((current) => ({ ...current, macAddress: event.target.value }))}
                      placeholder="optional"
                    />
                  </label>
                </div>
                <label className="field-label">
                  Metadata JSON
                  <textarea
                    className="field-textarea"
                    rows={8}
                    value={createForm.metadata}
                    onChange={(event) => setCreateForm((current) => ({ ...current, metadata: event.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => void createDeviceMutation.mutateAsync()}
                  disabled={createDeviceMutation.isPending || !createForm.deviceId.trim() || !createForm.name.trim()}
                >
                  {createDeviceMutation.isPending ? 'Registering...' : 'Register Device'}
                </button>
                <button
                  className="btn btn-muted"
                  onClick={() => {
                    setIsCreatingDevice(false);
                    setCreateForm(emptyCreateDeviceForm);
                  }}
                  disabled={createDeviceMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !selectedDeviceId ? (
            <EmptyState
              title="No device selected."
              description="Choose a device from the fleet list or register a new one."
            />
          ) : detailQuery.isLoading ? (
            <SkeletonBlock className="h-80" />
          ) : detailQuery.error || !detailQuery.data ? (
            <ErrorState
              title="Failed to load the selected device."
              description={(detailQuery.error as Error | undefined)?.message || 'Unknown device detail error.'}
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
                  { label: 'Device ID', value: detailQuery.data.device.deviceId },
                  { label: 'Type', value: <StatusBadge value={detailQuery.data.device.type} /> },
                  { label: 'Status', value: <StatusBadge value={detailQuery.data.device.status} /> },
                  { label: 'Owner', value: detailQuery.data.device.userId || '-' },
                  { label: 'IP Address', value: detailQuery.data.device.ipAddress || '-' },
                  { label: 'MAC Address', value: detailQuery.data.device.macAddress || '-' },
                  { label: 'Created', value: formatDateTime(detailQuery.data.device.createdAt) },
                  { label: 'Updated', value: formatDateTime(detailQuery.data.device.updatedAt) },
                ]}
              />

              <InsetCard tone="muted">
                <p className="text-sm font-semibold text-admin">Status Override</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <select
                    className="field-select min-w-[180px]"
                    value={deviceStatus}
                    onChange={(event) => setDeviceStatus(event.target.value)}
                  >
                    <option value="online">online</option>
                    <option value="offline">offline</option>
                    <option value="unknown">unknown</option>
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => void statusMutation.mutateAsync()}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </InsetCard>

              <InsetCard tone="muted">
                <p className="text-sm font-semibold text-admin">Control Command</p>
                <div className="mt-3 space-y-3">
                  <input
                    className="field-input"
                    value={commandAction}
                    onChange={(event) => setCommandAction(event.target.value)}
                    placeholder="action"
                  />
                  <textarea
                    className="field-textarea"
                    value={commandParams}
                    onChange={(event) => setCommandParams(event.target.value)}
                    rows={7}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!window.confirm(`Dispatch command ${commandAction} to ${selectedDeviceId}?`)) {
                        return;
                      }
                      void controlMutation.mutateAsync();
                    }}
                    disabled={controlMutation.isPending}
                  >
                    {controlMutation.isPending ? 'Dispatching...' : 'Send Command'}
                  </button>
                </div>
              </InsetCard>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-admin">Recent Device Messages</p>
                {detailQuery.data.recentMessages.length === 0 ? (
                  <EmptyState
                    title="No recent device messages."
                    description="The sampled message window for this device is empty."
                  />
                ) : (
                  detailQuery.data.recentMessages.slice(0, 8).map((message) => (
                    <InsetCard
                      key={message.id}
                      className=""
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-2">
                          <StatusBadge value={message.type} />
                          <StatusBadge value={message.direction} />
                        </div>
                        <p className="text-xs text-admin-soft">{formatDateTime(message.createdAt)}</p>
                      </div>
                      <CodeBlock className="mt-3">
                        {JSON.stringify(message.payload, null, 2)}
                      </CodeBlock>
                    </InsetCard>
                  ))
                )}
              </div>

              <InsetCard tone="danger">
                <p className="text-sm font-semibold text-admin-danger">Danger Zone</p>
                <p className="mt-2 text-sm text-admin-danger">
                  Delete the device registration when a node is decommissioned or should be purged from fleet operations.
                </p>
                <button
                  className="btn btn-critical mt-4"
                  onClick={() => {
                    if (!window.confirm(`Delete device ${selectedDeviceId} from fleet inventory?`)) {
                      return;
                    }
                    void deleteMutation.mutateAsync();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Device'}
                </button>
              </InsetCard>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

export default DeviceListPage;
