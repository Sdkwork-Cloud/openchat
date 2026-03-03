import { beforeEach, describe, expect, it } from "vitest";
import { FileService } from "../../packages/sdkwork-openchat-pc-drive/src/services/FileService";

describe("drive workspace state", () => {
  beforeEach(() => {
    FileService.resetWorkspaceState();
  });

  it("toggles favorite files", () => {
    const fileId = `drive-favorite-${Date.now()}`;

    const enabled = FileService.toggleFavoriteFile(fileId);
    expect(enabled).toBe(true);
    expect(FileService.isFileFavorite(fileId)).toBe(true);

    const disabled = FileService.toggleFavoriteFile(fileId);
    expect(disabled).toBe(false);
    expect(FileService.isFileFavorite(fileId)).toBe(false);
  });

  it("keeps recent opened file order", () => {
    const first = `drive-recent-a-${Date.now()}`;
    const second = `drive-recent-b-${Date.now()}`;

    FileService.markFileOpened(first);
    const order = FileService.markFileOpened(second);
    const reordered = FileService.markFileOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
