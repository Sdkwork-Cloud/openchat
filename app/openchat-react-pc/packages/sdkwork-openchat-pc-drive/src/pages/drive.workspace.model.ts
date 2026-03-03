import type { FileNode, FileType } from "../types";

export type DriveWorkspaceSort = "updated" | "size";

export interface DriveWorkspaceSummary {
  total: number;
  folders: number;
  files: number;
  starred: number;
  bytes: number;
}

export interface DriveWorkspaceLibrary {
  favorites: FileNode[];
  recent: FileNode[];
  largest: FileNode[];
}

export interface DriveWorkspaceFilterInput {
  keyword?: string;
  type?: "all" | FileType;
  starredOnly?: boolean;
  sortBy?: DriveWorkspaceSort;
}

interface BuildDriveWorkspaceLibraryInput {
  favoriteFileIds: string[];
  recentFileIds: string[];
  maxLargestCount?: number;
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    result.push(id);
  });

  return result;
}

export function buildDriveWorkspaceSummary(files: FileNode[]): DriveWorkspaceSummary {
  return files.reduce<DriveWorkspaceSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.type === "folder") {
        summary.folders += 1;
      } else {
        summary.files += 1;
      }
      if (item.isStarred) {
        summary.starred += 1;
      }
      summary.bytes += item.size || 0;
      return summary;
    },
    {
      total: 0,
      folders: 0,
      files: 0,
      starred: 0,
      bytes: 0,
    },
  );
}

export function filterDriveWorkspaceFiles(
  files: FileNode[],
  input: DriveWorkspaceFilterInput,
): FileNode[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const type = input.type || "all";
  const starredOnly = Boolean(input.starredOnly);
  const sortBy = input.sortBy || "updated";

  let list = [...files];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.name} ${item.type}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (type !== "all") {
    list = list.filter((item) => item.type === type);
  }

  if (starredOnly) {
    list = list.filter((item) => Boolean(item.isStarred));
  }

  list.sort((left, right) => {
    if (left.type === "folder" && right.type !== "folder") {
      return -1;
    }
    if (left.type !== "folder" && right.type === "folder") {
      return 1;
    }

    if (sortBy === "size") {
      return (right.size || 0) - (left.size || 0);
    }
    return (right.updateTime || 0) - (left.updateTime || 0);
  });

  return list;
}

export function buildDriveWorkspaceLibrary(
  files: FileNode[],
  input: BuildDriveWorkspaceLibraryInput,
): DriveWorkspaceLibrary {
  const map = new Map(files.map((item) => [item.id, item]));
  const maxLargestCount = input.maxLargestCount ?? 6;

  const favorites = uniqueIds(input.favoriteFileIds)
    .map((fileId) => map.get(fileId))
    .filter((item): item is FileNode => Boolean(item));

  const recent = uniqueIds(input.recentFileIds)
    .map((fileId) => map.get(fileId))
    .filter((item): item is FileNode => Boolean(item));

  const largest = [...files]
    .filter((item) => item.type !== "folder")
    .sort((left, right) => (right.size || 0) - (left.size || 0))
    .slice(0, maxLargestCount);

  return {
    favorites,
    recent,
    largest,
  };
}
