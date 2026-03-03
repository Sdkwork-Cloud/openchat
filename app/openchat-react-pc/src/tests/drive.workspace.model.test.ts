import { describe, expect, it } from "vitest";
import type { FileNode } from "../../packages/sdkwork-openchat-pc-drive/src/types";
import {
  buildDriveWorkspaceLibrary,
  buildDriveWorkspaceSummary,
  filterDriveWorkspaceFiles,
} from "../../packages/sdkwork-openchat-pc-drive/src/pages/drive.workspace.model";

function createFile(partial: Partial<FileNode>): FileNode {
  return {
    id: partial.id || "file-default",
    parentId: partial.parentId === undefined ? null : partial.parentId,
    name: partial.name || "Untitled",
    type: partial.type || "unknown",
    size: partial.size,
    url: partial.url,
    thumbnail: partial.thumbnail,
    mimeType: partial.mimeType,
    isStarred: partial.isStarred,
    isShared: partial.isShared,
    createTime: partial.createTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
    updateTime: partial.updateTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
  };
}

const files: FileNode[] = [
  createFile({
    id: "dir-1",
    name: "Docs",
    type: "folder",
    createTime: Date.parse("2026-02-10T00:00:00.000Z"),
    updateTime: Date.parse("2026-02-10T00:00:00.000Z"),
  }),
  createFile({
    id: "file-1",
    parentId: "dir-1",
    name: "Roadmap.pdf",
    type: "pdf",
    size: 2_000_000,
    isStarred: true,
    createTime: Date.parse("2026-02-11T00:00:00.000Z"),
    updateTime: Date.parse("2026-02-11T00:00:00.000Z"),
  }),
  createFile({
    id: "file-2",
    parentId: "dir-1",
    name: "Logo.png",
    type: "image",
    size: 800_000,
    isStarred: false,
    createTime: Date.parse("2026-02-12T00:00:00.000Z"),
    updateTime: Date.parse("2026-02-12T00:00:00.000Z"),
  }),
];

describe("drive workspace model", () => {
  it("builds drive summary", () => {
    const summary = buildDriveWorkspaceSummary(files);

    expect(summary.total).toBe(3);
    expect(summary.folders).toBe(1);
    expect(summary.files).toBe(2);
    expect(summary.starred).toBe(1);
    expect(summary.bytes).toBe(2_800_000);
  });

  it("filters files by keyword/type/starred and sorts by size", () => {
    const filtered = filterDriveWorkspaceFiles(files, {
      keyword: "roadmap",
      type: "pdf",
      starredOnly: true,
      sortBy: "size",
    });

    expect(filtered.map((item) => item.id)).toEqual(["file-1"]);
  });

  it("builds favorites/recent/largest libraries", () => {
    const library = buildDriveWorkspaceLibrary(files, {
      favoriteFileIds: ["file-2", "file-1", "unknown"],
      recentFileIds: ["file-1", "dir-1", "missing"],
      maxLargestCount: 2,
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["file-2", "file-1"]);
    expect(library.recent.map((item) => item.id)).toEqual(["file-1", "dir-1"]);
    expect(library.largest.map((item) => item.id)).toEqual(["file-1", "file-2"]);
  });
});
