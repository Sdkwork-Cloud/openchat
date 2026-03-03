import { beforeEach, describe, expect, it } from "vitest";
import { SkillService } from "../../packages/sdkwork-openchat-pc-skill/src/services/skill.service";

describe("skill workspace state", () => {
  beforeEach(() => {
    SkillService.resetWorkspaceState();
  });

  it("toggles favorite flag for a skill id", () => {
    const skillId = `skill-fav-${Date.now()}`;

    const enabled = SkillService.toggleFavoriteSkill(skillId);
    expect(enabled).toBe(true);
    expect(SkillService.isSkillFavorite(skillId)).toBe(true);

    const disabled = SkillService.toggleFavoriteSkill(skillId);
    expect(disabled).toBe(false);
    expect(SkillService.isSkillFavorite(skillId)).toBe(false);
  });

  it("keeps recent opened order", () => {
    const first = `skill-open-a-${Date.now()}`;
    const second = `skill-open-b-${Date.now()}`;

    SkillService.markSkillOpened(first);
    const order = SkillService.markSkillOpened(second);
    const reordered = SkillService.markSkillOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
