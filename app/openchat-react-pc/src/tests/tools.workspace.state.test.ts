import { beforeEach, describe, expect, it } from "vitest";
import { ToolsService } from "../../packages/sdkwork-openchat-pc-tools/src/services/ToolsService";

describe("tools workspace state", () => {
  beforeEach(() => {
    ToolsService.resetWorkspaceState();
  });

  it("toggles favorite tools", () => {
    const toolId = `tools-favorite-${Date.now()}`;

    const enabled = ToolsService.toggleFavoriteTool(toolId);
    expect(enabled).toBe(true);
    expect(ToolsService.isToolFavorite(toolId)).toBe(true);

    const disabled = ToolsService.toggleFavoriteTool(toolId);
    expect(disabled).toBe(false);
    expect(ToolsService.isToolFavorite(toolId)).toBe(false);
  });

  it("keeps recent opened tool order", () => {
    const first = `tools-recent-a-${Date.now()}`;
    const second = `tools-recent-b-${Date.now()}`;

    ToolsService.markToolOpened(first);
    const order = ToolsService.markToolOpened(second);
    const reordered = ToolsService.markToolOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
