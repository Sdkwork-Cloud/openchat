import { beforeEach, describe, expect, it } from "vitest";
import { DiscoverService } from "../../packages/sdkwork-openchat-pc-discover/src/services/DiscoverService";

describe("discover workspace state", () => {
  beforeEach(() => {
    DiscoverService.resetWorkspaceState();
  });

  it("toggles favorite items", () => {
    const targetId = `discover-fav-${Date.now()}`;

    const enabled = DiscoverService.toggleFavoriteItem(targetId);
    expect(enabled).toBe(true);
    expect(DiscoverService.isItemFavorite(targetId)).toBe(true);

    const disabled = DiscoverService.toggleFavoriteItem(targetId);
    expect(disabled).toBe(false);
    expect(DiscoverService.isItemFavorite(targetId)).toBe(false);
  });

  it("keeps recent opened order", () => {
    const first = `discover-open-a-${Date.now()}`;
    const second = `discover-open-b-${Date.now()}`;

    DiscoverService.markItemOpened(first);
    const order = DiscoverService.markItemOpened(second);
    const reordered = DiscoverService.markItemOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
