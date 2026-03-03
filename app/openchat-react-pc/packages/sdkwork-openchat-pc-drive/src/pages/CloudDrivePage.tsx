import { useEffect, useMemo, useState } from "react";
import { FileResultService, FileService } from "../services";
import type { BreadcrumbItem, FileNode, FileType, StorageStats } from "../types";
import {
  buildDriveWorkspaceLibrary,
  buildDriveWorkspaceSummary,
  filterDriveWorkspaceFiles,
} from "./drive.workspace.model";

function inferFileType(fileName: string): FileType {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(lower)) return "image";
  if (/\.(mp4|mov|avi|mkv)$/.test(lower)) return "video";
  if (/\.(mp3|wav|aac|flac)$/.test(lower)) return "audio";
  if (/\.(doc|docx|txt|md)$/.test(lower)) return "doc";
  if (/\.(pdf)$/.test(lower)) return "pdf";
  if (/\.(xls|xlsx|csv)$/.test(lower)) return "xls";
  if (/\.(ppt|pptx)$/.test(lower)) return "ppt";
  if (/\.(zip|rar|7z)$/.test(lower)) return "zip";
  if (/\.(ts|tsx|js|jsx|java|go|py|rs)$/.test(lower)) return "code";
  return "unknown";
}

const typeOptions: Array<{ value: "all" | FileType; label: string }> = [
  { value: "all", label: "All" },
  { value: "folder", label: "Folder" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "doc", label: "Doc" },
  { value: "pdf", label: "PDF" },
  { value: "code", label: "Code" },
  { value: "unknown", label: "Unknown" },
];

const sortOptions: Array<{ value: "updated" | "size"; label: string }> = [
  { value: "updated", label: "Recently Updated" },
  { value: "size", label: "Largest Size" },
];

export function CloudDrivePage() {
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | FileType>("all");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [sortBy, setSortBy] = useState<"updated" | "size">("updated");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const [favoriteFileIds, setFavoriteFileIds] = useState<string[]>(() => FileService.getFavoriteFileIds());
  const [recentFileIds, setRecentFileIds] = useState<string[]>(() => FileService.getRecentFileIds());

  const loadData = async (parentId: string | null) => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [filesRes, statsRes, crumbs] = await Promise.all([
        FileResultService.getFilesByParent(parentId, {
          type: typeFilter === "all" ? undefined : typeFilter,
          search: keyword.trim() || undefined,
          isStarred: onlyStarred ? true : undefined,
        }),
        FileResultService.getStorageStats(),
        FileResultService.getBreadcrumbs(parentId),
      ]);

      setFiles(filesRes.data || []);
      setStorageStats(statsRes.data || null);
      setBreadcrumbs(crumbs.data || []);
      setSelectedIds([]);

      if (!filesRes.success || !statsRes.success) {
        setErrorText(filesRes.message || statsRes.message || "Some drive data could not be loaded.");
      }
    } catch (error) {
      setFiles([]);
      setStorageStats(null);
      setBreadcrumbs([]);
      setErrorText(error instanceof Error ? error.message : "Failed to load cloud drive.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(currentParentId);
  }, [currentParentId, keyword, typeFilter, onlyStarred]);

  const usedPercent = useMemo(() => {
    if (!storageStats || storageStats.total <= 0) {
      return 0;
    }
    return Math.round((storageStats.used / storageStats.total) * 100);
  }, [storageStats]);

  const workspaceFiles = useMemo(
    () =>
      filterDriveWorkspaceFiles(files, {
        keyword,
        type: typeFilter,
        starredOnly: onlyStarred,
        sortBy,
      }),
    [files, keyword, onlyStarred, sortBy, typeFilter],
  );

  const workspaceSummary = useMemo(() => buildDriveWorkspaceSummary(workspaceFiles), [workspaceFiles]);

  const workspaceLibrary = useMemo(
    () =>
      buildDriveWorkspaceLibrary(files, {
        favoriteFileIds,
        recentFileIds,
      }),
    [favoriteFileIds, files, recentFileIds],
  );

  const favoriteSet = useMemo(() => new Set(favoriteFileIds), [favoriteFileIds]);

  const handleOpenFile = (node: FileNode) => {
    setRecentFileIds(FileService.markFileOpened(node.id));
    if (node.type === "folder") {
      setCurrentParentId(node.id);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = window.prompt("Folder name", "New Folder");
    if (!folderName?.trim()) {
      return;
    }

    try {
      const result = await FileResultService.createFolder(currentParentId, folderName.trim());
      if (!result.success) {
        setStatusText(result.message || "Failed to create folder.");
        return;
      }

      setStatusText("Folder created.");
      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to create folder.");
    }
  };

  const handleUploadMockFile = async () => {
    const defaultName = `demo_${Date.now()}.txt`;
    const fileName = window.prompt("File name", defaultName);
    if (!fileName?.trim()) {
      return;
    }

    try {
      const type = inferFileType(fileName.trim());
      const result = await FileResultService.uploadFile(currentParentId, {
        name: fileName.trim(),
        size: 1024 + Math.floor(Math.random() * 500_000),
        type,
      });
      if (!result.success) {
        setStatusText(result.message || "Failed to upload file.");
        return;
      }

      setStatusText("File uploaded.");
      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to upload file.");
    }
  };

  const handleToggleFavorite = (id: string) => {
    FileService.toggleFavoriteFile(id);
    setFavoriteFileIds(FileService.getFavoriteFileIds());
  };

  const handleToggleStar = async (id: string) => {
    try {
      const result = await FileResultService.toggleStar(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to update favorite state.");
        return;
      }

      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to update favorite state.");
    }
  };

  const handleRename = async (file: FileNode) => {
    const nextName = window.prompt("Rename file", file.name);
    if (!nextName?.trim() || nextName.trim() === file.name) {
      return;
    }

    try {
      const result = await FileResultService.renameFile(file.id, nextName.trim());
      if (!result.success) {
        setStatusText(result.message || "Failed to rename file.");
        return;
      }

      setStatusText("File renamed.");
      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to rename file.");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setStatusText("Please select at least one item.");
      return;
    }

    try {
      const result = await FileResultService.deleteFiles(selectedIds);
      if (!result.success) {
        setStatusText(result.message || "Failed to delete selected files.");
        return;
      }

      setStatusText("Selected files deleted.");
      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to delete selected files.");
    }
  };

  const handleMoveSelectedToRoot = async () => {
    if (selectedIds.length === 0) {
      setStatusText("Please select at least one item.");
      return;
    }

    try {
      const result = await FileResultService.moveFiles(selectedIds, null);
      if (!result.success) {
        setStatusText(result.message || "Failed to move selected files.");
        return;
      }

      setStatusText("Selected files moved to root.");
      await loadData(currentParentId);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to move selected files.");
    }
  };

  const breadcrumbPath = [{ id: null, name: "Root" }, ...breadcrumbs];

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Cloud Drive</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage folders, files, and storage usage from your workspace.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Current Entries</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Folders</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.folders}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Files</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.files}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Starred in View</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.starred}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Storage</p>
            <p className="text-xs text-text-secondary">
              {storageStats
                ? `${FileService.formatBytes(storageStats.used)} / ${FileService.formatBytes(storageStats.total)}`
                : "-"}
            </p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-bg-tertiary">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_160px_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search files and folders"
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | FileType)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "updated" | "size")}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setOnlyStarred((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 text-xs ${
              onlyStarred
                ? "border-primary bg-primary text-white"
                : "border-border bg-bg-tertiary text-text-secondary"
            }`}
          >
            Starred only
          </button>
          <button
            onClick={() => void handleCreateFolder()}
            className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary"
          >
            New Folder
          </button>
          <button
            onClick={() => void handleUploadMockFile()}
            className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary"
          >
            Upload Demo
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {breadcrumbPath.map((item) => (
            <button
              key={item.id || "root"}
              onClick={() => setCurrentParentId(item.id)}
              className={`rounded-md px-2 py-1 ${
                item.id === currentParentId ? "bg-primary text-white" : "bg-bg-tertiary"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Favorites</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.favorites.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.favorites.slice(0, 3).map((item) => (
                <button
                  key={`favorite-${item.id}`}
                  onClick={() => handleOpenFile(item)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.name}
                </button>
              ))}
              {workspaceLibrary.favorites.length === 0 ? (
                <p className="text-[11px] text-text-muted">No favorites yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Recent Opened</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.recent.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.recent.slice(0, 3).map((item) => (
                <button
                  key={`recent-${item.id}`}
                  onClick={() => handleOpenFile(item)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.name}
                </button>
              ))}
              {workspaceLibrary.recent.length === 0 ? (
                <p className="text-[11px] text-text-muted">No recent history.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Largest Files</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.largest.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.largest.slice(0, 3).map((item) => (
                <button
                  key={`largest-${item.id}`}
                  onClick={() => handleOpenFile(item)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.name} ({FileService.formatBytes(item.size || 0)})
                </button>
              ))}
              {workspaceLibrary.largest.length === 0 ? (
                <p className="text-[11px] text-text-muted">No files in this view.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleDeleteSelected()}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary"
          >
            Delete Selected
          </button>
          <button
            onClick={() => void handleMoveSelectedToRoot()}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary"
          >
            Move to Root
          </button>
        </div>

        {statusText && <p className="mt-3 text-xs text-text-secondary">{statusText}</p>}
        {errorText && (
          <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              Loading drive files...
            </div>
          ) : workspaceFiles.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              No files found in this folder.
            </div>
          ) : (
            <div className="space-y-3">
              {workspaceFiles.map((file) => {
                const icon = FileService.getFileIcon(file.type);

                return (
                  <article key={file.id} className="rounded-xl border border-border bg-bg-secondary p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(file.id)}
                        onChange={(event) => {
                          setSelectedIds((prev) => {
                            if (event.target.checked) {
                              return [...prev, file.id];
                            }
                            return prev.filter((id) => id !== file.id);
                          });
                        }}
                        className="h-4 w-4 accent-primary"
                      />

                      <button
                        onClick={() => handleOpenFile(file)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className="rounded px-2 py-1 text-[11px] font-semibold"
                          style={{ color: icon.color, background: icon.bg }}
                        >
                          {icon.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-text-primary">{file.name}</p>
                            {favoriteSet.has(file.id) ? (
                              <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                Fav
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-text-muted">
                            {file.type} | {file.size ? FileService.formatBytes(file.size) : "-"}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleToggleFavorite(file.id)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          favoriteSet.has(file.id)
                            ? "border-warning/40 bg-warning/20 text-warning"
                            : "border-border bg-bg-tertiary text-text-secondary"
                        }`}
                      >
                        {favoriteSet.has(file.id) ? "Favorited" : "Favorite"}
                      </button>

                      <button
                        onClick={() => void handleToggleStar(file.id)}
                        className={`rounded-md px-2 py-1 text-xs ${
                          file.isStarred
                            ? "bg-warning/20 text-warning"
                            : "bg-bg-tertiary text-text-secondary"
                        }`}
                      >
                        {file.isStarred ? "Starred" : "Star"}
                      </button>

                      <button
                        onClick={() => void handleRename(file)}
                        className="rounded-md border border-border bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
                      >
                        Rename
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CloudDrivePage;
