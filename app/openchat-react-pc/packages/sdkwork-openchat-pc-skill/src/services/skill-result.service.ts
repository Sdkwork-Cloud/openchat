import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import SkillService from "./skill.service";

export const SkillResultService = createServiceResultProxy(SkillService, {
  source: "http-or-mock",
  fallbackMessage: "Skill service request failed.",
});
