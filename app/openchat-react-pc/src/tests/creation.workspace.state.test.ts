import { beforeEach, describe, expect, it } from "vitest";
import { CreationService } from "../../packages/sdkwork-openchat-pc-creation/src/services/CreationService";

describe("creation workspace state", () => {
  beforeEach(() => {
    CreationService.resetWorkspaceState();
  });

  it("toggles favorite creations", () => {
    const creationId = `creation-favorite-${Date.now()}`;

    const enabled = CreationService.toggleFavoriteCreation(creationId);
    expect(enabled).toBe(true);
    expect(CreationService.isCreationFavorite(creationId)).toBe(true);

    const disabled = CreationService.toggleFavoriteCreation(creationId);
    expect(disabled).toBe(false);
    expect(CreationService.isCreationFavorite(creationId)).toBe(false);
  });

  it("keeps recent opened creation order", () => {
    const first = `creation-open-a-${Date.now()}`;
    const second = `creation-open-b-${Date.now()}`;

    CreationService.markCreationOpened(first);
    const order = CreationService.markCreationOpened(second);
    const reordered = CreationService.markCreationOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
