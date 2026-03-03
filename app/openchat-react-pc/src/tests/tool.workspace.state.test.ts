import { beforeEach, describe, expect, it } from "vitest";
import { ToolService } from "../../packages/sdkwork-openchat-pc-tool/src/services/tool.service";

describe("tool workspace state", () => {
  beforeEach(() => {
    ToolService.resetWorkspaceState();
  });

  it("toggles favorite flag", () => {
    const toolId = `tool-fav-${Date.now()}`;

    const enabled = ToolService.toggleFavoriteTool(toolId);
    expect(enabled).toBe(true);
    expect(ToolService.isToolFavorite(toolId)).toBe(true);

    const disabled = ToolService.toggleFavoriteTool(toolId);
    expect(disabled).toBe(false);
    expect(ToolService.isToolFavorite(toolId)).toBe(false);
  });

  it("keeps recent opened order", () => {
    const first = `tool-open-a-${Date.now()}`;
    const second = `tool-open-b-${Date.now()}`;

    ToolService.markToolOpened(first);
    const order = ToolService.markToolOpened(second);
    const reordered = ToolService.markToolOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
