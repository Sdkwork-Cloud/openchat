import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DeviceStatus, DeviceType, type Device } from "../entities/device.entity";
import { DeviceResultService } from "../services";

function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case DeviceStatus.ONLINE:
      return "在线";
    case DeviceStatus.OFFLINE:
      return "离线";
    default:
      return "未知";
  }
}

function typeLabel(type: DeviceType): string {
  return type === DeviceType.XIAOZHI ? "小智设备" : "其他 IoT";
}

function statusClass(status: DeviceStatus): string {
  if (status === DeviceStatus.ONLINE) {
    return "bg-success/15 text-success";
  }
  if (status === DeviceStatus.OFFLINE) {
    return "bg-bg-tertiary text-text-secondary";
  }
  return "bg-warning/20 text-warning";
}

export function DeviceListPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DeviceType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DeviceStatus>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const result = await DeviceResultService.getDevices({
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
      });
      setDevices(result.data || []);
      if (!result.success) {
        setErrorText(result.error || result.message || "设备列表加载失败");
      }
    } catch (error) {
      setDevices([]);
      setErrorText(error instanceof Error ? error.message : "设备列表加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [keyword, statusFilter, typeFilter]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (devices.length === 0) {
      setSelectedDeviceId(null);
      return;
    }
    const exists = selectedDeviceId
      ? devices.some((item) => item.deviceId === selectedDeviceId)
      : false;
    if (!exists) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  }, [devices, selectedDeviceId]);

  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((item) => item.status === DeviceStatus.ONLINE).length;
    const offline = devices.filter((item) => item.status === DeviceStatus.OFFLINE).length;
    return { total, online, offline };
  }, [devices]);

  const selectedDevice = useMemo(
    () => devices.find((item) => item.deviceId === selectedDeviceId) || null,
    [devices, selectedDeviceId],
  );

  const handleStatusToggle = async (device: Device) => {
    const nextStatus =
      device.status === DeviceStatus.ONLINE ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE;
    setStatusText("");
    try {
      const result = await DeviceResultService.updateDeviceStatus(device.deviceId, nextStatus);
      if (!result.success) {
        setErrorText(result.error || result.message || "状态更新失败");
        return;
      }
      setStatusText(`设备状态已更新为 ${statusLabel(nextStatus)}。`);
      await loadDevices();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "状态更新失败");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">设备管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          以桌面端双栏结构统一管理设备，支持快速筛选、状态切换与详情联动。
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">设备总数</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">在线设备</p>
            <p className="mt-1 text-xl font-semibold text-success">{stats.online}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">离线设备</p>
            <p className="mt-1 text-xl font-semibold text-text-secondary">{stats.offline}</p>
          </article>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_170px_170px_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索设备名称或 Device ID"
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | DeviceType)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="all">全部类型</option>
            <option value={DeviceType.XIAOZHI}>小智设备</option>
            <option value={DeviceType.OTHER}>其他 IoT</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | DeviceStatus)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value={DeviceStatus.ONLINE}>在线</option>
            <option value={DeviceStatus.OFFLINE}>离线</option>
            <option value={DeviceStatus.UNKNOWN}>未知</option>
          </select>
          <button
            onClick={() => void loadDevices()}
            className="h-10 rounded-lg border border-border bg-bg-secondary px-4 text-sm text-text-secondary hover:bg-bg-hover"
          >
            刷新
          </button>
        </div>

        {statusText ? <p className="mb-2 text-sm text-text-secondary">{statusText}</p> : null}
        {errorText ? (
          <div className="mb-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        ) : null}

        <div className="flex h-[calc(100%-176px)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-bg-secondary">
          <aside className="w-[360px] border-r border-border bg-bg-secondary/90">
            <div className="h-full overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-text-secondary">设备加载中...</div>
              ) : devices.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">当前筛选下没有设备。</div>
              ) : (
                devices.map((device) => {
                  const selected = device.deviceId === selectedDeviceId;
                  return (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDeviceId(device.deviceId)}
                      className={`w-full border-b border-border px-4 py-3 text-left transition-colors ${
                        selected ? "bg-primary-soft/30" : "hover:bg-bg-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">{device.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass(device.status)}`}>
                          {statusLabel(device.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-text-muted">{device.deviceId}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                        {device.description || "暂无描述"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            {selectedDevice ? (
              <>
                <header className="border-b border-border px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary">
                        {selectedDevice.name}
                      </h2>
                      <p className="mt-1 text-xs text-text-muted">
                        {selectedDevice.deviceId} · {typeLabel(selectedDevice.type)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(selectedDevice.status)}`}>
                      {statusLabel(selectedDevice.status)}
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-auto px-5 py-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-bg-primary p-3">
                      <p className="text-xs text-text-muted">IP 地址</p>
                      <p className="mt-1 text-sm text-text-primary">{selectedDevice.ipAddress || "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-primary p-3">
                      <p className="text-xs text-text-muted">MAC 地址</p>
                      <p className="mt-1 text-sm text-text-primary">{selectedDevice.macAddress || "-"}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-primary p-3 md:col-span-2">
                      <p className="text-xs text-text-muted">设备描述</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {selectedDevice.description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                </div>

                <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
                  <button
                    onClick={() => void handleStatusToggle(selectedDevice)}
                    className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    {selectedDevice.status === DeviceStatus.ONLINE ? "置为离线" : "置为在线"}
                  </button>
                  <button
                    onClick={() => navigate(`/devices/${selectedDevice.deviceId}`)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:brightness-110"
                  >
                    打开设备工作台
                  </button>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                请选择左侧设备查看详情
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default DeviceListPage;
